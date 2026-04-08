import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:5048/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private get headers() {
    const token = this.authService.token;
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // Games
  getGames() {
    return this.http.get<any[]>(`${this.apiUrl}/games`);
  }

  // Leaderboards
  getLeaderboard(gameId: string) {
    return this.http.get<any[]>(`${this.apiUrl}/leaderboards/${gameId}`);
  }

  // Sessions
  saveSession(gameId: string, stateJson: string, currentScore: number) {
    return this.http.post(`${this.apiUrl}/sessions/save`, { gameInfoId: gameId, stateJson, currentScore }, this.headers);
  }

  loadSession(gameId: string) {
    return this.http.get<{stateJson: string, score: number}>(`${this.apiUrl}/sessions/load/${gameId}`, this.headers);
  }

  endSession(gameId: string, currentScore: number) {
    return this.http.post(`${this.apiUrl}/sessions/end`, { gameInfoId: gameId, currentScore }, this.headers);
  }
}
