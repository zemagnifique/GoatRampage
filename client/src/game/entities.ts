import { type PlayerState, type EnvironmentObject } from "@shared/schema";

export enum EntityType {
  PLAYER = 'player',
  FENCE = 'fence',
  HAY_BALE = 'hay_bale',
  BARN = 'barn',
  HOUSE = 'house',
  CAR = 'car'
}

export interface Entity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  health: number;
  sprite: number;
}

export class Player implements Entity {
  id: string;
  type: EntityType = EntityType.PLAYER;
  x: number;
  y: number;
  width: number = 50;
  height: number = 50;
  rotation: number = 0;
  health: number;
  sprite: number;
  velocity: { x: number; y: number } = { x: 0, y: 0 };
  isCharging: boolean = false;
  chargeVelocity: number = 0;
  score: number = 0;
  tag: string;

  static readonly MAX_HEALTH = 100;
  static readonly CHARGE_SPEED = 8;
  static readonly NORMAL_SPEED = 4;
  static readonly CHARGE_DAMAGE = 25;
  static readonly COLLISION_DAMAGE = 10;

  constructor(state: PlayerState) {
    this.id = state.id;
    this.x = state.x;
    this.y = state.y;
    this.health = state.health;
    this.sprite = Math.floor(Math.random() * 6); // Random goat sprite
    this.tag = state.tag;
    this.isCharging = state.isCharging;
    this.score = state.score;
  }

  update(delta: number) {
    // Update position based on velocity
    this.x += this.velocity.x * delta;
    this.y += this.velocity.y * delta;

    // Update charge state
    if (this.isCharging) {
      this.chargeVelocity = Player.CHARGE_SPEED;
    } else {
      this.chargeVelocity = Math.max(0, this.chargeVelocity - delta * 2);
    }

    // Calculate rotation based on movement direction
    if (this.velocity.x !== 0 || this.velocity.y !== 0) {
      this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
    }
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }
}

export class EnvironmentEntity implements Entity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  health: number;
  sprite: number;
  respawnTime?: number;
  isDestroyed: boolean = false;

  static readonly DEFAULT_HEALTH = 100;

  constructor(obj: EnvironmentObject) {
    this.id = obj.id;
    this.type = obj.type as EntityType;
    this.x = obj.x;
    this.y = obj.y;
    this.width = obj.width;
    this.height = obj.height;
    this.rotation = 0;
    this.health = obj.health;
    this.sprite = this.getSpriteIndexForType();
    this.respawnTime = obj.respawnTime;
  }

  private getSpriteIndexForType(): number {
    switch (this.type) {
      case EntityType.FENCE:
        return 0;
      case EntityType.HAY_BALE:
        return 1;
      case EntityType.BARN:
        return 2;
      case EntityType.HOUSE:
        return 3;
      case EntityType.CAR:
        return 4;
      default:
        return 0;
    }
  }

  takeDamage(amount: number) {
    if (this.isDestroyed) return false;
    
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDestroyed = true;
      return true;
    }
    return false;
  }

  respawn() {
    this.health = EnvironmentEntity.DEFAULT_HEALTH;
    this.isDestroyed = false;
  }
}

export class Car extends EnvironmentEntity {
  private readonly SPEED = 2;
  private pathPoints: Array<{x: number, y: number}>;
  private currentPathIndex: number = 0;

  constructor(obj: EnvironmentObject, path: Array<{x: number, y: number}>) {
    super(obj);
    this.pathPoints = path;
    this.type = EntityType.CAR;
  }

  update(delta: number) {
    if (this.isDestroyed) return;

    const target = this.pathPoints[this.currentPathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      // Move to next path point
      this.currentPathIndex = (this.currentPathIndex + 1) % this.pathPoints.length;
    } else {
      // Move towards current target
      this.x += (dx / distance) * this.SPEED * delta;
      this.y += (dy / distance) * this.SPEED * delta;
      this.rotation = Math.atan2(dy, dx);
    }
  }
}

export function createEnvironmentObject(
  type: EntityType,
  x: number,
  y: number,
  width: number,
  height: number
): EnvironmentObject {
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    x,
    y,
    width,
    height,
    health: EnvironmentEntity.DEFAULT_HEALTH
  };
}
