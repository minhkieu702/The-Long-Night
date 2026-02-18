using System.Numerics;
using MediatR;

namespace Application.Commands;

public class SendInputCommand : IRequest<Unit>
{
    public string ConnectionId { get; set; } = string.Empty;
    public float DirectionX { get; set; }
    public float DirectionY { get; set; }
}
