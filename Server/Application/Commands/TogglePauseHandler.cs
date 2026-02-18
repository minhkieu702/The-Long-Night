using Application.Interfaces;
using Domain.Enums;
using MediatR;

namespace Application.Commands;

public class TogglePauseHandler : IRequestHandler<TogglePauseCommand, bool>
{
    private readonly IMatchmakingService _matchmaking;

    public TogglePauseHandler(IMatchmakingService matchmaking)
    {
        _matchmaking = matchmaking;
    }

    public Task<bool> Handle(TogglePauseCommand request, CancellationToken cancellationToken)
    {
        var room = _matchmaking.GetRoomByPlayer(request.ConnectionId);
        if (room == null)
            return Task.FromResult(false);

        // Only allow pause/resume when the game is Playing or already Paused
        if (room.Status == GameStatus.Playing)
        {
            room.Status = GameStatus.Paused;
            return Task.FromResult(true);
        }
        else if (room.Status == GameStatus.Paused)
        {
            room.Status = GameStatus.Playing;
            return Task.FromResult(false);
        }

        // Don't allow toggling during LevelUpPause, WaitingForPlayers, or GameOver
        return Task.FromResult(room.Status == GameStatus.Paused);
    }
}
