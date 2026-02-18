using Application.Commands;
using Domain.Enums;
using Infrastructure.Services;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace Presentation.Hubs;

public class GameHub : Hub
{
    private readonly IMediator _mediator;
    private readonly MatchmakingService _matchmaking;

    public GameHub(IMediator mediator, Application.Interfaces.IMatchmakingService matchmaking)
    {
        _mediator = mediator;
        // We need the concrete type for RegisterPlayerRoom
        _matchmaking = (MatchmakingService)matchmaking;
    }

    public async Task JoinGame()
    {
        var command = new JoinGameCommand
        {
            ConnectionId = Context.ConnectionId
        };

        var result = await _mediator.Send(command);

        // Register the player→room mapping for fast lookup
        _matchmaking.RegisterPlayerRoom(Context.ConnectionId, result.RoomId);

        // Add to SignalR group for targeted broadcasting
        await Groups.AddToGroupAsync(Context.ConnectionId, result.RoomId);

        // Send join confirmation back to the client
        await Clients.Caller.SendAsync("JoinedGame", result);
    }

    public async Task SendInput(float directionX, float directionY)
    {
        var command = new SendInputCommand
        {
            ConnectionId = Context.ConnectionId,
            DirectionX = directionX,
            DirectionY = directionY
        };

        await _mediator.Send(command);
    }

    public async Task SelectSkill(int skillIndex)
    {
        if (!Enum.IsDefined(typeof(SkillType), skillIndex))
            return;

        var command = new SelectSkillCommand
        {
            ConnectionId = Context.ConnectionId,
            Skill = (SkillType)skillIndex
        };

        await _mediator.Send(command);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var room = _matchmaking.GetRoomByPlayer(Context.ConnectionId);
        if (room != null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, room.RoomId);
        }

        _matchmaking.RemovePlayer(Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }
}
