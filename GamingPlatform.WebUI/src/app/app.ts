import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { FormsModule } from '@angular/forms';
// We'll import games dynamically or just render them here
import { SnakeGameComponent } from './games/snake.component';
import { TicTacToeComponent } from './games/tictactoe.component';
import { BrickArrangeComponent } from './games/brick-arrange.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, SnakeGameComponent, TicTacToeComponent, BrickArrangeComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {
  title = 'GamingPlatform.WebUI';
  
  games: any[] = [];
  selectedGame: string | null = null;
  
  usernameInput = '';
  passwordInput = '';
  isLoginActive = true;

  constructor(public authConfig: AuthService, public api: ApiService) {}

  ngOnInit(): void {
    this.loadGames();
  }

  loadGames() {
    this.api.getGames().subscribe({
      next: (games) => this.games = games,
      error: (e) => console.error("Could not fetch games", e)
    });
  }

  playGuest() {
    this.authConfig.guestLogin().subscribe({
      next: () => this.loadGames(),
      error: (e) => console.error(e)
    });
  }

  login() {
    this.authConfig.login(this.usernameInput, this.passwordInput).subscribe();
  }

  register() {
    this.authConfig.register(this.usernameInput, this.passwordInput).subscribe({
      next: () => this.isLoginActive = true
    });
  }

  logout() {
    this.authConfig.logout();
    this.selectedGame = null;
  }

  selectGame(gameId: string) {
    if(!this.authConfig.user) {
      alert("Please login or play as guest to continue.");
      return;
    }
    this.selectedGame = gameId;
  }

  backToPortal() {
    this.selectedGame = null;
  }
}
