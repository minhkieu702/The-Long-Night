using System.Numerics;

namespace Domain.Entities;

public class Bullet
{
    public int Id { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public Vector2 Position { get; set; } = Vector2.Zero;
    public Vector2 Direction { get; set; } = Vector2.Zero;
    public float Speed { get; set; } = 500f;
    public float Damage { get; set; } = 10f;
    public float Lifetime { get; set; } = 2f;          // Seconds remaining
    public float CollisionRadius { get; set; } = 4f;
}
