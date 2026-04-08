import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // Increased from 25 for better visibility

const SHAPES = [
  [[1, 1, 1, 1]], // I (Cyan)
  [[1, 1, 1], [0, 0, 1]], // J (Blue)
  [[1, 1, 1], [1, 0, 0]], // L (Orange)
  [[1, 1], [1, 1]], // O (Yellow)
  [[0, 1, 1], [1, 1, 0]], // S (Green)
  [[1, 1, 1], [0, 1, 0]], // T (Purple)
  [[1, 1, 0], [0, 1, 1]]  // Z (Red)
];

const COLORS = [
  '#00f5d4', // Cyan
  '#00bbf9', // Blue
  '#f15bb5', // Orange/Pink
  '#fee440', // Yellow
  '#9d4edd', // Green/Purple
  '#ff4d6d', // Red
  '#7209b7'  // Multi
];

@Component({
  selector: 'app-brick-arrange',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="background: rgba(0,0,0,0.9); padding: 30px; text-align: center; color: white; display: flex; gap: 30px; align-items: start; justify-content: center; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(20px);">
      
      <!-- LEFT: GAME BOARD -->
      <div style="position: relative;">
        <canvas #brickCanvas width="300" height="600" style="border: 2px solid #5a189a; border-radius: 8px; box-shadow: 0 0 40px rgba(90, 24, 154, 0.5); background: #050505;"></canvas>
        
        <div *ngIf="!isPlaying && !isGameOver" 
             style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:8px; z-index: 10;">
           <h3 class="text-gradient" style="font-size: 2em; letter-spacing: 4px;">READY?</h3>
           <button class="btn btn-primary" (click)="startGame()">START GAME</button>
        </div>

        <div *ngIf="isGameOver" 
             style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:8px; z-index: 10;">
           <h2 style="color: #ff4d6d; font-size: 2.5em; text-shadow: 0 0 10px rgba(255,77,109,0.5);">GAME OVER</h2>
           <p style="font-size: 1.2em; margin-bottom: 20px;">Final Score: {{score}}</p>
           <button class="btn btn-primary" (click)="startGame()">PLAY AGAIN</button>
        </div>
      </div>

      <!-- RIGHT: STATS & NEXT PIECE -->
      <div style="display: flex; flex-direction: column; gap: 20px; min-width: 180px;">
        
        <!-- NEXT PIECE BOX -->
        <div class="glass-panel" style="padding: 15px; border: 1px solid var(--accent-primary);">
          <p style="margin:0 0 10px 0; font-size: 0.8em; color: var(--accent-secondary); letter-spacing: 2px;">NEXT</p>
          <div style="background: rgba(0,0,0,0.3); border-radius: 4px; padding: 10px; display: flex; justify-content: center; align-items: center; min-height: 120px;">
             <canvas #nextCanvas width="120" height="120"></canvas>
          </div>
        </div>

        <!-- SCORE -->
        <div class="glass-panel" style="padding: 15px;">
          <p style="margin:0; font-size: 0.8em; color: var(--accent-secondary); letter-spacing: 2px;">SCORE</p>
          <h2 style="margin:0; color: #00f5d4; font-size: 2em;">{{score}}</h2>
        </div>

        <!-- LEVEL -->
        <div class="glass-panel" style="padding: 15px;">
          <p style="margin:0; font-size: 0.8em; color: var(--accent-secondary); letter-spacing: 2px;">LEVEL</p>
          <h2 style="margin:0; color: #fee440; font-size: 2em;">{{level}}</h2>
        </div>

        <!-- CONTROLS -->
        <div style="margin-top: 20px; font-size: 0.8em; color: rgba(255,255,255,0.4); text-align: left; line-height: 1.6;">
           <b style="color: var(--accent-primary)">CONTROLS:</b><br>
           Arrows: Move/Rotate<br>
           Space: Hard Drop
        </div>

        <!-- RANKINGS -->
        <div *ngIf="leaderboard.length > 0" style="width: 100%; margin-top: 10px; text-align: left;">
          <h3 style="color: var(--accent-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px; font-size: 0.9em; letter-spacing: 1px;">TOP RANKINGS</h3>
          <div *ngFor="let entry of leaderboard.slice(0, 5); let i = index" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.1); font-size: 0.8em;">
            <span>{{i + 1}}. {{entry.username}}</span>
            <span style="color: var(--accent-secondary); font-weight: bold;">{{entry.score}}</span>
          </div>
        </div>

      </div>
    </div>
  `
})
export class BrickArrangeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('brickCanvas') brickCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('nextCanvas') nextCanvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private nextCtx!: CanvasRenderingContext2D;
  
  grid: number[][] = [];
  currentPiece: any = null;
  nextPiece: any = null;
  score = 0;
  level = 1;
  linesCleared = 0;
  isPlaying = false;
  isGameOver = false;
  private gameLoopId: any;
  private dropInterval = 1000;
  private animatingRows: number[] = [];
  private isAnimating = false;

  leaderboard: any[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.fetchLeaderboard();
  }

  ngAfterViewInit() {
    this.ctx = this.brickCanvasRef.nativeElement.getContext('2d')!;
    this.nextCtx = this.nextCanvasRef.nativeElement.getContext('2d')!;
    document.addEventListener('keydown', this.handleInput.bind(this));
    this.drawBackground();
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleInput.bind(this));
    clearTimeout(this.gameLoopId);
  }

  fetchLeaderboard() {
    this.api.getLeaderboard('brick-arrange').subscribe(lb => this.leaderboard = lb);
  }

  drawBackground() {
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, 300, 600);
    // Draw subtle grid lines
    this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for(let i=0; i<COLS; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * BLOCK_SIZE, 0);
      this.ctx.lineTo(i * BLOCK_SIZE, 600);
      this.ctx.stroke();
    }
    for(let i=0; i<ROWS; i++) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, i * BLOCK_SIZE);
        this.ctx.lineTo(300, i * BLOCK_SIZE);
        this.ctx.stroke();
      }
  }

  startGame() {
    this.grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    this.score = 0;
    this.level = 1;
    this.linesCleared = 0;
    this.dropInterval = 1000;
    this.isGameOver = false;
    this.isPlaying = true;
    this.nextPiece = this.generatePiece();
    this.spawnPiece();
    this.gameLoop();
  }

  generatePiece() {
      const typeId = Math.floor(Math.random() * SHAPES.length);
      return {
          shape: SHAPES[typeId],
          color: COLORS[typeId],
          x: 3,
          y: 0
      };
  }

  spawnPiece() {
    this.currentPiece = this.nextPiece;
    this.nextPiece = this.generatePiece();
    
    if (this.collides(this.currentPiece)) {
      this.gameOver();
    }
    this.drawNext();
  }

  collides(piece: any, ox = 0, oy = 0): boolean {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const nx = piece.x + x + ox;
          const ny = piece.y + y + oy;
          if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && this.grid[ny][nx])) {
            return true;
          }
        }
      }
    }
    return false;
  }

  rotate(piece: any) {
    const newShape = piece.shape[0].map((_: any, index: any) =>
      piece.shape.map((row: any) => row[index]).reverse()
    );
    const originalShape = piece.shape;
    piece.shape = newShape;
    if (this.collides(piece)) {
      piece.shape = originalShape;
    }
  }

  handleInput(e: KeyboardEvent) {
    if (!this.isPlaying || this.isAnimating) return;
    if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
    }
    switch(e.key) {
      case 'ArrowLeft': if (!this.collides(this.currentPiece, -1, 0)) this.currentPiece.x--; break;
      case 'ArrowRight': if (!this.collides(this.currentPiece, 1, 0)) this.currentPiece.x++; break;
      case 'ArrowDown': this.drop(); break;
      case 'ArrowUp': this.rotate(this.currentPiece); break;
      case ' ': while (!this.collides(this.currentPiece, 0, 1)) this.currentPiece.y++; this.drop(); break;
    }
    this.draw();
  }

  drop() {
    if (this.isAnimating) return;
    if (!this.collides(this.currentPiece, 0, 1)) {
      this.currentPiece.y++;
    } else {
      this.lockPiece();
    }
    this.draw();
  }

  lockPiece() {
    this.currentPiece.shape.forEach((row: number[], y: number) => {
      row.forEach((val, x) => {
        if (val) this.grid[this.currentPiece.y + y][this.currentPiece.x + x] = 1; // Simplification: store just existence
      });
    });
    this.clearLines();
    // Auto save session
    this.api.saveSession('brick-arrange', JSON.stringify({ grid: this.grid, score: this.score }), this.score).subscribe();
  }

  clearLines() {
    const fullRows: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      if (this.grid[y].every(v => v !== 0)) {
        fullRows.push(y);
      }
    }

    if (fullRows.length > 0) {
      this.isAnimating = true;
      this.animatingRows = fullRows;
      this.draw(); // Immediate draw to show flash

      setTimeout(() => {
        let count = 0;
        // Process the rows from top down to avoid index shift issues during removal
        // but it's easier to just rebuild the grid for simultaneous rows
        const newGrid: number[][] = [];
        let rowsToRemove = 0;
        
        for (let y = 0; y < ROWS; y++) {
          if (this.grid[y].every(v => v !== 0)) {
            rowsToRemove++;
          } else {
            newGrid.push([...this.grid[y]]);
          }
        }
        
        while (newGrid.length < ROWS) {
          newGrid.unshift(Array(COLS).fill(0));
        }
        
        this.grid = newGrid;
        
        this.score += [0, 100, 300, 500, 800][rowsToRemove] * this.level;
        this.linesCleared += rowsToRemove;
        if (this.linesCleared >= this.level * 5) {
          this.level++;
          this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
        }

        this.isAnimating = false;
        this.animatingRows = [];
        this.spawnPiece();
        this.draw();
      }, 250);
    } else {
      this.spawnPiece();
    }
  }

  gameLoop() {
    if (!this.isPlaying) return;
    this.drop();
    this.gameLoopId = setTimeout(() => this.gameLoop(), this.dropInterval);
  }

  draw() {
    this.drawBackground();
    
    // Draw cells
    for(let y=0; y<ROWS; y++) {
      const isAnimatingRow = this.animatingRows.includes(y);
      for(let x=0; x<COLS; x++) {
        if(this.grid[y][x]) {
          if (isAnimatingRow) {
              this.drawBlock(x, y, '#fff'); // White flash
          } else {
              this.drawBlock(x, y, '#444');
          }
        }
      }
    }
    
    // Draw current piece
    if (this.currentPiece) {
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = this.currentPiece.color;
      this.currentPiece.shape.forEach((row: any, y: any) => {
        row.forEach((val: any, x: any) => {
          if (val) {
            this.drawBlock(this.currentPiece.x + x, this.currentPiece.y + y, this.currentPiece.color);
          }
        });
      });
      this.ctx.shadowBlur = 0;
    }
  }

  drawBlock(x: number, y: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    // Bevel look
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.strokeRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
  }

  drawNext() {
      if (!this.nextCtx) return;
      this.nextCtx.clearRect(0, 0, 120, 120);
      this.nextCtx.shadowBlur = 10;
      this.nextCtx.shadowColor = this.nextPiece.color;
      this.nextCtx.fillStyle = this.nextPiece.color;

      // Center the shape in the 4x4 grid (120x120 area, 30px blocks)
      const xOffset = (120 - this.nextPiece.shape[0].length * BLOCK_SIZE) / 2;
      const yOffset = (120 - this.nextPiece.shape.length * BLOCK_SIZE) / 2;

      this.nextPiece.shape.forEach((row: any, y: any) => {
          row.forEach((val: any, x: any) => {
              if (val) {
                  this.nextCtx.fillRect(xOffset + x * BLOCK_SIZE + 1, yOffset + y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
                  this.nextCtx.strokeStyle = 'rgba(255,255,255,0.2)';
                  this.nextCtx.strokeRect(xOffset + x * BLOCK_SIZE + 2, yOffset + y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
              }
          });
      });
      this.nextCtx.shadowBlur = 0;
  }

  gameOver() {
    this.isPlaying = false;
    this.isGameOver = true;
    this.api.endSession('brick-arrange', this.score).subscribe(() => this.fetchLeaderboard());
    this.cdr.detectChanges();
  }
}
