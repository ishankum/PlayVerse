using GamingPlatform.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GamingPlatform.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GamesController : ControllerBase
    {
        private readonly GamingDbContext _context;

        public GamesController(GamingDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetGames()
        {
            var games = await _context.GameInfos.ToListAsync();
            return Ok(games);
        }
    }
}
