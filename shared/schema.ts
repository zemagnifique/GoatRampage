import { pgTable, text, serial, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
