using System;

namespace GamingPlatform.Api.Models
{
    public class GameSession
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string GameInfoId { get; set; } = string.Empty;
        
        public string StateJson { get; set; } = string.Empty; // Save state of the game
        public int CurrentScore { get; set; }
        
        public bool IsActive { get; set; }
        public DateTime LastSavedAt { get; set; }
        
        public User? User { get; set; }
        public GameInfo? GameInfo { get; set; }
    }
}
