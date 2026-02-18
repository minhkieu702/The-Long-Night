using System.Numerics;
using Domain.Enums;

namespace Domain.Entities;

public class EnemyEntity
{
    public int Id { get; set; }
    public EnemyType Type { get; set; } = EnemyType.Normal;
    public Vector2 Position { get; set; } = Vector2.Zero;
    public float HP { get; set; } = 30f;
    public float MaxHp { get; set; } = 30f;
    public float Speed { get; set; } = 80f;
    public float Damage { get; set; } = 10f;
    public float CollisionRadius { get; set; } = 16f;
    public string? TargetId { get; set; }
    public int XpReward { get; set; } = 10;
}
