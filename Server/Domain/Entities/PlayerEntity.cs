using System.Numerics;
using Domain.Enums;

namespace Domain.Entities;

public class PlayerEntity
{
    public string ConnectionId { get; set; } = string.Empty;
    public Vector2 Position { get; set; } = Vector2.Zero;
    public float HP { get; set; } = 100f;
    public int XP { get; set; } = 0;
    public int XpToNextLevel { get; set; } = 100;
    public int Level { get; set; } = 1;
    public PlayerStats Stats { get; set; } = new();
    public Vector2 InputDirection { get; set; } = Vector2.Zero;

    // Combat state
    public bool IsInvulnerable { get; set; } = false;
    public float InvulnerabilityTimer { get; set; } = 0f;
    public float FireCooldown { get; set; } = 0f;

    // Level-up state
    public bool LevelUpPending { get; set; } = false;
    public List<SkillType> SkillChoices { get; set; } = new();

    // Auto-fire direction (towards nearest enemy)
    public Vector2 AimDirection { get; set; } = Vector2.UnitY;
}
