using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using GamingPlatform.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyHeader()
               .AllowAnyMethod();
    });
});

// Configure DbContext
builder.Services.AddDbContext<GamingDbContext>(options =>
{
    // Using simple LocalDB for demonstration purposes, ensuring user can run it easily
    options.UseSqlServer("Server=(localdb)\\mssqllocaldb;Database=GamingPlatformDb;Trusted_Connection=True;MultipleActiveResultSets=true");
});

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "super_secret_gaming_platform_key_12345!@#"; // Hardcoded for demo/simplicity
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

var app = builder.Build();

// Auto-migrate database on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GamingDbContext>();
    // Make sure we have the DB created
    db.Database.EnsureCreated();
    
    // Ensure all seeded games are present and updated
    var seededGames = new[] {
        new GameInfo { Id = "snake", Name = "Classic Snake", Category = "Arcade / Classic", Description = "Navigate a neon-lit arena, consuming glowing energy orbs to grow your serpent. Test your reflexes as the speed increases—don't collide with the walls or your own ever-lengthening tail!" },
        new GameInfo { Id = "tictactoe", Name = "Twisted Tic Tac Toe", Category = "Arcade / Classic", Description = "A strategic battle between Hatching Eggs and Sharp Swords across a 3x3 grid." },
        new GameInfo { Id = "brick-arrange", Name = "Brick Arrange", Category = "Arcade / Puzzle", Description = "A high-stakes block-stacking puzzle where you clear lines to set new high scores in a neon environment." }
    };

    foreach (var game in seededGames)
    {
        var existing = db.GameInfos.FirstOrDefault(g => g.Id == game.Id);
        if (existing == null)
        {
            db.GameInfos.Add(game);
        }
        else
        {
            // Update fields if they have changed
            existing.Description = game.Description;
            existing.Name = game.Name;
            existing.Category = game.Category;
        }
    }
    db.SaveChanges();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AllowAngular");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
