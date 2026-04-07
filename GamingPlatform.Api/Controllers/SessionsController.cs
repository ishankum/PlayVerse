using GamingPlatform.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GamingPlatform.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SessionsController : ControllerBase
    {
        private readonly GamingDbContext _context;

        public SessionsController(GamingDbContext context)
        {
            _context = context;
        }

        public class SaveStateDto
        {
            public string GameInfoId { get; set; } = string.Empty;
            public string StateJson { get; set; } = string.Empty;
            public int CurrentScore { get; set; }
        }

        [Authorize]
        [HttpPost("save")]
        public async Task<IActionResult> SaveSession([FromBody] SaveStateDto dto)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var session = await _context.GameSessions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.GameInfoId == dto.GameInfoId && s.IsActive);

            if (session == null)
            {
                session = new GameSession
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    GameInfoId = dto.GameInfoId,
                    IsActive = true
                };
                _context.GameSessions.Add(session);
            }

            session.StateJson = dto.StateJson;
            session.CurrentScore = dto.CurrentScore;
            session.LastSavedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Session saved", sessionId = session.Id });
        }

        [Authorize]
        [HttpGet("load/{gameId}")]
        public async Task<IActionResult> LoadSession(string gameId)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var session = await _context.GameSessions
                .Where(s => s.UserId == userId && s.GameInfoId == gameId && s.IsActive)
                .OrderByDescending(s => s.LastSavedAt)
                .FirstOrDefaultAsync();

            if (session == null) return NotFound(new { message = "No active session found" });

            return Ok(new { stateJson = session.StateJson, score = session.CurrentScore });
        }

        [Authorize]
        [HttpPost("end")]
        public async Task<IActionResult> EndSession([FromBody] SaveStateDto dto)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            // Find current active session
            var session = await _context.GameSessions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.GameInfoId == dto.GameInfoId && s.IsActive);

            if (session != null)
            {
                session.IsActive = false;
                session.CurrentScore = dto.CurrentScore;
                session.LastSavedAt = DateTime.UtcNow;
            }

            // Record to leaderboard unconditionally if game ends
            var entry = new LeaderboardEntry
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                GameInfoId = dto.GameInfoId,
                Score = dto.CurrentScore,
                AchievedAt = DateTime.UtcNow
            };
            _context.Leaderboards.Add(entry);

            await _context.SaveChangesAsync();
            return Ok(new { message = "Session ended and score recorded" });
        }
    }
}
