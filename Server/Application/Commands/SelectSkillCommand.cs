using Domain.Enums;
using MediatR;

namespace Application.Commands;

public class SelectSkillCommand : IRequest<Unit>
{
    public string ConnectionId { get; set; } = string.Empty;
    public SkillType Skill { get; set; }
}
