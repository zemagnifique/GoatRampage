import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { type GameState, type GameEvent, type PlayerState, type EnvironmentObject, EntityType } from "@shared/schema";

const TICK_RATE = 60;
const RESPAWN_TIME = 120000; // 2 minutes

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ 
    noServer: true,
    perMessageDeflate: false
  });

  // Game state
  const gameState: GameState = {
    players: new Map<string, PlayerState>(),
    environment: generateInitialEnvironment()
  };

  // Game loop
  const gameLoop = setInterval(() => {
    try {
      updateGameState(gameState);
      broadcastGameState(wss, gameState);
    } catch (error) {
      console.error("Error in game loop:", error);
    }
  }, 1000 / TICK_RATE);

  // Handle WebSocket upgrade requests
  httpServer.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log("New WebSocket connection established");
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    let playerId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const event: GameEvent = JSON.parse(data.toString());
        console.log("Received event:", event);

        switch (event.type) {
          case 'join':
            const player = await handlePlayerJoin(event.tag, ws);
            if (player) {
              playerId = player.id.toString();
              gameState.players.set(playerId, {
                id: playerId,
                tag: player.tag,
                x: Math.random() * 800 + 100,
                y: Math.random() * 600 + 100,
                direction: 0,
                health: 100,
                score: 0,
                isCharging: false
              });
              console.log(`Player ${playerId} (${player.tag}) joined the game`);
            }
            break;

          case 'move':
            if (playerId && gameState.players.has(playerId)) {
              const player = gameState.players.get(playerId)!;
              player.x = event.x;
              player.y = event.y;
            }
            break;

          case 'charge':
            if (playerId && gameState.players.has(playerId)) {
              const player = gameState.players.get(playerId)!;
              player.isCharging = event.active;
            }
            break;

          case 'leave':
            if (playerId) {
              gameState.players.delete(playerId);
              console.log(`Player ${playerId} left the game`);
            }
            break;
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });

    ws.on('close', () => {
      if (playerId) {
        gameState.players.delete(playerId);
        console.log(`Player ${playerId} disconnected`);
      }
    });

    ws.on('error', (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Cleanup on server shutdown
  httpServer.on('close', () => {
    clearInterval(gameLoop);
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
    console.error("Error handling player join:", error);
    ws.close();
    return null;
  }
}

function generateInitialEnvironment(): EnvironmentObject[] {
  const environment: EnvironmentObject[] = [];

  // Add fences around the map
  for (let x = 0; x < 1000; x += 100) {
    environment.push({
      id: `fence-top-${x}`,
      type: EntityType.FENCE,
      x,
      y: 0,
      width: 100,
      height: 20,
      health: 100
    });

    environment.push({
      id: `fence-bottom-${x}`,
      type: EntityType.FENCE,
      x,
      y: 780,
      width: 100,
      height: 20,
      health: 100
    });
  }

  // Add some hay bales
  for (let i = 0; i < 5; i++) {
    environment.push({
      id: `hay-${i}`,
      type: EntityType.HAY_BALE,
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100,
      width: 40,
      height: 40,
      health: 100,
      respawnTime: RESPAWN_TIME
    });
  }

  return environment;
}

function updateGameState(state: GameState) {
  // Update destructible objects
  state.environment = state.environment.filter(obj => {
    if (obj.health <= 0 && obj.respawnTime) {
      // Schedule respawn
      setTimeout(() => {
        state.environment.push({
          ...obj,
          health: 100
        });
      }, obj.respawnTime);
      return false;
    }
    return true;
  });
}

// Convert Map to array before sending
function broadcastGameState(wss: WebSocketServer, state: GameState) {
  const serializedState = {
    players: Array.from(state.players.entries()).map(([id, player]) => ({
      id,
      ...player
    })),
    environment: state.environment
  };

  const payload = JSON.stringify(serializedState);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (error) {
        console.error("Error broadcasting state to client:", error);
      }
    }
  });
}