import { type GameState, type GameEvent } from "@shared/schema";
import { PhysicsEngine } from "./physics";
import { GameRenderer } from "./renderer";

export class GameEngine {
  private socket: WebSocket;
  private state: GameState | null = null;
  private physics: PhysicsEngine;
  private renderer: GameRenderer;
  private playerId: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.socket = new WebSocket(wsUrl);
    this.physics = new PhysicsEngine();
    this.renderer = new GameRenderer(canvas);

    this.socket.onmessage = (event) => {
      this.state = JSON.parse(event.data);
      this.update();
    };
  }

  join(tag: string) {
    const event: GameEvent = { type: 'join', tag };
    this.socket.send(JSON.stringify(event));
  }

  move(x: number, y: number) {
    const event: GameEvent = { type: 'move', x, y };
    this.socket.send(JSON.stringify(event));
  }

  charge(active: boolean) {
    const event: GameEvent = { type: 'charge', active };
    this.socket.send(JSON.stringify(event));
  }

  private update() {
    if (!this.state) return;
    
    this.physics.update(this.state);
    this.renderer.render(this.state);
  }

  destroy() {
    this.socket.close();
  }
}
