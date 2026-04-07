using System;
using System.Collections.Generic;

namespace GamingPlatform.Api.Models
{
    public class GameInfo
    {
        public string Id { get; set; } = string.Empty; // e.g. "snake", "tictactoe"
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // "Arcade / Classic", etc
        
        public ICollection<GameSession> GameSessions { get; set; } = new List<GameSession>();
        public ICollection<LeaderboardEntry> LeaderboardEntries { get; set; } = new List<LeaderboardEntry>();
    }
}
