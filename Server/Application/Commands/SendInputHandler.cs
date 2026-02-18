using System.Numerics;
using Application.Interfaces;
using MediatR;

namespace Application.Commands;

public class SendInputHandler : IRequestHandler<SendInputCommand, Unit>
{
    private readonly IMatchmakingService _matchmaking;

    public SendInputHandler(IMatchmakingService matchmaking)
    {
        _matchmaking = matchmaking;
    }

    public Task<Unit> Handle(SendInputCommand request, CancellationToken cancellationToken)
    {
        var room = _matchmaking.GetRoomByPlayer(request.ConnectionId);
        if (room == null) return Task.FromResult(Unit.Value);

        if (room.Players.TryGetValue(request.ConnectionId, out var player))
        {
            var dir = new Vector2(request.DirectionX, request.DirectionY);

            // Normalize to prevent speed hacking (client could send length > 1)
            if (dir.LengthSquared() > 0f)
            {
                dir = Vector2.Normalize(dir);
            }

            player.InputDirection = dir;
        }

        return Task.FromResult(Unit.Value);
    }
}
