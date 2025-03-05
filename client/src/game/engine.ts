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
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.physics = new PhysicsEngine();
    this.renderer = new GameRenderer(canvas);
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/game-ws`;
    
    // Set up movement tracking
    this.setupMovementHandling();

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

  private setupMovementHandling() {
    // Track movement state
    const movementState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jumping: false,
      direction: 0 // Rotation in radians
    };
    
    // Listen for movement events
    this.on("move", ({ direction, active }) => {
      movementState[direction] = active;
      
      // Send movement updates to server
      this.sendMovementUpdate(movementState);
    });
    
    // Listen for jump events
    this.on("jump", (active) => {
      movementState.jumping = active;
      this.sendEvent({ type: 'jump', active });
    });
    
    // Set up continuous movement updates
    setInterval(() => {
      if (movementState.forward || movementState.backward || 
          movementState.left || movementState.right) {
        this.sendMovementUpdate(movementState);
      }
    }, 50); // Send updates every 50ms when moving
  }
  
  private sendMovementUpdate(movementState) {
    // Calculate direction and movement
    let x = 0;
    let y = 0;
    let rotation = 0;
    
    if (movementState.forward) y -= 1;
    if (movementState.backward) y += 1;
    if (movementState.left) {
      x -= 1;
      rotation -= 0.05;
    }
    if (movementState.right) {
      x += 1;
      rotation += 0.05;
    }
    
    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const magnitude = Math.sqrt(x*x + y*y);
      x /= magnitude;
      y /= magnitude;
    }
    
    // Send the movement event
    if (x !== 0 || y !== 0 || rotation !== 0) {
      this.sendEvent({ type: 'move', x, y, rotation });
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
      
      // Dispatch player stats for UI
      if (this.playerId && this.state.players) {
        const players = Array.isArray(this.state.players) 
          ? this.state.players 
          : Array.from(this.state.players.values());
        
        const currentPlayer = players.find(p => p.id === this.playerId);
        if (currentPlayer) {
          window.dispatchEvent(new CustomEvent('playerStatsUpdated', {
            detail: {
              player: currentPlayer
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  }

  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) return;
    const callbacks = this.eventListeners.get(event) || [];
    this.eventListeners.set(
      event,
      callbacks.filter(cb => cb !== callback)
    );
  }

  emit(event: string, ...args: any[]) {
    if (!this.eventListeners.has(event)) return;
    const callbacks = this.eventListeners.get(event) || [];
    callbacks.forEach(callback => callback(...args));
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

export { GameEngine };