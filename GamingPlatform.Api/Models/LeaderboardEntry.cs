using System;

namespace GamingPlatform.Api.Models
{
    public class LeaderboardEntry
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string GameInfoId { get; set; } = string.Empty;
        
        public int Score { get; set; }
        public DateTime AchievedAt { get; set; } = DateTime.UtcNow;
        
        public User? User { get; set; }
        public GameInfo? GameInfo { get; set; }
    }
}
