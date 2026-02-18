using System.Numerics;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using MediatR;

namespace Application.Commands;

public class JoinGameHandler : IRequestHandler<JoinGameCommand, JoinGameResult>
{
    private readonly IMatchmakingService _matchmaking;

    public JoinGameHandler(IMatchmakingService matchmaking)
    {
        _matchmaking = matchmaking;
    }

    public Task<JoinGameResult> Handle(JoinGameCommand request, CancellationToken cancellationToken)
    {
        var (room, isNew) = _matchmaking.FindOrCreateRoom();

        // Spawn player at center of map with slight random offset
        var random = new Random();
        var spawnX = room.MapWidth / 2f + (float)(random.NextDouble() * 100 - 50);
        var spawnY = room.MapHeight / 2f + (float)(random.NextDouble() * 100 - 50);

        var player = new PlayerEntity
        {
            ConnectionId = request.ConnectionId,
            Position = new Vector2(spawnX, spawnY),
            HP = 100f,
            Stats = new PlayerStats()
        };

        room.Players.TryAdd(request.ConnectionId, player);

        // Start game when first player joins (or keep Playing if already going)
        if (room.Status == GameStatus.WaitingForPlayers)
        {
            room.Status = GameStatus.Playing;
        }

        var result = new JoinGameResult
        {
            RoomId = room.RoomId,
            MapWidth = room.MapWidth,
            MapHeight = room.MapHeight,
            StartX = spawnX,
            StartY = spawnY
        };

        return Task.FromResult(result);
    }
}
