import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { type GameState, type GameEvent, type PlayerState } from "@shared/schema";

const TICK_RATE = 60;
const RESPAWN_TIME = 120000; // 2 minutes

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Game state
  const gameState: GameState = {
    players: new Map<string, PlayerState>(),
    environment: generateInitialEnvironment()
  };

  // Game loop
  setInterval(() => {
    updateGameState(gameState);
    broadcastGameState(wss, gameState);
  }, 1000 / TICK_RATE);

  wss.on('connection', (ws) => {
    let playerId: string | null = null;

    ws.on('message', async (data) => {
      const event: GameEvent = JSON.parse(data.toString());

      switch (event.type) {
        case 'join':
          const player = await handlePlayerJoin(event.tag, ws);
          if (player) {
            playerId = player.id.toString();
            gameState.players.set(playerId, {
              id: playerId,
              tag: player.tag,
              x: Math.random() * 1000,
              y: Math.random() * 1000,
              direction: 0,
              health: 100,
              score: 0,
              isCharging: false
            });
          }
          break;

        case 'move':
          if (playerId) {
            const player = gameState.players.get(playerId);
            if (player) {
              player.x = event.x;
              player.y = event.y;
            }
          }
          break;

        case 'charge':
          if (playerId) {
            const player = gameState.players.get(playerId);
            if (player) {
              player.isCharging = event.active;
            }
          }
          break;

        case 'leave':
          if (playerId) {
            gameState.players.delete(playerId);
          }
          break;
      }
    });

    ws.on('close', () => {
      if (playerId) {
        gameState.players.delete(playerId);
      }
    });
  });

  return httpServer;
}

async function handlePlayerJoin(tag: string, ws: WebSocket): Promise<{ id: number, tag: string } | null> {
  try {
    const existingPlayer = await storage.getPlayerByTag(tag);
    if (existingPlayer) {
      return existingPlayer;
    }
    const newPlayer = await storage.createPlayer({ tag });
    return newPlayer;
  } catch (error) {
    ws.close();
    return null;
  }
}

function generateInitialEnvironment(): EnvironmentObject[] {
  // Generate initial environment objects (fences, hay bales, etc.)
  return [
    // Add environment objects here
  ];
}

function updateGameState(state: GameState) {
  // Update game physics, collisions, etc.
  // This is where the game logic would go
}

function broadcastGameState(wss: WebSocketServer, state: GameState) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(state));
    }
  });
}
