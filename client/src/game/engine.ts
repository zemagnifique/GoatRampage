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
    this.physics = new PhysicsEngine();
    this.renderer = new GameRenderer(canvas);
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      this.socket = new WebSocket(`${wsProtocol}//${wsHost}`);

      console.log('Attempting WebSocket connection...');

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.connectionReady = true;
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.connectionReady = false;
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionReady = false;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || !data.players) {
            console.warn('Received invalid game state:', data);
            return;
          }

          // Convert array back to Map
          const players = new Map(data.players.map((player: any) => [player.id, player]));
          this.state = {
            players,
            environment: data.environment
          };

          this.update();
        } catch (error) {
          console.error('Error parsing game state:', error);
        }
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  private sendEvent(event: GameEvent) {
    if (!this.connectionReady || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready, waiting for connection...');
      return;
    }

    try {
      this.socket.send(JSON.stringify(event));
    } catch (error) {
      console.error('Error sending event:', error);
    }
  }

  join(tag: string) {
    console.log('Attempting to join game with tag:', tag);
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
      console.error('Error updating game state:', error);
    }
  }

  destroy() {
    if (this.socket.readyState === WebSocket.OPEN) {
      const event: GameEvent = { type: 'leave' };
      this.sendEvent(event);
      this.socket.close();
    }
  }
}