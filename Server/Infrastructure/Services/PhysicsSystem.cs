using System.Numerics;
using Application.Interfaces;
using Domain.Entities;

namespace Infrastructure.Services;

public class PhysicsSystem : IPhysicsSystem
{
    private const float PlayerCollisionRadius = 16f;

    public void MovePlayer(PlayerEntity player, float deltaTime)
    {
        if (player.InputDirection.LengthSquared() <= 0f)
            return;

        var velocity = player.InputDirection * player.Stats.Speed * deltaTime;
        player.Position += velocity;
    }

    /// <summary>
    /// Clamp player position within map bounds.
    /// </summary>
    public static void ClampToMap(PlayerEntity player, float mapWidth, float mapHeight)
    {
        var pos = player.Position;
        pos = new Vector2(
            Math.Clamp(pos.X, PlayerCollisionRadius, mapWidth - PlayerCollisionRadius),
            Math.Clamp(pos.Y, PlayerCollisionRadius, mapHeight - PlayerCollisionRadius)
        );
        player.Position = pos;
    }

    public void MoveEnemy(EnemyEntity enemy, PlayerEntity target, float deltaTime)
    {
        var direction = target.Position - enemy.Position;
        if (direction.LengthSquared() <= 0f)
            return;

        direction = Vector2.Normalize(direction);
        enemy.Position += direction * enemy.Speed * deltaTime;
    }

    public void UpdateProjectiles(Room room, float deltaTime)
    {
        var bulletsToRemove = new List<int>();

        foreach (var kvp in room.Bullets)
        {
            var bullet = kvp.Value;

            // Move bullet
            bullet.Position += bullet.Direction * bullet.Speed * deltaTime;

            // Decrease lifetime
            bullet.Lifetime -= deltaTime;

            // Remove if expired or out of bounds
            if (bullet.Lifetime <= 0f ||
                bullet.Position.X < 0 || bullet.Position.X > room.MapWidth ||
                bullet.Position.Y < 0 || bullet.Position.Y > room.MapHeight)
            {
                bulletsToRemove.Add(kvp.Key);
            }
        }

        foreach (var id in bulletsToRemove)
        {
            room.Bullets.TryRemove(id, out _);
        }
    }

    public void CheckCollisions(Room room)
    {
        CheckBulletVsEnemy(room);
        CheckEnemyVsPlayer(room);
    }

    private void CheckBulletVsEnemy(Room room)
    {
        var bulletsToRemove = new List<int>();

        foreach (var bulletKvp in room.Bullets)
        {
            var bullet = bulletKvp.Value;
            if (bulletsToRemove.Contains(bulletKvp.Key))
                continue;

            foreach (var enemyKvp in room.Enemies)
            {
                var enemy = enemyKvp.Value;

                // Circle-circle intersection
                float combinedRadius = bullet.CollisionRadius + enemy.CollisionRadius;
                float distSq = Vector2.DistanceSquared(bullet.Position, enemy.Position);

                if (distSq <= combinedRadius * combinedRadius)
                {
                    // Deal damage to enemy
                    enemy.HP -= bullet.Damage;

                    // Mark bullet for removal
                    bulletsToRemove.Add(bulletKvp.Key);

                    // Remove dead enemies
                    if (enemy.HP <= 0f)
                    {
                        room.Enemies.TryRemove(enemyKvp.Key, out _);

                        // Award XP to bullet owner (handled externally by game loop)
                        // Store kill info — we handle XP in the game loop
                    }

                    break; // Bullet hits one enemy only
                }
            }
        }

        foreach (var id in bulletsToRemove)
        {
            room.Bullets.TryRemove(id, out _);
        }
    }

    private void CheckEnemyVsPlayer(Room room)
    {
        foreach (var enemyKvp in room.Enemies)
        {
            var enemy = enemyKvp.Value;

            foreach (var playerKvp in room.Players)
            {
                var player = playerKvp.Value;

                if (player.IsInvulnerable || player.HP <= 0f)
                    continue;

                float combinedRadius = enemy.CollisionRadius + PlayerCollisionRadius;
                float distSq = Vector2.DistanceSquared(enemy.Position, player.Position);

                if (distSq <= combinedRadius * combinedRadius)
                {
                    // Deal damage to player
                    player.HP -= enemy.Damage;

                    // Trigger invulnerability frames
                    player.IsInvulnerable = true;
                    player.InvulnerabilityTimer = player.Stats.InvulnerabilityDuration;

                    if (player.HP <= 0f)
                    {
                        player.HP = 0f;
                        // Player death handled by game loop
                    }
                }
            }
        }
    }
}
