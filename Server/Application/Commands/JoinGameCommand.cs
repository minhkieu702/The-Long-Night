using MediatR;

namespace Application.Commands;

public class JoinGameResult
{
    public string RoomId { get; set; } = string.Empty;
    public float MapWidth { get; set; }
    public float MapHeight { get; set; }
    public float StartX { get; set; }
    public float StartY { get; set; }
}

public class JoinGameCommand : IRequest<JoinGameResult>
{
    public string ConnectionId { get; set; } = string.Empty;
}
