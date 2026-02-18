using Domain.Entities;
using Domain.Enums;

namespace Application.Interfaces;

public interface IRpgSystem
{
    float CalculateDamage(PlayerEntity player);
    void AddExperience(PlayerEntity player, int amount, Room room);
    void ApplySkillUpgrade(PlayerEntity player, SkillType skill);
    int GetXpForLevel(int level);
}
