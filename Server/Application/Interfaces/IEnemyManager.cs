using Domain.Entities;

namespace Application.Interfaces;

public interface IEnemyManager
{
    void SpawnWave(Room room);
    PlayerEntity? FindNearestTarget(EnemyEntity enemy, Room room);
    void UpdateTargets(Room room);
}
