import * as THREE from 'three';
import { GameState, Player, EntityType, EnvironmentObject } from '@shared/schema';

export class Renderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private fallbackCtx?: CanvasRenderingContext2D;
  private models = new Map<string, THREE.Object3D>();
  private lights: THREE.Light[] = [];
  private textureLoader = new THREE.TextureLoader();
  private groundSize = 5000;

  constructor(private canvas: HTMLCanvasElement) {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near clipping plane
      10000 // Far clipping plane
    );
    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);

    // Try to create WebGL renderer
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      console.log("WebGL renderer created successfully");
    } catch (error) {
      console.warn("WebGL renderer creation failed, using fallback 2D canvas", error);
      this.fallbackCtx = this.canvas.getContext('2d');
    }

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
    this.lights.push(directionalLight);

    // Create ground
    this.createGround();

    // Handle resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
    if (this.fallbackCtx && this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private createGround() {
    const groundGeometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a9d23, // Green
      side: THREE.DoubleSide,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -0.5; // Position below players
    this.scene.add(ground);
  }

  private createPlayerObject(player: Player): THREE.Object3D {
    // Create a simple player representation
    const group = new THREE.Group();

    // Base
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0044ff });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.8;
    group.add(head);

    // Position and orientation
    group.position.set(player.x, 0.5, player.y);
    group.rotation.y = player.rotation || 0;

    return group;
  }

  private createEnvironmentObject(object: EnvironmentObject): THREE.Object3D {
    const group = new THREE.Group();

    let mesh: THREE.Mesh;

    // Create different geometries based on type
    switch (object.type) {
      case EntityType.TREE:
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1;
        group.add(trunk);

        // Leaves
        const leavesGeometry = new THREE.ConeGeometry(1.5, 3, 8);
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 3;
        group.add(leaves);
        break;

      case EntityType.ROCK:
        const rockGeometry = new THREE.DodecahedronGeometry(object.width / 2 || 1, 0);
        const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
        mesh = new THREE.Mesh(rockGeometry, rockMaterial);
        mesh.position.y = (object.height || 1) / 2;
        group.add(mesh);
        break;

      case EntityType.BUILDING:
        const buildingGeometry = new THREE.BoxGeometry(
          object.width || 2,
          object.height || 3,
          object.width || 2
        );
        const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0xDDDDDD });
        mesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
        mesh.position.y = (object.height || 3) / 2;
        group.add(mesh);
        break;

      default:
        const defaultGeometry = new THREE.BoxGeometry(1, 1, 1);
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
        mesh = new THREE.Mesh(defaultGeometry, defaultMaterial);
        mesh.position.y = 0.5;
        group.add(mesh);
    }

    // Position
    group.position.set(object.x, 0, object.y);

    return group;
  }

  private updateCamera(playerId: string, state: GameState) {
    // Find player
    let player: Player | undefined;

    if (Array.isArray(state.players)) {
      player = state.players.find(p => p.id === playerId);
    } else if (state.players instanceof Map) {
      player = state.players.get(playerId);
    }

    if (player) {
      // Third-person view
      this.camera.position.x = player.x - 10 * Math.cos(player.rotation || 0);
      this.camera.position.z = player.y - 10 * Math.sin(player.rotation || 0);
      this.camera.position.y = 10;
      this.camera.lookAt(player.x, 0, player.y);
    }
  }

  render(state: GameState) {
    try {
      if (!this.renderer && !this.fallbackCtx) return;

      // Clear existing models
      this.models.forEach((model) => {
        this.scene.remove(model);
      });
      this.models.clear();

      // Find the current player (first in list for now)
      let currentPlayerId = "";
      if (Array.isArray(state.players) && state.players.length > 0) {
        currentPlayerId = state.players[0].id;
      } else if (state.players instanceof Map && state.players.size > 0) {
        currentPlayerId = Array.from(state.players.keys())[0];
      }

      // Update camera to follow current player
      this.updateCamera(currentPlayerId, state);

      // Render players
      const players = Array.isArray(state.players) 
        ? state.players
        : Array.from(state.players.values());

      players.forEach(player => {
        try {
          const model = this.createPlayerObject(player);
          this.models.set(`player-${player.id}`, model);
          this.scene.add(model);
        } catch (error) {
          console.warn('Error creating player object:', error);
        }
      });

      // Render environment objects
      if (state.environment) {
        state.environment.forEach(object => {
          try {
            const model = this.createEnvironmentObject(object);
            this.models.set(`env-${object.id}`, model);
            this.scene.add(model);
          } catch (error) {
            console.warn('Error creating environment object:', error);
          }
        });
      }

      // Render using WebGL or fall back to 2D canvas
      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      } else if (this.fallbackCtx) {
        this.renderFallback(state, this.fallbackCtx);
      }
    } catch (error) {
      console.error('Error rendering scene:', error);
    }
  }

  private renderFallback(state: GameState, ctx: CanvasRenderingContext2D) {
    // Basic 2D rendering as fallback
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.fillStyle = '#3A9D23'; // Green
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    // Draw players
    const players = Array.isArray(state.players) 
      ? state.players
      : Array.from(state.players.values());

    players.forEach(player => {
      // Convert world coordinates to screen coordinates
      const screenX = canvas.width / 2 + player.x * 10;
      const screenY = canvas.height / 2 + player.y * 10;

      // Draw player
      ctx.beginPath();
      ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#0044FF';
      ctx.fill();

      // Draw direction indicator
      const dirX = screenX + Math.cos(player.rotation || 0) * 15;
      const dirY = screenY + Math.sin(player.rotation || 0) * 15;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(dirX, dirY);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw environment objects
    if (state.environment) {
      state.environment.forEach(object => {
        const screenX = canvas.width / 2 + object.x * 10;
        const screenY = canvas.height / 2 + object.y * 10;

        switch (object.type) {
          case EntityType.TREE:
            // Trunk
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX - 5, screenY - 20, 10, 20);
            // Leaves
            ctx.beginPath();
            ctx.arc(screenX, screenY - 30, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#228B22';
            ctx.fill();
            break;

          case EntityType.ROCK:
            ctx.beginPath();
            ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#888888';
            ctx.fill();
            break;

          case EntityType.BUILDING:
            ctx.fillStyle = '#DDDDDD';
            ctx.fillRect(
              screenX - (object.width || 20) / 2,
              screenY - (object.height || 30) / 2,
              object.width || 20,
              object.height || 30
            );
            break;
        }
      });
    }
  }

  dispose() {
    // Cleanup event listeners and resources
    window.removeEventListener('resize', this.handleResize.bind(this));

    // Dispose Three.js resources
    this.models.forEach(model => {
      this.scene.remove(model);
      if (model instanceof THREE.Mesh) {
        model.geometry.dispose();
        if (model.material instanceof THREE.Material) {
          model.material.dispose();
        } else if (Array.isArray(model.material)) {
          model.material.forEach(material => material.dispose());
        }
      }
    });

    this.models.clear();

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}