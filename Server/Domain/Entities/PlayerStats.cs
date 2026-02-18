namespace Domain.Entities;

public class PlayerStats
{
    public float Speed { get; set; } = 200f;
    public float FireRate { get; set; } = 1f;        // Shots per second
    public float Damage { get; set; } = 10f;
    public int ProjectileCount { get; set; } = 1;
    public float MaxHp { get; set; } = 100f;
    public float InvulnerabilityDuration { get; set; } = 0.5f; // Seconds of i-frames after taking damage

    public PlayerStats Clone()
    {
        return new PlayerStats
        {
            Speed = Speed,
            FireRate = FireRate,
            Damage = Damage,
            ProjectileCount = ProjectileCount,
            MaxHp = MaxHp,
            InvulnerabilityDuration = InvulnerabilityDuration
        };
    }
}
