using Domain.Entities;

namespace Application.Interfaces;

public interface IPhysicsSystem
{
    void MovePlayer(PlayerEntity player, float deltaTime);
    void MoveEnemy(EnemyEntity enemy, PlayerEntity target, float deltaTime);
    void UpdateProjectiles(Room room, float deltaTime);
    void CheckCollisions(Room room);
}
