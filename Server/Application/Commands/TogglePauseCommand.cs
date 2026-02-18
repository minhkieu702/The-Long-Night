using MediatR;

namespace Application.Commands;

public class TogglePauseCommand : IRequest<bool>
{
    public string ConnectionId { get; set; } = string.Empty;
}
