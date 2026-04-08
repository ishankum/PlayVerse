import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-snake-game',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="background: rgba(0,0,0,0.8); padding: 20px; text-align: center; color: white;">
      <div style="display: flex; justify-content: space-between; max-width: 400px; margin: 0 auto 10px;">
        <h2 style="margin: 0; color: #00f5d4">SCORE: {{score}}</h2>
        <h2 *ngIf="isGameOver" style="color: #fee440; margin: 0;">GAME OVER</h2>
      </div>
      
      <canvas #snakeCanvas width="400" height="400" style="border: 2px solid #00f5d4; border-radius: 8px; box-shadow: 0 0 20px rgba(0,255,204,0.2); background-color: #000;"></canvas>
      
      <div style="margin-top: 20px; min-height: 50px;">
        <button class="btn btn-primary" *ngIf="!isPlaying && !isGameOver" (click)="startGame()">Start Game</button>
        <button class="btn btn-outline-primary" style="margin-left: 10px;" *ngIf="!isPlaying && !isGameOver" (click)="startBotMode()">Watch Bot Play</button>
        <button class="btn btn-primary" *ngIf="isGameOver" (click)="resetGame()">Play Again / Restart</button>
        <button class="btn btn-outline-danger" style="margin-left: 10px;" *ngIf="isPlaying && isBotMode" (click)="stopBotMode()">Stop Bot</button>
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
export class SnakeGameComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('snakeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  
  private gridSize = 20;
  private tileCount = 20; // 400x400 canvas
  
  private snake: {x: number, y: number}[] = [];
  private food = {x: 10, y: 10};
  private dx = 0;
  private dy = -1;
  
  score = 0;
  isPlaying = false;
  isGameOver = false;
  isBotMode = false;
  private gameLoopId: any;

  leaderboard: any[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetchLeaderboard();
  }

  fetchLeaderboard() {
    this.api.getLeaderboard('snake').subscribe({
      next: (lb) => this.leaderboard = lb,
      error: (e) => console.error(e)
    });
  }

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    document.addEventListener('keydown', this.handleInput.bind(this));
    this.drawInit();
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleInput.bind(this));
    clearTimeout(this.gameLoopId);
  }

  handleInput(e: KeyboardEvent) {
    if (!this.isPlaying) return;
    if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
    }
    switch(e.key) {
      case 'ArrowLeft': if (this.dx === 0) { this.dx = -1; this.dy = 0; } break;
      case 'ArrowUp': if (this.dy === 0) { this.dx = 0; this.dy = -1; } break;
      case 'ArrowRight': if (this.dx === 0) { this.dx = 1; this.dy = 0; } break;
      case 'ArrowDown': if (this.dy === 0) { this.dx = 0; this.dy = 1; } break;
    }
  }

  drawInit() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, 400, 400);
  }

  resetGame() {
    this.isGameOver = false;
    this.startGame();
  }

  startGame() {
    this.snake = [
      {x: 10, y: 10},
      {x: 10, y: 11},
      {x: 10, y: 12}
    ];
    this.dx = 0;
    this.dy = -1;
    this.score = 0;
    this.placeFood();
    this.isPlaying = true;
    this.isGameOver = false;
    
    // Create new session via API
    this.api.saveSession('snake', JSON.stringify({ snake: this.snake }), this.score).subscribe({
      error: () => {} // Ignore errors for local play
    });
    
    this.gameLoop();
  }

  startBotMode() {
    this.isBotMode = true;
    this.startGame();
  }

  stopBotMode() {
    this.isBotMode = false;
    this.gameOver();
  }

  placeFood() {
    let newFood: { x: number, y: number };
    let isOnSnake: boolean;
    do {
      newFood = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount)
      };
      
      isOnSnake = this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    } while (isOnSnake);

    this.food = newFood;
  }

  gameLoop() {
    if (!this.isPlaying) return;

    if (this.isBotMode) {
      this.calculateBotMove();
    }
    
    const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
    
    // Wall collision
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      return this.gameOver();
    }
    
    // Self collision
    for (let i = 0; i < this.snake.length; i++) {
      if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
        return this.gameOver();
      }
    }
    
    this.snake.unshift(head);
    
    // Check food
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.placeFood();
    } else {
      this.snake.pop();
    }
    
    this.draw();
    
    let speed = this.isBotMode ? 50 : 100; // Bot can play faster
    this.gameLoopId = setTimeout(() => this.gameLoop(), speed);
  }

  calculateBotMove() {
    const head = this.snake[0];
    const possibleMoves = [
      { dx: 1, dy: 0 },  // Right
      { dx: -1, dy: 0 }, // Left
      { dx: 0, dy: 1 },  // Down
      { dx: 0, dy: -1 }  // Up
    ];

    // 1. Filter out reversing (can't go opposite of current direction)
    const validMoves = possibleMoves.filter(move => {
      if (this.dx !== 0 && move.dx === -this.dx) return false;
      if (this.dy !== 0 && move.dy === -this.dy) return false;
      return true;
    });

    // 2. Filter out collisions with walls and self
    const safeMoves = validMoves.filter(move => {
      const nextX = head.x + move.dx;
      const nextY = head.y + move.dy;

      // Wall check
      if (nextX < 0 || nextX >= this.tileCount || nextY < 0 || nextY >= this.tileCount) return false;

      // Self check
      for (const segment of this.snake) {
        if (segment.x === nextX && segment.y === nextY) return false;
      }

      return true;
    });

    if (safeMoves.length === 0) return; // No safe moves, let it crash or keep current

    // 3. Pick the move that brings us closest to the food
    safeMoves.sort((a, b) => {
      const distA = Math.abs(head.x + a.dx - this.food.x) + Math.abs(head.y + a.dy - this.food.y);
      const distB = Math.abs(head.x + b.dx - this.food.x) + Math.abs(head.y + b.dy - this.food.y);
      return distA - distB;
    });

    const bestMove = safeMoves[0];
    this.dx = bestMove.dx;
    this.dy = bestMove.dy;
  }

  draw() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, 400, 400);
    
    // Draw food
    this.ctx.fillStyle = '#fee440'; // --accent-tertiary
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#fee440';
    this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
    
    // Draw snake
    this.ctx.shadowBlur = 5;
    
    for (let i = 0; i < this.snake.length; i++) {
        if (i===0) {
            this.ctx.fillStyle = '#9d4edd'; // --accent-primary
            this.ctx.shadowColor = '#9d4edd';
        } else {
            this.ctx.fillStyle = '#00f5d4'; // --accent-secondary
            this.ctx.shadowColor = '#00f5d4';
        }
        
        this.ctx.fillRect(this.snake[i].x * this.gridSize, this.snake[i].y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
    }
    
    // Reset shadow
    this.ctx.shadowBlur = 0;

    if (this.isGameOver) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, 400, 400);
      this.ctx.fillStyle = '#fee440';
      this.ctx.font = 'bold 40px Outfit';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', 200, 180);
      this.ctx.font = '20px Outfit';
      this.ctx.fillText('Score: ' + this.score, 200, 220);
    }
  }

  gameOver() {
    this.isPlaying = false;
    this.isGameOver = true;
    console.log("Game Over triggered");
    // End session and submit score
    this.api.endSession('snake', this.score).subscribe({
      next: () => { this.fetchLeaderboard(); this.cdr.detectChanges(); },
      error: () => { this.fetchLeaderboard(); this.cdr.detectChanges(); }
    });
    if (this.isBotMode) {
      setTimeout(() => {
        if (this.isBotMode) this.resetGame();
      }, 1000);
    }

    this.draw(); 
    this.cdr.detectChanges();
  }
}
