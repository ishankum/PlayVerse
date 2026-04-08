import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-tictactoe-game',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .egg-hatch {
      animation: hatch 0.5s ease-in-out infinite alternate;
      z-index: 10;
    }
    @keyframes hatch {
      0% { transform: scale(1) rotate(-15deg); }
      100% { transform: scale(1.3) rotate(15deg); filter: drop-shadow(0 0 15px var(--accent-tertiary)); }
    }
    .sword-strike-line {
      position: absolute;
      background: #ff3366;
      box-shadow: 0 0 20px #ff3366;
      border-radius: 4px;
      z-index: 20;
      pointer-events: none;
    }
    @keyframes strike-anim {
      0% { transform: scaleX(0); }
      100% { transform: scaleX(1); }
    }
    @keyframes strike-anim-v {
      0% { transform: scaleY(0); }
      100% { transform: scaleY(1); }
    }
    @keyframes strike-anim-diag {
      0% { width: 0; }
      100% { width: var(--final-width); }
    }
    .winner-bg {
      background: rgba(255,255,255,0.1) !important;
      border: 3px solid var(--accent-tertiary);
      transform: scale(1.05) !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
  `],
  template: `
    <div style="padding: 20px; text-align: center;">
      <h2 class="text-gradient">Tic Tac Toe: Epic Battle</h2>
      <p>🥚 Eggs vs ⚔️ Crossed Swords</p>
      
      <div style="margin: 15px auto; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 12px; display: inline-flex; gap: 10px; border: 1px solid var(--border-color);">
        <button class="btn" [class.btn-primary]="!isBotMode" [class.btn-secondary]="isBotMode" (click)="toggleBotMode(false)">Local PvP</button>
        <button class="btn" [class.btn-primary]="isBotMode" [class.btn-secondary]="!isBotMode" (click)="toggleBotMode(true)">VS Bot (AI)</button>
      </div>
      
      <div style="display: flex; justify-content: space-around; max-width: 400px; margin: 20px auto;">
        <div>
          <h3>Score</h3>
          <p class="text-gradient" style="font-size: 2em; font-weight: bold;">{{score}}</p>
        </div>
        <div>
          <h3>Status</h3>
          <p style="font-size: 1.2em; color: var(--accent-secondary)">
            {{ isBotThinking ? 'Bot Thinking...' : (isXNext ? 'Sword\\'s Turn' : 'Egg\\'s Turn') }}
          </p>
        </div>
      </div>
      
      <div style="position: relative; display: grid; grid-template-columns: repeat(3, 100px); grid-template-rows: repeat(3, 100px); gap: 10px; width: fit-content; margin: 0 auto; background: var(--border-color); padding: 10px; border-radius: 12px;">
        
        <!-- Sword Strike Line -->
        <div *ngIf="winner === 'X' && strikeStyle" 
             class="sword-strike-line" 
             [ngStyle]="strikeStyle">
        </div>

        <div *ngFor="let cell of board; let i = index" 
             (click)="makeMove(i)"
             [class.egg-hatch]="cell === 'O' && isWinningCell(i) && winner === 'O'"
             [class.winner-bg]="isWinningCell(i)"
             style="background: var(--bg-secondary); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 3.5rem; line-height: 1; cursor: pointer; transition: transform 0.2s;"
             [style.transform]="cell && !isWinningCell(i) ? 'scale(1)' : 'scale(0.95)'"
             class="glass-panel">
             {{ (cell === 'O' && isWinningCell(i) && winner === 'O') ? '🐣' : (cell === 'X' ? '⚔️' : cell === 'O' ? '🥚' : '') }}
        </div>
      </div>
      
      <div *ngIf="winner" style="margin-top: 30px;">
        <h2 style="color: var(--accent-secondary)">{{ winner === 'Draw' ? 'It\\'s a Draw!' : winner === 'X' ? '⚔️ Swords Win!' : '🥚 Eggs Win!' }}</h2>
        <button class="btn btn-primary" (click)="resetBoard()">Next Round</button>
      </div>

      <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px; align-items: center;">
        <button class="btn btn-secondary" style="width: 200px" (click)="resetBoard()">Reset Board</button>
        <button class="btn btn-secondary" style="width: 200px" (click)="endMatch()">End Match & Submit Score</button>
      </div>
      
      <div *ngIf="leaderboard.length > 0" style="max-width: 400px; margin: 30px auto 0; text-align: left;">
        <h3 style="color: var(--accent-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Top Scores</h3>
        <div *ngFor="let entry of leaderboard; let i = index" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
          <span>{{i + 1}}. {{entry.username}}</span>
          <span style="color: var(--accent-secondary); font-weight: bold;">{{entry.score}}</span>
        </div>
      </div>
    </div>
  `
})
export class TicTacToeComponent implements OnInit {
  board: ('X' | 'O' | null)[] = Array(9).fill(null);
  isXNext = true;
  winner: 'X' | 'O' | 'Draw' | null = null;
  winningLine: number[] | null = null;
  score = 0;
  leaderboard: any[] = [];

  isBotMode = false;
  isBotThinking = false;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetchLeaderboard();
    // Auto load session if exists
    this.api.loadSession('tictactoe').subscribe({
      next: (res) => {
        if(res.stateJson) {
           const state = JSON.parse(res.stateJson);
           this.board = state.board;
           this.isXNext = state.isXNext;
           this.score = res.score;
           this.checkWinner();
        }
      },
      error: () => { console.log('No active session found for tictactoe'); }
    });
  }

  fetchLeaderboard() {
    this.api.getLeaderboard('tictactoe').subscribe(lb => this.leaderboard = lb);
  }

  toggleBotMode(enabled: boolean) {
    this.isBotMode = enabled;
    this.resetBoard();
  }

  makeMove(index: number) {
    if (!this.board[index] && !this.winner && !this.isBotThinking) {
      this.board[index] = this.isXNext ? 'X' : 'O';
      this.isXNext = !this.isXNext;
      this.checkWinner();
      
      // Auto save after move
      const state = { board: this.board, isXNext: this.isXNext };
      this.api.saveSession('tictactoe', JSON.stringify(state), this.score).subscribe();

      // Bot logic
      if (this.isBotMode && !this.winner && !this.isXNext) {
        this.triggerBotMove();
      }
    }
  }

  triggerBotMove() {
      this.isBotThinking = true;
      setTimeout(() => {
          const move = this.getBestMove();
          if (move !== -1) {
              this.board[move] = 'O';
              this.isXNext = true;
              this.checkWinner();
              const state = { board: this.board, isXNext: this.isXNext };
              this.api.saveSession('tictactoe', JSON.stringify(state), this.score).subscribe();
          }
          this.isBotThinking = false;
          this.cdr.detectChanges();
      }, 600);
  }

  getBestMove(): number {
      const emptyIndices = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
      if (emptyIndices.length === 0) return -1;
      
      const lines = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
      ];

      // 1. Can Bot win?
      for(let line of lines) {
          const [a, b, c] = line;
          const vals = [this.board[a], this.board[b], this.board[c]];
          if (vals.filter(v => v === 'O').length === 2 && vals.filter(v => v === null).length === 1) {
              return line[vals.indexOf(null)];
          }
      }

      // 2. Block Player Win?
      for(let line of lines) {
          const [a, b, c] = line;
          const vals = [this.board[a], this.board[b], this.board[c]];
          if (vals.filter(v => v === 'X').length === 2 && vals.filter(v => v === null).length === 1) {
              return line[vals.indexOf(null)];
          }
      }

      // 3. Take Center
      if (this.board[4] === null) return 4;

      // 4. Take Corner
      const corners = [0, 2, 6, 8].filter(i => this.board[i] === null);
      if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

      // 5. Random
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  checkWinner() {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
            this.winner = this.board[a] as 'X' | 'O';
            this.winningLine = lines[i];
            if(this.winner === 'X') this.score += 50; // User is playing as X (Swords)
            else this.score -= 20; // Lost a round
            return;
        }
    }
    
    if (!this.board.includes(null)) {
        this.winner = 'Draw';
        this.score += 10;
    }
    this.cdr.detectChanges();
  }

  resetBoard() {
    this.board = Array(9).fill(null);
    this.winner = null;
    this.winningLine = null;
    this.isXNext = true;
  }

  isWinningCell(index: number): boolean {
    return this.winningLine ? this.winningLine.includes(index) : false;
  }

  get strikeStyle(): any {
    if (!this.winningLine || this.winner !== 'X') return null;
    const lineStr = this.winningLine.join(',');
    
    let top = 'auto', left = 'auto', right = 'auto', width = '6px', height = '6px';
    let transform = 'none', transformOrigin = 'center';
    let animation = '';

    const isHorizontal = ['0,1,2','3,4,5','6,7,8'].includes(lineStr);
    const isVertical = ['0,3,6','1,4,7','2,5,8'].includes(lineStr);
    const isDiag1 = lineStr === '0,4,8';
    const isDiag2 = lineStr === '2,4,6';

    if (isHorizontal) {
      if (lineStr === '0,1,2') top = '52px';
      if (lineStr === '3,4,5') top = '162px';
      if (lineStr === '6,7,8') top = '272px';
      left = '10px';
      width = '320px'; // Cover padding and cells
      transformOrigin = 'left center';
      animation = 'strike-anim 0.4s cubic-bezier(0.8, 0, 0.2, 1) forwards';
    } 
    else if (isVertical) {
      if (lineStr === '0,3,6') left = '52px';
      if (lineStr === '1,4,7') left = '162px';
      if (lineStr === '2,5,8') left = '272px';
      top = '10px';
      height = '320px';
      transformOrigin = 'top center';
      animation = 'strike-anim-v 0.4s cubic-bezier(0.8, 0, 0.2, 1) forwards';
    }
    else if (isDiag1) {
      top = '15px';
      left = '15px';
      transformOrigin = 'top left';
      transform = 'rotate(45deg)';
      height = '6px';
      animation = 'strike-anim-diag 0.4s cubic-bezier(0.8, 0, 0.2, 1) forwards';
    }
    else if (isDiag2) {
      top = '15px';
      right = '15px';
      transformOrigin = 'top right';
      transform = 'rotate(-45deg)';
      height = '6px';
      animation = 'strike-anim-diag 0.4s cubic-bezier(0.8, 0, 0.2, 1) forwards';
    }

    return {
      top, left, right, width, height, transform, 'transform-origin': transformOrigin, animation,
      '--final-width': isDiag1 || isDiag2 ? '435px' : 'auto' // sqrt(320^2 + 320^2) ≈ 452, use 435 for safe margin
    };
  }

  endMatch() {
    this.api.endSession('tictactoe', this.score).subscribe(() => {
        this.score = 0;
        this.resetBoard();
        this.fetchLeaderboard();
        alert('Score submitted to Leaderboard!');
    });
  }
}
