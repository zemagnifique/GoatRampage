import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { type GameState, type GameEvent, type PlayerState, type EnvironmentObject, EntityType } from "@shared/schema";

const TICK_RATE = 60;
const RESPAWN_TIME = 120000; // 2 minutes

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Configure WebSocket server with more explicit settings
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/game-ws',
    perMessageDeflate: false,
    clientTracking: true
  });

  // Game state
  const gameState: GameState = {
    players: new Map<string, PlayerState>(),
    environment: generateInitialEnvironment(),
    statistics: {
      damageDealt: new Map<string, number>(),
      distanceWalked: new Map<string, number>()
    }
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

  wss.on('connection', (ws, req) => {
    console.log("New WebSocket connection established from:", req.url);
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
                isCharging: false,
                damageDealt: 0,
                distanceWalked: 0,
                lastPosition: { x: Math.random() * 800 + 100, y: Math.random() * 600 + 100 }
              });
              gameState.statistics.damageDealt.set(playerId, 0);
              gameState.statistics.distanceWalked.set(playerId, 0);
              console.log(`Player ${playerId} (${player.tag}) joined the game`);

              // Send initial state to the player
              ws.send(JSON.stringify({
                type: 'init',
                playerId,
                state: {
                  players: Array.from(gameState.players.entries()).map(([id, player]) => ({
                    id,
                    ...player
                  })),
                  environment: gameState.environment
                }
              }));
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
      if (playerId) {
        gameState.players.delete(playerId);
      }
    });
  });

  // Convert Map to array before sending
  function broadcastGameState(wss: WebSocketServer, state: GameState) {
    const serializedState = {
      players: Array.from(state.players.entries()).map(([id, player]) => ({
        id,
        ...player
      })),
      environment: state.environment,
      statistics: {
        damageDealt: Array.from(state.statistics.damageDealt.entries()),
        distanceWalked: Array.from(state.statistics.distanceWalked.entries())
      }
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

  // Cleanup on server shutdown
  httpServer.on('close', () => {
    clearInterval(gameLoop);
    wss.close();
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
  const MAP_WIDTH = 2000;
  const MAP_HEIGHT = 1500;

  // Add fences around the map
  for (let x = 0; x < MAP_WIDTH; x += 100) {
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
      y: MAP_HEIGHT - 20,
      width: 100,
      height: 20,
      health: 100
    });
  }

  for (let y = 0; y < MAP_HEIGHT; y += 100) {
    environment.push({
      id: `fence-left-${y}`,
      type: EntityType.FENCE,
      x: 0,
      y,
      width: 20,
      height: 100,
      health: 100
    });

    environment.push({
      id: `fence-right-${y}`,
      type: EntityType.FENCE,
      x: MAP_WIDTH - 20,
      y,
      width: 20,
      height: 100,
      health: 100
    });
  }

  // Add hay bales - destructible
  for (let i = 0; i < 20; i++) {
    environment.push({
      id: `hay-${i}`,
      type: EntityType.HAY_BALE,
      x: Math.random() * (MAP_WIDTH - 200) + 100,
      y: Math.random() * (MAP_HEIGHT - 200) + 100,
      width: 40,
      height: 40,
      health: 100,
      respawnTime: RESPAWN_TIME
    });
  }

  // Add houses - small town area
  const TOWN_CENTER_X = MAP_WIDTH / 2;
  const TOWN_CENTER_Y = MAP_HEIGHT / 2;
  
  // Create a small town with houses
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const distance = 250;
    const x = TOWN_CENTER_X + Math.cos(angle) * distance;
    const y = TOWN_CENTER_Y + Math.sin(angle) * distance;
    
    environment.push({
      id: `house-${i}`,
      type: EntityType.HOUSE,
      x,
      y,
      width: 100,
      height: 100,
      health: 200
    });
  }

  // Add barns - farm area
  const FARM_CENTER_X = MAP_WIDTH / 4;
  const FARM_CENTER_Y = MAP_HEIGHT / 4;
  
  for (let i = 0; i < 3; i++) {
    environment.push({
      id: `barn-${i}`,
      type: EntityType.BARN,
      x: FARM_CENTER_X + (i * 150) - 150,
      y: FARM_CENTER_Y,
      width: 120,
      height: 80,
      health: 150,
      respawnTime: RESPAWN_TIME * 2
    });
  }

  // Add cars - can be pushed/moved
  for (let i = 0; i < 5; i++) {
    environment.push({
      id: `car-${i}`,
      type: EntityType.CAR,
      x: Math.random() * (MAP_WIDTH - 400) + 200,
      y: Math.random() * (MAP_HEIGHT - 400) + 200,
      width: 60,
      height: 30,
      health: 80,
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
  
  // Process player movements and collisions
  const players = Array.from(state.players.values());
  
  // Track distances and handle player collisions
  players.forEach(player => {
    // Skip if player has no last position
    if (!player.lastPosition) {
      player.lastPosition = { x: player.x, y: player.y };
      return;
    }
    
    // Calculate distance moved
    const dx = player.x - player.lastPosition.x;
    const dy = player.y - player.lastPosition.y;
    const distanceMoved = Math.sqrt(dx * dx + dy * dy);
    
    // Update distance tracking
    player.distanceWalked += distanceMoved;
    state.statistics.distanceWalked.set(player.id, player.distanceWalked);
    
    // Update storage periodically (every 100 units of distance)
    if (Math.floor(player.distanceWalked / 100) > 
        Math.floor((player.distanceWalked - distanceMoved) / 100)) {
      storage.updatePlayerStats(
        parseInt(player.id, 10), 
        0, // No damage in this update
        distanceMoved
      ).catch(err => console.error("Error updating player stats:", err));
    }
    
    // Update last position
    player.lastPosition = { x: player.x, y: player.y };
    
    // Handle charging collisions with other players
    if (player.isCharging) {
      players.forEach(otherPlayer => {
        // Skip self
        if (player.id === otherPlayer.id) return;
        
        // Check for collision
        const collisionDist = 50; // Collision distance
        const dx = player.x - otherPlayer.x;
        const dy = player.y - otherPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < collisionDist) {
          // Apply damage to other player
          const damage = 10; // Base damage
          otherPlayer.health -= damage;
          
          // Update score and damage dealt
          player.score += damage;
          player.damageDealt += damage;
          state.statistics.damageDealt.set(player.id, player.damageDealt);
          
          // Update persistent stats
          storage.updatePlayerStats(
            parseInt(player.id, 10),
            damage,
            0 // No distance in this update
          ).catch(err => console.error("Error updating player stats:", err));
          
          // Check if player was defeated
          if (otherPlayer.health <= 0) {
            otherPlayer.health = 100; // Respawn
            otherPlayer.x = Math.random() * 800 + 100;
            otherPlayer.y = Math.random() * 600 + 100;
            player.score += 50; // Bonus for defeating
          }
        }
      });
      
      // Check for collisions with environment
      state.environment.forEach(obj => {
        // Simple collision detection
        if (player.x + 25 > obj.x && 
            player.x - 25 < obj.x + obj.width &&
            player.y + 25 > obj.y && 
            player.y - 25 < obj.y + obj.height) {
          
          // Damage environment if charging
          if (player.isCharging) {
            const damage = 5; // Base damage to environment
            obj.health -= damage;
            
            // Update score based on type
            if (obj.type === EntityType.HAY_BALE) {
              player.score += 1;
            } else if (obj.type === EntityType.CAR) {
              player.score += 2;
            } else if (obj.type === EntityType.BARN) {
              player.score += 5;
            }
          }
        }
      });
    }
  });
}