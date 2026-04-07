using Microsoft.EntityFrameworkCore;

namespace GamingPlatform.Api.Models
{
    public class GamingDbContext : DbContext
    {
        public GamingDbContext(DbContextOptions<GamingDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<GameInfo> GameInfos { get; set; }
        public DbSet<GameSession> GameSessions { get; set; }
        public DbSet<LeaderboardEntry> Leaderboards { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).IsRequired();
            });

            modelBuilder.Entity<GameInfo>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired();
            });

            modelBuilder.Entity<GameSession>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User).WithMany(u => u.GameSessions).HasForeignKey(e => e.UserId);
                entity.HasOne(e => e.GameInfo).WithMany(g => g.GameSessions).HasForeignKey(e => e.GameInfoId);
            });

            modelBuilder.Entity<LeaderboardEntry>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User).WithMany(u => u.LeaderboardEntries).HasForeignKey(e => e.UserId);
                entity.HasOne(e => e.GameInfo).WithMany(g => g.LeaderboardEntries).HasForeignKey(e => e.GameInfoId);
            });

            // Seed generic games
            modelBuilder.Entity<GameInfo>().HasData(
                new GameInfo { Id = "snake", Name = "Classic Snake", Category = "Arcade / Classic", Description = "Navigate a neon-lit arena, consuming glowing energy orbs to grow your serpent. Test your reflexes as the speed increases—don\\'t collide with the walls or your own ever-lengthening tail!" },
                new GameInfo { Id = "tictactoe", Name = "Twisted Tic Tac Toe", Category = "Arcade / Classic", Description = "A strategic battle between Hatching Eggs and Sharp Swords across a 3x3 grid." },
                new GameInfo { Id = "brick-arrange", Name = "Brick Arrange", Category = "Arcade / Puzzle", Description = "A high-stakes block-stacking puzzle where you clear lines to set new high scores in a neon environment." }
            );
        }
    }
}
