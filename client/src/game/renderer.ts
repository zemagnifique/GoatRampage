import * as THREE from 'three';
import { type GameState, type PlayerState, type EnvironmentObject, EntityType } from "@shared/schema";

export class GameRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private models: Map<string, THREE.Object3D>;
  private lights: THREE.Light[];

  constructor(private canvas: HTMLCanvasElement) {
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Set up camera
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.set(0, 50, 100);
    this.camera.lookAt(0, 0, 0);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    // Initialize model storage
    this.models = new Map();

    // Set up lights
    this.lights = this.setupLights();
    this.lights.forEach(light => this.scene.add(light));

    // Create ground
    this.createGround();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private setupLights(): THREE.Light[] {
    const lights = [];

    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040);
    lights.push(ambient);

    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(100, 100, 100);
    sun.castShadow = true;
    lights.push(sun);

    return lights;
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x90EE90,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  render(state: GameState) {
    // Update player positions and rotations
    Array.from(state.players.values()).forEach(player => {
      this.updatePlayer(player);
    });

    // Update environment objects
    state.environment.forEach(obj => {
      this.updateEnvironmentObject(obj);
    });

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  private updatePlayer(player: PlayerState) {
    let model = this.models.get(player.id);

    if (!model) {
      // Create new player model if it doesn't exist
      const geometry = new THREE.BoxGeometry(2, 2, 3);
      const material = new THREE.MeshStandardMaterial({ 
        color: player.isCharging ? 0xff0000 : 0xffffff 
      });
      model = new THREE.Mesh(geometry, material);
      model.castShadow = true;
      this.scene.add(model);
      this.models.set(player.id, model);
    }

    // Update position and rotation
    model.position.set(player.x, 1, player.y);
    model.rotation.y = player.direction;
  }

  private updateEnvironmentObject(obj: EnvironmentObject) {
    let model = this.models.get(obj.id);

    if (!model) {
      // Create new environment object model
      model = this.createEnvironmentModel(obj);
      this.scene.add(model);
      this.models.set(obj.id, model);
    }

    // Update model state based on health
    if (obj.health <= 0) {
      this.scene.remove(model);
      this.models.delete(obj.id);
    }
  }

  private createEnvironmentModel(obj: EnvironmentObject): THREE.Object3D {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    let scale = new THREE.Vector3(1, 1, 1);

    switch (obj.type) {
      case EntityType.HOUSE:
        geometry = new THREE.BoxGeometry(10, 8, 10);
        material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        break;
      case EntityType.BARN:
        geometry = new THREE.BoxGeometry(15, 12, 20);
        material = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
        break;
      case EntityType.FENCE:
        geometry = new THREE.BoxGeometry(obj.width, 2, 0.5);
        material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        break;
      case EntityType.HAY_BALE:
        geometry = new THREE.CylinderGeometry(2, 2, 2, 32);
        material = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
        break;
      case EntityType.CAR:
        geometry = new THREE.BoxGeometry(6, 3, 4);
        material = new THREE.MeshStandardMaterial({ color: 0x0000FF });
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshStandardMaterial({ color: 0x808080 });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(obj.x, obj.height / 2, obj.y);
    mesh.scale.copy(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  // Clean up Three.js resources
  dispose() {
    this.models.forEach(model => {
      if (model instanceof THREE.Mesh) {
        model.geometry.dispose();
        if (Array.isArray(model.material)) {
          model.material.forEach(m => m.dispose());
        } else {
          model.material.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}