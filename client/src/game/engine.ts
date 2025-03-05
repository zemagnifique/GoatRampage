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
  private connectionAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 1000;

  constructor(canvas: HTMLCanvasElement) {
    this.physics = new PhysicsEngine();
    this.renderer = new GameRenderer(canvas);
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/game-ws`;

    console.log("Attempting to connect to WebSocket at:", wsUrl);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("WebSocket connection established");
        this.connectionReady = true;
        this.connectionAttempts = 0;
      };

      this.socket.onclose = () => {
        console.log("WebSocket connection closed");
        this.connectionReady = false;

        if (this.connectionAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.connectionAttempts++;
          console.log(`Reconnecting... Attempt ${this.connectionAttempts}`);
          setTimeout(() => this.initializeWebSocket(), this.RECONNECT_DELAY * this.connectionAttempts);
        }
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.connectionReady = false;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'init') {
            this.playerId = data.playerId;
            const players = new Map(data.state.players.map((p: any) => [p.id, p]));
            this.state = {
              players,
              environment: data.state.environment
            };
          } else {
            const players = new Map(data.players.map((p: any) => [p.id, p]));
            this.state = {
              players,
              environment: data.environment
            };
          }

          this.update();
        } catch (error) {
          console.error("Error processing game state:", error);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
    }
  }

  private sendEvent(event: GameEvent) {
    if (!this.connectionReady || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not ready, waiting for connection...");
      if (this.socket.readyState === WebSocket.CONNECTING) {
        setTimeout(() => this.sendEvent(event), 500);
      }
      return;
    }

    try {
      this.socket.send(JSON.stringify(event));
    } catch (error) {
      console.error("Error sending event:", error);
    }
  }

  join(tag: string) {
    console.log("Attempting to join game with tag:", tag);
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

    try {
      this.physics.update(this.state);
      this.renderer.render(this.state);
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  }

  destroy() {
    if (this.socket.readyState === WebSocket.OPEN) {
      const event: GameEvent = { type: 'leave' };
      this.sendEvent(event);
    }
    this.socket.close();
    this.renderer.dispose();
  }
}