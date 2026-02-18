using System.Collections.Concurrent;
using Domain.Enums;

namespace Domain.Entities;

public class Room
{
    public string RoomId { get; set; } = Guid.NewGuid().ToString("N")[..8];
    public ConcurrentDictionary<string, PlayerEntity> Players { get; set; } = new();
    public ConcurrentDictionary<int, EnemyEntity> Enemies { get; set; } = new();
    public ConcurrentDictionary<int, Bullet> Bullets { get; set; } = new();

    // Game state
    public GameStatus Status { get; set; } = GameStatus.WaitingForPlayers;
    public int CurrentWave { get; set; } = 0;
    public float WaveTimer { get; set; } = 0f;
    public float WaveInterval { get; set; } = 5f; // seconds between waves

    // Map bounds
    public float MapWidth { get; set; } = 2000f;
    public float MapHeight { get; set; } = 2000f;

    // ID generators (thread-safe via Interlocked)
    private int _nextEnemyId = 0;
    private int _nextBulletId = 0;

    public int GetNextEnemyId() => Interlocked.Increment(ref _nextEnemyId);
    public int GetNextBulletId() => Interlocked.Increment(ref _nextBulletId);

    // Max players per room
    public int MaxPlayers { get; set; } = 4;

    /// <summary>
    /// Check if any player in the room has a pending level-up choice.
    /// </summary>
    public bool AnyPlayerLevelingUp()
    {
        foreach (var kvp in Players)
        {
            if (kvp.Value.LevelUpPending)
                return true;
        }
        return false;
    }

    /// <summary>
    /// Reset the room for a new game — clears enemies, bullets, wave state,
    /// and resets all player entities to defaults.
    /// </summary>
    public void Reset()
    {
        Enemies.Clear();
        Bullets.Clear();
        CurrentWave = 0;
        WaveTimer = 0f;

        var random = new Random();
        foreach (var kvp in Players)
        {
            var player = kvp.Value;
            player.HP = 100f;
            player.XP = 0;
            player.XpToNextLevel = 100;
            player.Level = 1;
            player.Stats = new PlayerStats();
            player.IsInvulnerable = false;
            player.InvulnerabilityTimer = 0f;
            player.FireCooldown = 0f;
            player.LevelUpPending = false;
            player.SkillChoices.Clear();
            player.InputDirection = System.Numerics.Vector2.Zero;
            player.Position = new System.Numerics.Vector2(
                MapWidth / 2f + (float)(random.NextDouble() * 100 - 50),
                MapHeight / 2f + (float)(random.NextDouble() * 100 - 50)
            );
        }

        Status = GameStatus.Playing;
    }
}
