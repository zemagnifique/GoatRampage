import { type GameState, type PlayerState, type EnvironmentObject } from "@shared/schema";

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private goatSprites: HTMLImageElement[];
  private environmentSprites: HTMLImageElement[];
  private spritesLoaded: boolean = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    // Load sprites
    this.goatSprites = [];
    this.environmentSprites = [];

    // Load goat sprites
    Promise.all([
      this.loadSprite("goat1.png"),
      this.loadSprite("goat2.png"),
      // Add more sprite loading as needed
    ]).then(sprites => {
      this.goatSprites = sprites;
      this.spritesLoaded = true;
    });
  }

  private loadSprite(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = path;
    });
  }

  render(state: GameState) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw environment
    state.environment.forEach(obj => {
      this.drawEnvironmentObject(obj);
    });

    // Draw players
    Array.from(state.players.values()).forEach(player => {
      this.drawPlayer(player);
    });

    // Draw UI elements
    this.drawUI(state);
  }

  private drawPlayer(player: PlayerState) {
    // Draw player circle as fallback if sprites aren't loaded
    this.ctx.beginPath();
    this.ctx.arc(player.x, player.y, 25, 0, Math.PI * 2);
    this.ctx.fillStyle = player.isCharging ? 'red' : 'white';
    this.ctx.fill();

    // Draw health bar
    const healthWidth = 50;
    const healthHeight = 5;
    this.ctx.fillStyle = `rgb(${255 - player.health * 2.55}, ${player.health * 2.55}, 0)`;
    this.ctx.fillRect(
      player.x - healthWidth / 2,
      player.y - 40,
      (healthWidth * player.health) / 100,
      healthHeight
    );

    // Draw player tag
    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(player.tag, player.x, player.y - 45);
  }

  private drawEnvironmentObject(obj: EnvironmentObject) {
    this.ctx.fillStyle = 'gray';
    this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  }

  private drawUI(state: GameState) {
    // Draw score
    this.ctx.fillStyle = 'white';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${Array.from(state.players.values())[0]?.score || 0}`, 10, 30);
  }
}