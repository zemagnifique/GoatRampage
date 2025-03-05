import { type GameState, type GameEvent } from "@shared/schema";
import { PhysicsEngine } from "./physics";
import { GameRenderer } from "./renderer";

export class GameEngine {
  private socket: WebSocket;
  private state: GameState | null = null;
  private physics: PhysicsEngine;
  private renderer: GameRenderer;
  private playerId: string | null = null;
  private connectionReady: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.socket = new WebSocket(wsUrl);
    this.physics = new PhysicsEngine();
    this.renderer = new GameRenderer(canvas);

    // Setup WebSocket event handlers
    this.socket.onopen = () => {
      console.log("WebSocket connection established");
      this.connectionReady = true;
    };

    this.socket.onclose = () => {
      console.log("WebSocket connection closed");
      this.connectionReady = false;
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.connectionReady = false;
    };

    this.socket.onmessage = (event) => {
      try {
        this.state = JSON.parse(event.data);
        this.update();
      } catch (error) {
        console.error("Error parsing game state:", error);
      }
    };
  }

  private sendEvent(event: GameEvent) {
    if (!this.connectionReady) {
      console.warn("WebSocket not ready, waiting for connection...");
      setTimeout(() => this.sendEvent(event), 100);
      return;
    }
    this.socket.send(JSON.stringify(event));
  }

  join(tag: string) {
    const event: GameEvent = { type: 'join', tag };
    this.sendEvent(event);
  }

  move(x: number, y: number) {
    const event: GameEvent = { type: 'move', x, y };
    this.sendEvent(event);
  }

  charge(active: boolean) {
    const event: GameEvent = { type: 'charge', active };
    this.sendEvent(event);
  }

  private update() {
    if (!this.state) return;

    this.physics.update(this.state);
    this.renderer.render(this.state);
  }

  destroy() {
    if (this.socket.readyState === WebSocket.OPEN) {
      const event: GameEvent = { type: 'leave' };
      this.sendEvent(event);
    }
    this.socket.close();
  }
}