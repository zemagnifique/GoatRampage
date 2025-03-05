import { type GameState } from "@shared/schema";

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private goatSprites: HTMLImageElement[];
  private environmentSprites: HTMLImageElement[];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.goatSprites = [
      "photo-1532633378163-24c2c0da3c99",
      "photo-1524024973431-2ad916746881",
      "photo-1521388316693-6a0e8d6f2327",
      "photo-1513494620969-1e35db419529",
      "photo-1542481018-230d347a0af9",
      "photo-1499115421298-dc3b4fe66c58"
    ].map(this.loadSprite);

    this.environmentSprites = [
      "photo-1699818709789-4377d01b61f6",
      "photo-1723155632440-abd5b668173a",
      "photo-1721152531946-040f73b312e2"
    ].map(this.loadSprite);
  }

  private loadSprite(url: string): HTMLImageElement {
    const img = new Image();
    img.src = `https://images.unsplash.com/${url}`;
    return img;
  }

  render(state: GameState) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw environment
    state.environment.forEach(obj => {
      this.drawEnvironmentObject(obj);
    });

    // Draw players
    state.players.forEach(player => {
      this.drawPlayer(player);
    });

    // Draw UI
    this.drawUI(state);
  }

  private drawPlayer(player: any) {
    const sprite = this.goatSprites[0]; // Use appropriate sprite based on player state
    this.ctx.drawImage(sprite, player.x, player.y, 50, 50);
    
    // Draw health bar
    this.ctx.fillStyle = `rgb(${255 - player.health * 2.55}, ${player.health * 2.55}, 0)`;
    this.ctx.fillRect(player.x, player.y - 10, player.health / 2, 5);
    
    // Draw player tag
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(player.tag, player.x, player.y - 15);
  }

  private drawEnvironmentObject(obj: any) {
    const sprite = this.environmentSprites[0]; // Use appropriate sprite based on object type
    this.ctx.drawImage(sprite, obj.x, obj.y, obj.width, obj.height);
  }

  private drawUI(state: GameState) {
    // Draw score and other UI elements
    this.ctx.fillStyle = 'white';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Score: ${Array.from(state.players.values())[0]?.score || 0}`, 10, 30);
  }
}
