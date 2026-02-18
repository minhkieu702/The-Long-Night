using Application.Interfaces;
using Domain.Enums;
using MediatR;

namespace Application.Commands;

public class SelectSkillHandler : IRequestHandler<SelectSkillCommand, Unit>
{
    private readonly IMatchmakingService _matchmaking;
    private readonly IRpgSystem _rpgSystem;

    public SelectSkillHandler(IMatchmakingService matchmaking, IRpgSystem rpgSystem)
    {
        _matchmaking = matchmaking;
        _rpgSystem = rpgSystem;
    }

    public Task<Unit> Handle(SelectSkillCommand request, CancellationToken cancellationToken)
    {
        var room = _matchmaking.GetRoomByPlayer(request.ConnectionId);
        if (room == null) return Task.FromResult(Unit.Value);

        if (room.Players.TryGetValue(request.ConnectionId, out var player))
        {
            if (!player.LevelUpPending) return Task.FromResult(Unit.Value);

            // Validate the chosen skill is in the offered choices
            if (!player.SkillChoices.Contains(request.Skill))
                return Task.FromResult(Unit.Value);

            _rpgSystem.ApplySkillUpgrade(player, request.Skill);

            player.LevelUpPending = false;
            player.SkillChoices.Clear();

            // Resume game if no other player is choosing a skill
            if (!room.AnyPlayerLevelingUp() && room.Status == GameStatus.LevelUpPause)
            {
                room.Status = GameStatus.Playing;
            }
        }

        return Task.FromResult(Unit.Value);
    }
}
