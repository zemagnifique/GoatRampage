import { type Player, type InsertPlayer, type GameState, type PlayerState, type EnvironmentObject } from "@shared/schema";

export interface IStorage {
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayerByTag(tag: string): Promise<Player | undefined>;
  updatePlayerStats(id: number, damageDealt: number, distanceWalked: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private players: Map<number, Player>;
  private currentId: number;
  
  constructor() {
    this.players = new Map();
    this.currentId = 1;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.currentId++;
    const player: Player = {
      id,
      tag: insertPlayer.tag,
      totalDamageDealt: 0,
      totalDistanceWalked: 0
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayerByTag(tag: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find(
      (player) => player.tag === tag
    );
  }

  async updatePlayerStats(id: number, damageDealt: number, distanceWalked: number): Promise<void> {
    const player = this.players.get(id);
    if (player) {
      player.totalDamageDealt += damageDealt;
      player.totalDistanceWalked += distanceWalked;
      this.players.set(id, player);
    }
  }
}

export const storage = new MemStorage();
