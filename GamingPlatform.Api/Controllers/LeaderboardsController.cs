using GamingPlatform.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GamingPlatform.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeaderboardsController : ControllerBase
    {
        private readonly GamingDbContext _context;

        public LeaderboardsController(GamingDbContext context)
        {
            _context = context;
        }

        [HttpGet("{gameId}")]
        public async Task<IActionResult> GetGlobalLeaderboard(string gameId)
        {
            var topScores = await _context.Leaderboards
                .Include(l => l.User)
                .Where(l => l.GameInfoId == gameId)
                .OrderByDescending(l => l.Score)
                .Take(10)
                .Select(l => new 
                {
                    username = l.User != null ? l.User.Username : "Unknown",
                    score = l.Score,
                    achievedAt = l.AchievedAt
                })
                .ToListAsync();

            return Ok(topScores);
        }
    }
}
