using Application.Interfaces;
using Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
    {
        services.AddSingleton<IMatchmakingService, MatchmakingService>();
        services.AddSingleton<IPhysicsSystem, PhysicsSystem>();
        services.AddSingleton<IRpgSystem, RpgSystem>();
        services.AddSingleton<IEnemyManager, EnemyManager>();

        return services;
    }
}
