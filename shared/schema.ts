import { pgTable, text, serial, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export enum EntityType {
  PLAYER = 'player',
  FENCE = 'fence',
  HAY_BALE = 'hay_bale',
  BARN = 'barn',
  HOUSE = 'house',
  CAR = 'car'
}

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  tag: text("tag").notNull().unique(),
  totalDamageDealt: integer("total_damage_dealt").notNull().default(0),
  totalDistanceWalked: real("total_distance_walked").notNull().default(0),
});

export type Player = typeof players.$inferSelect;

export const insertPlayerSchema = createInsertSchema(players).pick({
  tag: true,
});

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

// Game state types
export interface GameState {
  players: Map<string, PlayerState>;
  environment: EnvironmentObject[];
  statistics: {
    damageDealt: Map<string, number>;
    distanceWalked: Map<string, number>;
  };
}

export interface PlayerState {
  id: string;
  tag: string;
  x: number;
  y: number;
  direction: number;
  health: number;
  score: number;
  isCharging: boolean;
  damageDealt: number;
  distanceWalked: number;
  lastPosition?: { x: number, y: number };
}

export interface EnvironmentObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  respawnTime?: number;
}

export type GameEvent = 
  | { type: 'join', tag: string }
  | { type: 'move', x: number, y: number }
  | { type: 'charge', active: boolean }
  | { type: 'damage', target: string, amount: number }
  | { type: 'destroy', objectId: string }
  | { type: 'leave' };