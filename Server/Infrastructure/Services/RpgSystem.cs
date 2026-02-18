using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;

namespace Infrastructure.Services;

public class RpgSystem : IRpgSystem
{
    private static readonly Random _random = new();

    public float CalculateDamage(PlayerEntity player)
    {
        return player.Stats.Damage;
    }

    public void AddExperience(PlayerEntity player, int amount, Room room)
    {
        if (player.LevelUpPending)
            return; // Don't accumulate XP while a choice is pending

        player.XP += amount;

        if (player.XP >= player.XpToNextLevel)
        {
            player.XP -= player.XpToNextLevel;
            player.Level++;
            player.XpToNextLevel = GetXpForLevel(player.Level);

            // Set up level-up state
            player.LevelUpPending = true;
            player.SkillChoices = GenerateSkillChoices(3);

            // Pause room for level-up choice
            room.Status = GameStatus.LevelUpPause;
        }
    }

    public void ApplySkillUpgrade(PlayerEntity player, SkillType skill)
    {
        switch (skill)
        {
            case SkillType.MaxHp:
                player.Stats.MaxHp += 20f;
                player.HP = Math.Min(player.HP + 20f, player.Stats.MaxHp); // Heal on upgrade
                break;

            case SkillType.Speed:
                player.Stats.Speed *= 1.1f;
                break;

            case SkillType.FireRate:
                player.Stats.FireRate *= 0.92f; // Lower = faster (cooldown-based)
                break;

            case SkillType.Damage:
                player.Stats.Damage += 5f;
                break;

            case SkillType.ProjectileCount:
                player.Stats.ProjectileCount += 1;
                break;
        }
    }

    public int GetXpForLevel(int level)
    {
        // Exponential scaling: 100, 150, 225, 337, ...
        return (int)(100 * Math.Pow(1.5, level - 1));
    }

    private List<SkillType> GenerateSkillChoices(int count)
    {
        var allSkills = Enum.GetValues<SkillType>().ToList();
        var choices = new List<SkillType>();

        for (int i = 0; i < count && allSkills.Count > 0; i++)
        {
            var index = _random.Next(allSkills.Count);
            choices.Add(allSkills[index]);
            allSkills.RemoveAt(index);
        }

        return choices;
    }
}
