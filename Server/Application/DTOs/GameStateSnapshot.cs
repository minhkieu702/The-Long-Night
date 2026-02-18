using System.Numerics;

namespace Application.DTOs;

/// <summary>
/// Lightweight snapshot sent to clients each tick.
/// </summary>
public class GameStateSnapshot
{
    public string RoomId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int CurrentWave { get; set; }

    public List<PlayerSnapshot> Players { get; set; } = new();
    public List<EnemySnapshot> Enemies { get; set; } = new();
    public List<BulletSnapshot> Bullets { get; set; } = new();
}

public class PlayerSnapshot
{
    public string ConnectionId { get; set; } = string.Empty;
    public float X { get; set; }
    public float Y { get; set; }
    public float HP { get; set; }
    public float MaxHp { get; set; }
    public int Level { get; set; }
    public int XP { get; set; }
    public int XpToNextLevel { get; set; }
    public bool LevelUpPending { get; set; }
    public List<string>? SkillChoices { get; set; }
}

public class EnemySnapshot
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public float X { get; set; }
    public float Y { get; set; }
    public float HP { get; set; }
    public float MaxHp { get; set; }
}

public class BulletSnapshot
{
    public int Id { get; set; }
    public float X { get; set; }
    public float Y { get; set; }
}
