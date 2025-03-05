import { type GameState, type PlayerState, type EnvironmentObject } from "@shared/schema";

export class PhysicsEngine {
  private readonly CHARGE_SPEED = 5;
  private readonly WALK_SPEED = 2;
  private readonly COLLISION_DAMAGE = 20;
  private readonly PLAYER_RADIUS = 25;

  update(state: GameState) {
    this.updatePlayerMovement(state);
    this.checkCollisions(state);
  }

  private updatePlayerMovement(state: GameState) {
    Array.from(state.players.values()).forEach(player => {
      const speed = player.isCharging ? this.CHARGE_SPEED : this.WALK_SPEED;
      // Update player position based on input and speed
    });
  }

  private checkCollisions(state: GameState) {
    const players = Array.from(state.players.values());

    // Check player-player collisions
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        if (this.checkPlayerCollision(players[i], players[j])) {
          // Handle collision damage
          if (players[i].isCharging) {
            // Apply damage to player j
          }
          if (players[j].isCharging) {
            // Apply damage to player i
          }
        }
      }

      // Check player-environment collisions
      state.environment.forEach(obj => {
        if (this.checkEnvironmentCollision(players[i], obj)) {
          // Handle environment collision
        }
      });
    }
  }

  private checkPlayerCollision(p1: PlayerState, p2: PlayerState): boolean {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.PLAYER_RADIUS * 2;
  }

  private checkEnvironmentCollision(player: PlayerState, obj: EnvironmentObject): boolean {
    return (
      player.x - this.PLAYER_RADIUS < obj.x + obj.width &&
      player.x + this.PLAYER_RADIUS > obj.x &&
      player.y - this.PLAYER_RADIUS < obj.y + obj.height &&
      player.y + this.PLAYER_RADIUS > obj.y
    );
  }
}