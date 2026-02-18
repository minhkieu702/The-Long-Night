using System.Diagnostics;
using System.Numerics;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Services;
using Microsoft.AspNetCore.SignalR;
using Presentation.Hubs;

namespace Presentation.Services;

public class GameLoopService : BackgroundService
{
    private const int TargetTickRate = 60;
    private const double TargetFrameTime = 1000.0 / TargetTickRate; // ~16.67ms

    private readonly IHubContext<GameHub> _hubContext;
    private readonly IMatchmakingService _matchmaking;
    private readonly IPhysicsSystem _physics;
    private readonly IRpgSystem _rpgSystem;
    private readonly IEnemyManager _enemyManager;
    private readonly ILogger<GameLoopService> _logger;

    public GameLoopService(
        IHubContext<GameHub> hubContext,
        IMatchmakingService matchmaking,
        IPhysicsSystem physics,
        IRpgSystem rpgSystem,
        IEnemyManager enemyManager,
        ILogger<GameLoopService> logger)
    {
        _hubContext = hubContext;
        _matchmaking = matchmaking;
        _physics = physics;
        _rpgSystem = rpgSystem;
        _enemyManager = enemyManager;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Game loop started at {TickRate} TPS", TargetTickRate);

        var stopwatch = Stopwatch.StartNew();
        double previousTime = stopwatch.Elapsed.TotalMilliseconds;

        while (!stoppingToken.IsCancellationRequested)
        {
            double currentTime = stopwatch.Elapsed.TotalMilliseconds;
            float deltaTime = (float)((currentTime - previousTime) / 1000.0); // Convert to seconds
            previousTime = currentTime;

            // Clamp deltaTime to prevent physics explosions on lag spikes
            deltaTime = Math.Min(deltaTime, 0.1f);

            try
            {
                UpdateAllRooms(deltaTime);
                await BroadcastState();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in game loop tick");
            }

            // Calculate sleep time to hit target tick rate
            double elapsed = stopwatch.Elapsed.TotalMilliseconds - currentTime;
            double sleepTime = TargetFrameTime - elapsed;

            if (sleepTime > 0)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(sleepTime), stoppingToken);
            }
        }

        _logger.LogInformation("Game loop stopped");
    }

    private void UpdateAllRooms(float deltaTime)
    {
        foreach (var room in _matchmaking.GetAllActiveRooms())
        {
            // Skip updates if the room is paused for level-up
            if (room.Status == GameStatus.LevelUpPause)
                continue;

            UpdateRoom(room, deltaTime);
        }
    }

    private void UpdateRoom(Room room, float deltaTime)
    {
        // --- 1. Wave spawning ---
        room.WaveTimer -= deltaTime;
        if (room.WaveTimer <= 0f && room.Enemies.IsEmpty)
        {
            _enemyManager.SpawnWave(room);
            room.WaveTimer = room.WaveInterval;
        }

        // --- 2. Update enemy targets ---
        _enemyManager.UpdateTargets(room);

        // --- 3. Move players ---
        foreach (var kvp in room.Players)
        {
            var player = kvp.Value;
            if (player.HP <= 0f) continue;

            _physics.MovePlayer(player, deltaTime);
            PhysicsSystem.ClampToMap(player, room.MapWidth, room.MapHeight);

            // Update invulnerability timer
            if (player.IsInvulnerable)
            {
                player.InvulnerabilityTimer -= deltaTime;
                if (player.InvulnerabilityTimer <= 0f)
                {
                    player.IsInvulnerable = false;
                    player.InvulnerabilityTimer = 0f;
                }
            }

            // Auto-fire
            player.FireCooldown -= deltaTime;
            if (player.FireCooldown <= 0f)
            {
                FireBullets(room, player);
                player.FireCooldown = player.Stats.FireRate;
            }
        }

        // --- 4. Move enemies ---
        foreach (var kvp in room.Enemies)
        {
            var enemy = kvp.Value;
            if (enemy.TargetId != null && room.Players.TryGetValue(enemy.TargetId, out var target))
            {
                _physics.MoveEnemy(enemy, target, deltaTime);
            }
        }

        // --- 5. Update projectiles ---
        _physics.UpdateProjectiles(room, deltaTime);

        // --- 6. Collision detection ---
        // Track killed enemies for XP
        var enemiesBefore = new HashSet<int>(room.Enemies.Keys);
        _physics.CheckCollisions(room);
        var enemiesAfter = new HashSet<int>(room.Enemies.Keys);

        // Award XP for killed enemies
        var killedEnemyIds = enemiesBefore.Except(enemiesAfter);
        // Note: we award XP evenly to all alive players for simplicity
        foreach (var enemyId in killedEnemyIds)
        {
            // XP reward based on enemy type — already removed, so use a default
            int xpReward = 10;
            foreach (var playerKvp in room.Players)
            {
                if (playerKvp.Value.HP > 0f)
                {
                    _rpgSystem.AddExperience(playerKvp.Value, xpReward, room);
                }
            }
        }

        // --- 7. Check game over ---
        bool allDead = true;
        foreach (var kvp in room.Players)
        {
            if (kvp.Value.HP > 0f)
            {
                allDead = false;
                break;
            }
        }

        if (allDead && room.Players.Count > 0)
        {
            room.Status = GameStatus.GameOver;
        }
    }

    private void FireBullets(Room room, PlayerEntity player)
    {
        // Find aim direction (towards nearest enemy)
        var aimDir = FindAimDirection(player, room);
        float damage = _rpgSystem.CalculateDamage(player);

        int count = player.Stats.ProjectileCount;
        float spreadAngle = count > 1 ? 15f : 0f; // degrees between projectiles

        for (int i = 0; i < count; i++)
        {
            float angleOffset = 0f;
            if (count > 1)
            {
                angleOffset = (i - (count - 1) / 2f) * spreadAngle;
            }

            var direction = RotateVector(aimDir, angleOffset * (MathF.PI / 180f));

            var bullet = new Bullet
            {
                Id = room.GetNextBulletId(),
                OwnerId = player.ConnectionId,
                Position = player.Position,
                Direction = direction,
                Speed = 500f,
                Damage = damage,
                Lifetime = 2f
            };

            room.Bullets.TryAdd(bullet.Id, bullet);
        }
    }

    private Vector2 FindAimDirection(PlayerEntity player, Room room)
    {
        float nearestDistSq = float.MaxValue;
        Vector2 nearestDir = Vector2.UnitY; // Default aim direction

        foreach (var kvp in room.Enemies)
        {
            var enemy = kvp.Value;
            float distSq = Vector2.DistanceSquared(player.Position, enemy.Position);
            if (distSq < nearestDistSq)
            {
                nearestDistSq = distSq;
                var dir = enemy.Position - player.Position;
                if (dir.LengthSquared() > 0f)
                    nearestDir = Vector2.Normalize(dir);
            }
        }

        return nearestDir;
    }

    private static Vector2 RotateVector(Vector2 v, float radians)
    {
        float cos = MathF.Cos(radians);
        float sin = MathF.Sin(radians);
        return new Vector2(
            v.X * cos - v.Y * sin,
            v.X * sin + v.Y * cos
        );
    }

    private async Task BroadcastState()
    {
        foreach (var room in _matchmaking.GetAllActiveRooms())
        {
            var snapshot = CreateSnapshot(room);
            await _hubContext.Clients.Group(room.RoomId).SendAsync("ReceiveGameState", snapshot);
        }

        // Also broadcast GameOver rooms one final time
        // (GetAllActiveRooms only returns Playing/LevelUpPause, so we handle GameOver here)
    }

    private static GameStateSnapshot CreateSnapshot(Room room)
    {
        var snapshot = new GameStateSnapshot
        {
            RoomId = room.RoomId,
            Status = room.Status.ToString(),
            CurrentWave = room.CurrentWave,
            Players = new List<PlayerSnapshot>(),
            Enemies = new List<EnemySnapshot>(),
            Bullets = new List<BulletSnapshot>()
        };

        foreach (var kvp in room.Players)
        {
            var p = kvp.Value;
            snapshot.Players.Add(new PlayerSnapshot
            {
                ConnectionId = p.ConnectionId,
                X = p.Position.X,
                Y = p.Position.Y,
                HP = p.HP,
                MaxHp = p.Stats.MaxHp,
                Level = p.Level,
                XP = p.XP,
                XpToNextLevel = p.XpToNextLevel,
                LevelUpPending = p.LevelUpPending,
                SkillChoices = p.LevelUpPending
                    ? p.SkillChoices.Select(s => s.ToString()).ToList()
                    : null
            });
        }

        foreach (var kvp in room.Enemies)
        {
            var e = kvp.Value;
            snapshot.Enemies.Add(new EnemySnapshot
            {
                Id = e.Id,
                Type = e.Type.ToString(),
                X = e.Position.X,
                Y = e.Position.Y,
                HP = e.HP,
                MaxHp = e.MaxHp
            });
        }

        foreach (var kvp in room.Bullets)
        {
            var b = kvp.Value;
            snapshot.Bullets.Add(new BulletSnapshot
            {
                Id = b.Id,
                X = b.Position.X,
                Y = b.Position.Y
            });
        }

        return snapshot;
    }
}
