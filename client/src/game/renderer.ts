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
  private previousCameraTarget?: THREE.Vector3;
  private forceCanvasRenderer = false; // Set to true to force canvas renderer

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

    // Try to create WebGL renderer with better error handling
    if (!this.forceCanvasRenderer) {
      try {
        // Create with lower precision for better compatibility
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: true,
          precision: 'mediump',
          powerPreference: 'low-power'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio
        
        // Enable shadows with optimization
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Handle WebGL context loss
        this.canvas.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          console.warn("WebGL context lost, will attempt to restore");
        });
        
        console.log("WebGL renderer created successfully");
      } catch (error) {
        console.warn("WebGL renderer creation failed, using fallback 2D canvas", error);
        this.fallbackCtx = this.canvas.getContext('2d');
      }
    } else {
      console.log("Using 2D canvas renderer as requested");
      this.fallbackCtx = this.canvas.getContext('2d');
    }

    // Add enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xccccff, 0.4); // Slight blue tint for shadows
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Main sunlight
    const sunLight = new THREE.DirectionalLight(0xffffcc, 1.2); // Warm sunlight
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    
    // Configure shadow properties
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    
    this.scene.add(sunLight);
    this.lights.push(sunLight);
    
    // Secondary fill light from opposite direction
    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.5); // Slight blue for contrast
    fillLight.position.set(-20, 30, -20);
    this.scene.add(fillLight);
    this.lights.push(fillLight);
    
    // Add some fog for distance atmosphere
    this.scene.fog = new THREE.FogExp2(0xccccff, 0.0015);

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
    // Create a more detailed ground with better texture
    const groundSize = this.groundSize;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 64, 64);
    
    // Create a high-quality procedural texture for the ground
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    
    if (context) {
      // Create gradient background
      const gradient = context.createLinearGradient(0, 0, 1024, 1024);
      gradient.addColorStop(0, '#4CAF50');  // Base green
      gradient.addColorStop(0.3, '#43A047'); // Slightly darker
      gradient.addColorStop(0.7, '#43A047'); // Slightly darker
      gradient.addColorStop(1, '#4CAF50');  // Back to base
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add grass texture details
      for (let i = 0; i < 20000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 3 + 1;
        
        // More natural grass color variation
        const colorValue = Math.floor(Math.random() * 20);
        const baseColor = Math.random() > 0.7 ? 40 : 60; // Some darker patches
        context.fillStyle = `rgb(${baseColor + colorValue}, ${130 + colorValue}, ${60 + colorValue})`;
        
        context.fillRect(x, y, size, size);
      }
      
      // Add dirt paths - more natural looking
      for (let i = 0; i < 10; i++) {
        const pathStartX = Math.random() * canvas.width;
        const pathStartY = Math.random() * canvas.height;
        const pathLength = Math.random() * 300 + 100;
        const pathAngle = Math.random() * Math.PI * 2;
        
        const pathWidth = Math.random() * 40 + 20;
        
        // Draw a curved dirt path
        context.fillStyle = '#8B6D43'; // Dirt color
        context.beginPath();
        context.moveTo(pathStartX, pathStartY);
        
        // Create a curved path with bezier curves
        const controlX1 = pathStartX + Math.cos(pathAngle) * pathLength * 0.3;
        const controlY1 = pathStartY + Math.sin(pathAngle) * pathLength * 0.3;
        const controlX2 = pathStartX + Math.cos(pathAngle) * pathLength * 0.7;
        const controlY2 = pathStartY + Math.sin(pathAngle) * pathLength * 0.7;
        const endX = pathStartX + Math.cos(pathAngle) * pathLength;
        const endY = pathStartY + Math.sin(pathAngle) * pathLength;
        
        context.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
        context.lineWidth = pathWidth;
        context.stroke();
        
        // Add details to the path
        for (let j = 0; j < 100; j++) {
          const t = j / 100;
          const x = Math.pow(1-t, 3) * pathStartX + 
                   3 * Math.pow(1-t, 2) * t * controlX1 + 
                   3 * (1-t) * Math.pow(t, 2) * controlX2 + 
                   Math.pow(t, 3) * endX;
          const y = Math.pow(1-t, 3) * pathStartY + 
                   3 * Math.pow(1-t, 2) * t * controlY1 + 
                   3 * (1-t) * Math.pow(t, 2) * controlY2 + 
                   Math.pow(t, 3) * endY;
          
          context.fillStyle = Math.random() > 0.5 ? '#8B6D43' : '#9E7E53';
          context.beginPath();
          context.arc(
            x + (Math.random() - 0.5) * pathWidth,
            y + (Math.random() - 0.5) * pathWidth,
            Math.random() * 5 + 2,
            0,
            Math.PI * 2
          );
          context.fill();
        }
      }
    }
    
    const groundTexture = new THREE.CanvasTexture(canvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(16, 16); // Repeat the texture
    
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: groundTexture,
      side: THREE.DoubleSide,
      roughness: 0.9,
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -0.5; // Position below players
    this.scene.add(ground);
    
    // Add some ambient particles (dust/pollen)
    const particleCount = 500;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Random position within a cube
      const x = (Math.random() - 0.5) * groundSize * 0.5;
      const y = Math.random() * 50 + 1; // Height above ground
      const z = (Math.random() - 0.5) * groundSize * 0.5;
      particlePositions.push(x, y, z);
    }
    
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.5,
      transparent: true,
      opacity: 0.3
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);
  }

  private createPlayerObject(player: Player): THREE.Object3D {
    // Create an improved goat representation
    const group = new THREE.Group();

    // Create fur texture
    const furTexture = this.createProceduralTexture(256, 256, (ctx) => {
      // Base color
      ctx.fillStyle = player.isCharging ? '#FF8080' : '#F5F5DC';
      ctx.fillRect(0, 0, 256, 256);
      
      // Add fur pattern
      for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = player.isCharging ? 
          (Math.random() > 0.5 ? '#FF6060' : '#FF4040') : 
          (Math.random() > 0.5 ? '#E5E5C2' : '#FCFCF0');
        
        ctx.beginPath();
        ctx.arc(
          Math.random() * 256,
          Math.random() * 256,
          Math.random() * 3 + 1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });
    
    const furMaterial = new THREE.MeshStandardMaterial({ 
      map: furTexture,
      roughness: 1.0,
      metalness: 0.1
    });

    // Body - more goat-like with an elongated body
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.2, 8, 16);
    bodyGeometry.rotateZ(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeometry, furMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.9;
    group.add(body);

    // Head - improved with better shape
    const headGeometry = new THREE.CapsuleGeometry(0.3, 0.5, 8, 16);
    const head = new THREE.Mesh(headGeometry, furMaterial);
    head.castShadow = true;
    head.receiveShadow = true;
    head.position.set(0.9, 1.3, 0);
    head.rotation.z = -Math.PI / 4;
    group.add(head);

    // Horns
    const hornGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
    const hornMaterial = new THREE.MeshStandardMaterial({ color: 0xDCDCDC });
    
    // Left horn
    const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    leftHorn.position.set(0.9, 1.5, 0.2);
    leftHorn.rotation.z = Math.PI / 4;
    leftHorn.rotation.x = Math.PI / 8;
    group.add(leftHorn);
    
    // Right horn
    const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
    rightHorn.position.set(0.9, 1.5, -0.2);
    rightHorn.rotation.z = Math.PI / 4;
    rightHorn.rotation.x = -Math.PI / 8;
    group.add(rightHorn);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
    
    // Front right leg
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(0.4, 0.4, -0.3);
    group.add(frontRightLeg);
    
    // Front left leg
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(0.4, 0.4, 0.3);
    group.add(frontLeftLeg);
    
    // Back right leg
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(-0.4, 0.4, -0.3);
    group.add(backRightLeg);
    
    // Back left leg
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-0.4, 0.4, 0.3);
    group.add(backLeftLeg);
    
    // Add a small tail
    const tailGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xF5F5DC });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(-0.8, 0.9, 0);
    tail.rotation.z = -Math.PI / 4;
    group.add(tail);

    // Position and orientation
    group.position.set(player.x, 0, player.y);
    group.rotation.y = player.rotation || 0;
    
    // Add a score text if player has a score
    if (player.score !== undefined) {
      const scoreCanvas = document.createElement('canvas');
      const context = scoreCanvas.getContext('2d');
      scoreCanvas.width = 128;
      scoreCanvas.height = 64;
      
      if (context) {
        context.fillStyle = '#ffffff';
        context.font = 'Bold 24px Arial';
        context.fillText(`Score: ${player.score}`, 10, 30);
        
        const scoreTexture = new THREE.CanvasTexture(scoreCanvas);
        const scoreMaterial = new THREE.SpriteMaterial({ map: scoreTexture });
        const scoreSprite = new THREE.Sprite(scoreMaterial);
        scoreSprite.position.set(0, 2, 0);
        scoreSprite.scale.set(2, 1, 1);
        group.add(scoreSprite);
      }
    }

    return group;
  }

  private createEnvironmentObject(object: EnvironmentObject): THREE.Object3D {
    const group = new THREE.Group();

    let mesh: THREE.Mesh;

    // Create different geometries based on type
    switch (object.type) {
      case EntityType.TREE:
        // Trunk with improved texture
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
        const barkTexture = this.createProceduralTexture(128, 128, (ctx) => {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(0, 0, 128, 128);
          
          // Add bark texture
          for (let i = 0; i < 50; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#6B4513' : '#9B6530';
            ctx.fillRect(
              Math.random() * 128, 
              Math.random() * 128, 
              Math.random() * 10 + 2, 
              Math.random() * 30 + 5
            );
          }
        });
        
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
          map: barkTexture,
          roughness: 0.9,
          metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.position.y = 1;
        group.add(trunk);

        // Leaves with improved texture
        const leavesGeometry = new THREE.ConeGeometry(1.5, 3, 8);
        const leavesTexture = this.createProceduralTexture(128, 128, (ctx) => {
          ctx.fillStyle = '#228B22';
          ctx.fillRect(0, 0, 128, 128);
          
          // Add leaf details
          for (let i = 0; i < 100; i++) {
            ctx.fillStyle = Math.random() > 0.7 ? '#196619' : '#2EA12E';
            ctx.beginPath();
            ctx.arc(
              Math.random() * 128,
              Math.random() * 128,
              Math.random() * 8 + 2,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        });
        
        const leavesMaterial = new THREE.MeshStandardMaterial({ 
          map: leavesTexture,
          roughness: 0.8,
          metalness: 0.1
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.castShadow = true;
        leaves.receiveShadow = true;
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
        
      case EntityType.HOUSE:
        // Main house structure
        const houseGeometry = new THREE.BoxGeometry(
          object.width || 100,
          object.height || 100,
          object.width || 100
        );
        const houseMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        mesh = new THREE.Mesh(houseGeometry, houseMaterial);
        mesh.position.y = (object.height || 100) / 2;
        group.add(mesh);
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(object.width || 100, 50, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xA52A2A });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = object.height + 25;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);
        break;
        
      case EntityType.BARN:
        // Main barn structure
        const barnGeometry = new THREE.BoxGeometry(
          object.width || 120,
          object.height || 80,
          (object.width || 120) * 0.8
        );
        const barnMaterial = new THREE.MeshStandardMaterial({ color: 0xA52A2A });
        mesh = new THREE.Mesh(barnGeometry, barnMaterial);
        mesh.position.y = (object.height || 80) / 2;
        group.add(mesh);
        
        // Roof
        const barnRoofGeometry = new THREE.CylinderGeometry(0, (object.width || 120) / 2, 60, 4, 1, false);
        const barnRoofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const barnRoof = new THREE.Mesh(barnRoofGeometry, barnRoofMaterial);
        barnRoof.position.y = object.height + 30;
        barnRoof.rotation.y = Math.PI / 4;
        group.add(barnRoof);
        break;
        
      case EntityType.CAR:
        // Car body
        const carBodyGeometry = new THREE.BoxGeometry(
          object.width || 60,
          (object.height || 30) * 0.7,
          (object.width || 60) * 0.5
        );
        const carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3366CC });
        const carBody = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
        carBody.position.y = (object.height || 30) / 3;
        group.add(carBody);
        
        // Car top
        const carTopGeometry = new THREE.BoxGeometry(
          (object.width || 60) * 0.6,
          (object.height || 30) * 0.5,
          (object.width || 60) * 0.4
        );
        const carTopMaterial = new THREE.MeshStandardMaterial({ color: 0x3366CC });
        const carTop = new THREE.Mesh(carTopGeometry, carTopMaterial);
        carTop.position.y = (object.height || 30) * 0.8;
        carTop.position.z = -(object.width || 60) * 0.05;
        group.add(carTop);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(5, 5, 3, 8);
        wheelGeometry.rotateX(Math.PI / 2);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        // Front left wheel
        const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFL.position.set((object.width || 60) * 0.3, 5, (object.width || 60) * 0.25);
        group.add(wheelFL);
        
        // Front right wheel
        const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFR.position.set((object.width || 60) * 0.3, 5, -(object.width || 60) * 0.25);
        group.add(wheelFR);
        
        // Back left wheel
        const wheelBL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelBL.position.set(-(object.width || 60) * 0.3, 5, (object.width || 60) * 0.25);
        group.add(wheelBL);
        
        // Back right wheel
        const wheelBR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelBR.position.set(-(object.width || 60) * 0.3, 5, -(object.width || 60) * 0.25);
        group.add(wheelBR);
        break;
        
      case EntityType.HAY_BALE:
        const hayGeometry = new THREE.CylinderGeometry(
          (object.width || 40) / 2,
          (object.width || 40) / 2,
          object.height || 40,
          16
        );
        hayGeometry.rotateX(Math.PI / 2);
        const hayMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 1.0 });
        mesh = new THREE.Mesh(hayGeometry, hayMaterial);
        mesh.position.y = (object.height || 40) / 2;
        group.add(mesh);
        break;
        
      case EntityType.FENCE:
        const fenceGeometry = new THREE.BoxGeometry(
          object.width || 100,
          object.height || 20,
          (object.height || 20) / 2
        );
        const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        mesh = new THREE.Mesh(fenceGeometry, fenceMaterial);
        mesh.position.y = (object.height || 20) / 2;
        group.add(mesh);
        break;

      default:
        const defaultGeometry = new THREE.BoxGeometry(
          object.width || 1, 
          object.height || 1,
          object.width || 1
        );
        const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
        mesh = new THREE.Mesh(defaultGeometry, defaultMaterial);
        mesh.position.y = (object.height || 1) / 2;
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
      // Calculate improved third-person camera position
      // Position camera behind and slightly above the player
      const cameraDistance = 10; // Distance behind player (reduced for better view)
      const cameraHeight = 5; // Height above ground (lowered for better view)
      const lookAheadDistance = 8; // Distance to look ahead of player (increased)
      
      // Position based on player's rotation
      this.camera.position.x = player.x - cameraDistance * Math.cos(player.rotation || 0);
      this.camera.position.z = player.y - cameraDistance * Math.sin(player.rotation || 0);
      this.camera.position.y = cameraHeight;
      
      // Look at a point slightly ahead of the player
      const lookAtX = player.x + lookAheadDistance * Math.cos(player.rotation || 0);
      const lookAtZ = player.y + lookAheadDistance * Math.sin(player.rotation || 0);
      const lookAtY = player.isCharging ? 1.5 : 1; // Look at goat's head
      
      this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
      
      // Smooth camera transitions (damping)
      if (this.previousCameraTarget) {
        this.camera.position.lerp(this.camera.position, 0.1);
        this.camera.quaternion.slerp(this.camera.quaternion, 0.1);
      }
      
      this.previousCameraTarget = new THREE.Vector3(lookAtX, lookAtY, lookAtZ);
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

  private createProceduralTexture(width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D) => void): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    
    if (context) {
      drawFn(context);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
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