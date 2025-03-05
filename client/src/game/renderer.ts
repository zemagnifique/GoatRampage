import * as THREE from 'three';
import { type GameState, type PlayerState, type EnvironmentObject, EntityType } from "@shared/schema";

export class GameRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private models: Map<string, THREE.Object3D>;
  private lights: THREE.Light[];
  private textureLoader: THREE.TextureLoader;
  private groundSize = 2000;

  constructor(private canvas: HTMLCanvasElement) {
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize model storage
    this.models = new Map();
    this.textureLoader = new THREE.TextureLoader();

    // Set up lights
    this.lights = this.setupLights();
    this.lights.forEach(light => this.scene.add(light));

    // Create the environment
    this.createGround();
    this.createSkybox();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private setupLights(): THREE.Light[] {
    const lights = [];

    // Main directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(500, 500, 500);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 1500;
    sunLight.shadow.camera.left = -1000;
    sunLight.shadow.camera.right = 1000;
    sunLight.shadow.camera.top = 1000;
    sunLight.shadow.camera.bottom = -1000;
    lights.push(sunLight);

    // Ambient light to avoid complete darkness
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    lights.push(ambientLight);

    return lights;
  }

  private createGround() {
    // Create ground plane
    const groundTexture = this.textureLoader.load('/textures/grass.jpg');
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(20, 20);

    const groundMaterial = new THREE.MeshStandardMaterial({ 
      map: groundTexture,
      roughness: 0.8,
      metalness: 0.2
    });

    const groundGeometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Add some terrain variation
    this.addTerrainFeatures();
  }

  private addTerrainFeatures() {
    // Add some hills
    for (let i = 0; i < 10; i++) {
      const hillGeometry = new THREE.SphereGeometry(
        Math.random() * 30 + 20, 
        16, 16, 
        0, Math.PI * 2, 
        0, Math.PI / 2
      );

      const hillMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7cfc00, // Light green
        roughness: 0.9,
        metalness: 0.1
      });

      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      const x = Math.random() * this.groundSize - this.groundSize/2;
      const z = Math.random() * this.groundSize - this.groundSize/2;
      hill.position.set(x, -5, z); // Slightly below ground to smooth transition
      hill.receiveShadow = true;
      hill.castShadow = true;
      this.scene.add(hill);
    }

    // Add trees
    for (let i = 0; i < 50; i++) {
      const tree = this.createTree();
      const x = Math.random() * this.groundSize - this.groundSize/2;
      const z = Math.random() * this.groundSize - this.groundSize/2;
      tree.position.set(x, 0, z);
      this.scene.add(tree);
    }
  }

  private createTree() {
    const tree = new THREE.Group();

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(1, 2, 10, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513, // Brown
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 5;
    trunk.castShadow = true;
    tree.add(trunk);

    // Leaves
    const leavesGeometry = new THREE.ConeGeometry(6, 15, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x228b22, // Forest green
      roughness: 0.8
    });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 15;
    leaves.castShadow = true;
    tree.add(leaves);

    return tree;
  }

  private createSkybox() {
    const skyGeometry = new THREE.BoxGeometry(2000, 2000, 2000);
    const skyMaterials = [
      new THREE.MeshBasicMaterial({ 
        color: 0x87ceeb, // Sky blue
        side: THREE.BackSide 
      }),
      new THREE.MeshBasicMaterial({ 
        color: 0x87ceeb,
        side: THREE.BackSide 
      }),
      new THREE.MeshBasicMaterial({ 
        color: 0x87ceeb,
        side: THREE.BackSide 
      }),
      new THREE.MeshBasicMaterial({ 
        color: 0x87ceeb,
        side: THREE.BackSide 
      }),
      new THREE.MeshBasicMaterial({ 
        color: 0x87ceeb,
        side: THREE.BackSide 
      }),
      new THREE.MeshBasicMaterial({ 
        color: 0x87ceeb, 
        side: THREE.BackSide 
      })
    ];

    const skybox = new THREE.Mesh(skyGeometry, skyMaterials);
    this.scene.add(skybox);

    // Add a few clouds
    for (let i = 0; i < 20; i++) {
      const cloud = this.createCloud();
      const x = Math.random() * 1000 - 500;
      const y = Math.random() * 200 + 100;
      const z = Math.random() * 1000 - 500;
      cloud.position.set(x, y, z);
      this.scene.add(cloud);
    }
  }

  private createCloud() {
    const cloud = new THREE.Group();

    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      roughness: 1
    });

    const numPuffs = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < numPuffs; i++) {
      const puffGeometry = new THREE.SphereGeometry(
        Math.random() * 10 + 10, 
        8, 8
      );
      const puff = new THREE.Mesh(puffGeometry, cloudMaterial);

      const x = Math.random() * 20 - 10;
      const y = Math.random() * 5;
      const z = Math.random() * 20 - 10;
      puff.position.set(x, y, z);

      cloud.add(puff);
    }

    return cloud;
  }

  createEnvironmentObject(obj: EnvironmentObject): THREE.Object3D {
    let mesh: THREE.Object3D;

    switch(obj.type) {
      case EntityType.FENCE:
        mesh = this.createFence(obj);
        break;
      case EntityType.HAY_BALE:
        mesh = this.createHayBale(obj);
        break;
      case EntityType.BARN:
        mesh = this.createBarn(obj);
        break;
      case EntityType.HOUSE:
        mesh = this.createHouse(obj);
        break;
      case EntityType.CAR:
        mesh = this.createCar(obj);
        break;
      default:
        // Default simple box for unknown types
        const geometry = new THREE.BoxGeometry(obj.width, 20, obj.height);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        mesh = new THREE.Mesh(geometry, material);
    }

    // Set position
    mesh.position.set(obj.x - this.groundSize/2, 0, obj.y - this.groundSize/2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private createFence(obj: EnvironmentObject): THREE.Object3D {
    const fence = new THREE.Group();

    // Create fence posts
    const postGeometry = new THREE.BoxGeometry(5, 25, 5);
    const postMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513, // Brown
      roughness: 0.9
    });

    // Create fence rails
    const railGeometry = new THREE.BoxGeometry(obj.width, 5, 2);
    const railMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xa0522d, // Sienna
      roughness: 0.9
    });

    // Add posts and rails
    const posts = Math.ceil(obj.width / 20);
    for (let i = 0; i < posts; i++) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(i * 20 - obj.width/2, 12.5, 0);
      fence.add(post);
    }

    // Add two rails
    const railTop = new THREE.Mesh(railGeometry, railMaterial);
    railTop.position.set(0, 20, 0);
    fence.add(railTop);

    const railBottom = new THREE.Mesh(railGeometry, railMaterial);
    railBottom.position.set(0, 10, 0);
    fence.add(railBottom);

    return fence;
  }

  private createHayBale(obj: EnvironmentObject): THREE.Object3D {
    const hayGeometry = new THREE.CylinderGeometry(obj.width/2, obj.width/2, 30, 16);
    const hayMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xf4a460, // Sandy brown
      roughness: 1
    });

    const hay = new THREE.Mesh(hayGeometry, hayMaterial);
    hay.rotation.x = Math.PI / 2; // Lay it on its side
    hay.position.y = 15; // Half height

    return hay;
  }

  private createBarn(obj: EnvironmentObject): THREE.Object3D {
    const barn = new THREE.Group();

    // Barn body
    const bodyGeometry = new THREE.BoxGeometry(obj.width, 40, obj.height);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xb22222, // Firebrick red
      roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 20;
    barn.add(body);

    // Barn roof
    const roofGeometry = new THREE.ConeGeometry(
      Math.sqrt(obj.width*obj.width + obj.height*obj.height)/2,
      20, 4, 1
    );
    const roofMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b0000, // Dark red
      roughness: 0.7
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.y = Math.PI/4; // Orient the pyramid
    roof.position.y = 40 + 10; // Position on top of the barn body
    barn.add(roof);

    // Add a door
    const doorGeometry = new THREE.PlaneGeometry(15, 25);
    const doorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513, // Brown
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 12.5, obj.height/2 + 0.1); // In front of the barn
    door.rotation.y = Math.PI; // Face outward
    barn.add(door);

    return barn;
  }

  private createHouse(obj: EnvironmentObject): THREE.Object3D {
    const house = new THREE.Group();

    // House body
    const bodyGeometry = new THREE.BoxGeometry(obj.width, 35, obj.height);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xd3d3d3, // Light gray
      roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 17.5;
    house.add(body);

    // House roof
    const roofGeometry = new THREE.ConeGeometry(
      Math.sqrt(obj.width*obj.width + obj.height*obj.height)/2,
      25, 4, 1
    );
    const roofMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xa52a2a, // Brown
      roughness: 0.7
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.y = Math.PI/4; // Orient the pyramid
    roof.position.y = 35 + 12.5; // Position on top of the house body
    house.add(roof);

    // Add a door
    const doorGeometry = new THREE.PlaneGeometry(10, 20);
    const doorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513, // Brown
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 10, obj.height/2 + 0.1); // In front of the house
    door.rotation.y = Math.PI; // Face outward
    house.add(door);

    // Add windows
    const windowGeometry = new THREE.PlaneGeometry(8, 8);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xadd8e6, // Light blue
      roughness: 0.5,
      metalness: 0.5,
      side: THREE.DoubleSide
    });

    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(-obj.width/4, 20, obj.height/2 + 0.1);
    window1.rotation.y = Math.PI;
    house.add(window1);

    const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
    window2.position.set(obj.width/4, 20, obj.height/2 + 0.1);
    window2.rotation.y = Math.PI;
    house.add(window2);

    return house;
  }

  private createCar(obj: EnvironmentObject): THREE.Object3D {
    const car = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(obj.width, 15, obj.height);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: Math.random() > 0.5 ? 0x3333ff : 0xff3333, // Random blue or red
      roughness: 0.5,
      metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 10;
    car.add(body);

    // Car top
    const topGeometry = new THREE.BoxGeometry(obj.width * 0.6, 10, obj.height * 0.7);
    const topMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333, // Dark gray
      roughness: 0.5,
      metalness: 0.7
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.set(0, 20, -obj.height * 0.1);
    car.add(top);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(5, 5, 3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111, // Black
      roughness: 0.9
    });

    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFL.rotation.z = Math.PI / 2; // Rotate to align with car
    wheelFL.position.set(-obj.width/2 + 7, 5, -obj.height/2 + 5);
    car.add(wheelFL);

    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFR.rotation.z = Math.PI / 2;
    wheelFR.position.set(obj.width/2 - 7, 5, -obj.height/2 + 5);
    car.add(wheelFR);

    const wheelBL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBL.rotation.z = Math.PI / 2;
    wheelBL.position.set(-obj.width/2 + 7, 5, obj.height/2 - 5);
    car.add(wheelBL);

    const wheelBR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBR.rotation.z = Math.PI / 2;
    wheelBR.position.set(obj.width/2 - 7, 5, obj.height/2 - 5);
    car.add(wheelBR);

    return car;
  }

  createPlayerObject(player: PlayerState): THREE.Object3D {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: player.tag === 'anonymous' ? 0xaaaaaa : 0x00ff00 
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Instead of text, use a sprite for the player tag
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    if (context) {
      context.fillStyle = 'rgba(0, 0, 0, 0.5)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = '24px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.fillText(player.tag || 'unknown', canvas.width / 2, canvas.height / 2 + 8);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(0, 1.2, 0);
      sprite.scale.set(1, 0.25, 1);
      mesh.add(sprite);
    }

    return mesh;
  }

  updateCamera(playerId: string, state: GameState) {
    // Find the player in the state
    const players = Array.isArray(state.players) 
      ? state.players
      : state.players instanceof Map
        ? Array.from(state.players.values())
        : [];

    const player = players.find(p => p.id === playerId);

    if (player) {
      // Position camera behind and above the player
      const targetX = player.x - this.groundSize/2;
      const targetZ = player.y - this.groundSize/2;

      // Smooth camera follow
      this.camera.position.x = targetX;
      this.camera.position.z = targetZ + 100;
      this.camera.position.y = 70;
      this.camera.lookAt(targetX, 0, targetZ);
    }
  }

  render(state: GameState) {
    try {
      if (!this.scene || !this.camera || !this.renderer) return;

      // Clear existing models
      this.models.forEach((model, id) => {
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
      if (Array.isArray(state.environment)) {
        state.environment.forEach(obj => {
          try {
            const model = this.createEnvironmentObject(obj);
            this.models.set(`env-${obj.id}`, model);
            this.scene.add(model);
          } catch (error) {
            console.warn('Error creating environment object:', error);
          }
        });
      }

      // Render the scene
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.error("Error rendering scene:", error);
    }
  }

  // Clean up Three.js resources
  dispose() {
    this.models.forEach(model => {
      if (model instanceof THREE.Mesh) {
        if (model.geometry) model.geometry.dispose();
        if (Array.isArray(model.material)) {
          model.material.forEach(m => m.dispose());
        } else if (model.material) {
          model.material.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}