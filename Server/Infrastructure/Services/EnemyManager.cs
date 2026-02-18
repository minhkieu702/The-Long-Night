using System.Numerics;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;

namespace Infrastructure.Services;

public class EnemyManager : IEnemyManager
{
    private static readonly Random _random = new();

    public void SpawnWave(Room room)
    {
        room.CurrentWave++;
        int enemyCount = GetEnemyCountForWave(room.CurrentWave);

        for (int i = 0; i < enemyCount; i++)
        {
            var type = GetEnemyTypeForWave(room.CurrentWave);
            var position = GetSpawnPosition(room.MapWidth, room.MapHeight);
            var enemy = CreateEnemy(type, position, room);

            room.Enemies.TryAdd(enemy.Id, enemy);
        }
    }

    public PlayerEntity? FindNearestTarget(EnemyEntity enemy, Room room)
    {
        PlayerEntity? nearest = null;
        float nearestDistSq = float.MaxValue;

        foreach (var kvp in room.Players)
        {
            var player = kvp.Value;
            if (player.HP <= 0f) continue;

            float distSq = Vector2.DistanceSquared(enemy.Position, player.Position);
            if (distSq < nearestDistSq)
            {
                nearestDistSq = distSq;
                nearest = player;
            }
        }

        return nearest;
    }

    public void UpdateTargets(Room room)
    {
        foreach (var kvp in room.Enemies)
        {
            var enemy = kvp.Value;
            var target = FindNearestTarget(enemy, room);
            enemy.TargetId = target?.ConnectionId;
        }
    }

    // ---------- Private helpers ----------

    private int GetEnemyCountForWave(int wave)
    {
        // Base 5 enemies, +3 per wave, capped at 50
        return Math.Min(5 + (wave - 1) * 3, 50);
    }

    private EnemyType GetEnemyTypeForWave(int wave)
    {
        // Boss every 5 waves
        if (wave % 5 == 0)
            return EnemyType.Boss;

        // Introduce tank at wave 3+, fast at wave 2+
        int roll = _random.Next(100);

        if (wave >= 3 && roll < 20)
            return EnemyType.Tank;
        if (wave >= 2 && roll < 40)
            return EnemyType.Fast;

        return EnemyType.Normal;
    }

    private Vector2 GetSpawnPosition(float mapWidth, float mapHeight)
    {
        // Spawn at random position on the edge of the map
        int edge = _random.Next(4); // 0=top, 1=right, 2=bottom, 3=left
        float margin = 20f;

        return edge switch
        {
            0 => new Vector2((float)(_random.NextDouble() * mapWidth), margin),                    // Top
            1 => new Vector2(mapWidth - margin, (float)(_random.NextDouble() * mapHeight)),        // Right
            2 => new Vector2((float)(_random.NextDouble() * mapWidth), mapHeight - margin),        // Bottom
            3 => new Vector2(margin, (float)(_random.NextDouble() * mapHeight)),                   // Left
            _ => new Vector2(mapWidth / 2f, margin)
        };
    }

    private EnemyEntity CreateEnemy(EnemyType type, Vector2 position, Room room)
    {
        var enemy = new EnemyEntity
        {
            Id = room.GetNextEnemyId(),
            Type = type,
            Position = position
        };

        switch (type)
        {
            case EnemyType.Normal:
                enemy.HP = 30f + room.CurrentWave * 5f;
                enemy.MaxHp = enemy.HP;
                enemy.Speed = 80f;
                enemy.Damage = 10f;
                enemy.CollisionRadius = 16f;
                enemy.XpReward = 10;
                break;

            case EnemyType.Fast:
                enemy.HP = 20f + room.CurrentWave * 3f;
                enemy.MaxHp = enemy.HP;
                enemy.Speed = 150f;
                enemy.Damage = 8f;
                enemy.CollisionRadius = 12f;
                enemy.XpReward = 15;
                break;

            case EnemyType.Tank:
                enemy.HP = 80f + room.CurrentWave * 10f;
                enemy.MaxHp = enemy.HP;
                enemy.Speed = 40f;
                enemy.Damage = 20f;
                enemy.CollisionRadius = 24f;
                enemy.XpReward = 25;
                break;

            case EnemyType.Boss:
                enemy.HP = 200f + room.CurrentWave * 20f;
                enemy.MaxHp = enemy.HP;
                enemy.Speed = 60f;
                enemy.Damage = 30f;
                enemy.CollisionRadius = 32f;
                enemy.XpReward = 100;
                break;
        }

        return enemy;
    }
}
