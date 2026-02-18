using Application;
using Infrastructure;
using Presentation.Hubs;
using Presentation.Services;

var builder = WebApplication.CreateBuilder(args);

// ----- Clean Architecture DI -----
builder.Services.AddApplicationServices();   // MediatR handlers
builder.Services.AddInfrastructureServices(); // PhysicsSystem, RpgSystem, EnemyManager, MatchmakingService

// ----- SignalR -----
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
});

// ----- Game Loop (60 TPS) -----
builder.Services.AddHostedService<GameLoopService>();

// ----- CORS (allow game clients) -----
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });

    options.AddPolicy("GameClient", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// ----- Middleware -----
app.UseCors("GameClient");

// ----- Endpoints -----
app.MapHub<GameHub>("/gamehub");

app.MapGet("/", () => "The Long Night — Game Server is running.");
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();
