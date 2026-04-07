using GamingPlatform.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;

namespace GamingPlatform.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly GamingDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(GamingDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public class LoginDto
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
            if (user == null || user.IsGuest) return Unauthorized(new { message = "Invalid credentials" });

            // In real app, verify hashed password. For demo, we do a simple check.
            using var sha = SHA256.Create();
            var hashed = Convert.ToBase64String(sha.ComputeHash(Encoding.UTF8.GetBytes(dto.Password)));
            if (user.PasswordHash != hashed) return Unauthorized(new { message = "Invalid credentials" });

            return Ok(new { token = GenerateJwt(user), username = user.Username, isGuest = false });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] LoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest();

            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest(new { message = "Username already exists" });

            using var sha = SHA256.Create();
            var hashed = Convert.ToBase64String(sha.ComputeHash(Encoding.UTF8.GetBytes(dto.Password)));

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = dto.Username,
                PasswordHash = hashed,
                IsGuest = false
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registered successfully" });
        }

        [HttpPost("guest")]
        public async Task<IActionResult> GuestLogin()
        {
            var guestUser = new User
            {
                Id = Guid.NewGuid(),
                Username = "Guest_" + Guid.NewGuid().ToString().Substring(0, 5),
                IsGuest = true
            };
            
            _context.Users.Add(guestUser);
            await _context.SaveChangesAsync();

            return Ok(new { token = GenerateJwt(guestUser), username = guestUser.Username, isGuest = true });
        }

        private string GenerateJwt(User user)
        {
            var key = _config["Jwt:Key"] ?? "super_secret_gaming_platform_key_12345!@#";
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim("username", user.Username),
                new Claim("isGuest", user.IsGuest.ToString())
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
