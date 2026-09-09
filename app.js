/**
 * RACE SURVIVAL: ARENA KING - 3D FLYING CAR GAME ENGINE
 */

// Global State & Save Data Management
const gameState = {
    coins: 1000,
    selectedCarIndex: 0,
    selectedMode: 'survival', // 'survival', 'race', 'stunt'
    soundEnabled: true,
    score: 0,
    wave: 1,
    kills: 0,
    checkpointsPassed: 0,
    totalRings: 12,
    isPaused: false,
    isGameOver: false,
    unlockedCars: [true, false, false, false],
    carUpgrades: [
        { speed: 1, armor: 1, boost: 1, flight: 1 },
        { speed: 1, armor: 1, boost: 1, flight: 1 },
        { speed: 1, armor: 1, boost: 1, flight: 1 },
        { speed: 1, armor: 1, boost: 1, flight: 1 }
    ],
    carPaints: [
        { body: '#00e5ff', neon: '#ff007f' },
        { body: '#ff0055', neon: '#ffe600' },
        { body: '#00ff66', neon: '#00f3ff' },
        { body: '#9d00ff', neon: '#00ffff' }
    ]
};

// Vehicle Data Definitions
const CAR_DATABASE = [
    { name: 'CYBER FALCON V1', price: 0, baseSpeed: 60, baseArmor: 100, baseBoost: 100, baseFlight: 70, color: 0x00e5ff, accent: 0xff007f },
    { name: 'TITAN PHANTOM X', price: 1500, baseSpeed: 75, baseArmor: 160, baseBoost: 120, baseFlight: 80, color: 0xff0055, accent: 0xffe600 },
    { name: 'VENOM HYPER-FLY', price: 3000, baseSpeed: 90, baseArmor: 120, baseBoost: 150, baseFlight: 95, color: 0x00ff66, accent: 0x00f3ff },
    { name: 'APEX OMEGA WARLORD', price: 5000, baseSpeed: 105, baseArmor: 200, baseBoost: 180, baseFlight: 110, color: 0x9d00ff, accent: 0x00ffff }
];

// Sound Synthesizer via Web Audio API
class SoundManager {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.init();
    }

    init() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    resumeCtx() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playEngine() {
        if (!gameState.soundEnabled || !this.ctx) return;
        if (this.engineOsc) return;

        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();

        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, this.ctx.currentTime);

        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        this.engineOsc.start();
    }

    updateEnginePitch(speed) {
        if (this.engineOsc && this.ctx) {
            const pitch = 50 + Math.min(speed * 2.5, 300);
            this.engineOsc.frequency.setTargetAtTime(pitch, this.ctx.currentTime, 0.1);
        }
    }

    stopEngine() {
        if (this.engineOsc) {
            try { this.engineOsc.stop(); } catch(e){}
            this.engineOsc = null;
        }
    }

    playImpact() {
        if (!gameState.soundEnabled || !this.ctx) return;
        this.resumeCtx();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playPickup() {
        if (!gameState.soundEnabled || !this.ctx) return;
        this.resumeCtx();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.16); // G5

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playExplosion() {
        if (!gameState.soundEnabled || !this.ctx) return;
        this.resumeCtx();
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }
}

const soundManager = new SoundManager();

// 3D Engine Variables
let scene, camera, renderer;
let playerVehicle, playerBody;
let enemies = [];
let ringCheckpoints = [];
let powerups = [];
let activeParticles = [];
let floatingTiles = [];
let shatterables = [];
let speedBoostArches = [];

// Physics & Input State
const inputKeys = {
    w: false, s: false, a: false, d: false,
    space: false, shift: false, f: false
};

let isFlyingMode = false;
let playerHealth = 100;
let maxPlayerHealth = 100;
let playerNitro = 100;
let playerVelocity = new THREE.Vector3();
let playerSpeed = 0;
let cameraMode = 0; // 0: Chase, 1: Close, 2: Top Down

// Saved Storage Loader
function loadSavedData() {
    const saved = localStorage.getItem('race_survival_data');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState.coins = parsed.coins || 1000;
            gameState.unlockedCars = parsed.unlockedCars || gameState.unlockedCars;
            gameState.carUpgrades = parsed.carUpgrades || gameState.carUpgrades;
            gameState.carPaints = parsed.carPaints || gameState.carPaints;
        } catch(e) {
            console.warn("Failed to load save data", e);
        }
    }
}

function saveData() {
    localStorage.setItem('race_survival_data', JSON.stringify({
        coins: gameState.coins,
        unlockedCars: gameState.unlockedCars,
        carUpgrades: gameState.carUpgrades,
        carPaints: gameState.carPaints
    }));
}

// THREE.js Scene Setup & Initialization
function initThreeScene() {
    const canvas = document.getElementById('game-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b10);
    scene.fog = new THREE.FogExp2(0x0a0b10, 0.003);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 20);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 1.2);
    dirLight.position.set(100, 150, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    const d = 150;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const secondaryLight = new THREE.DirectionalLight(0xff007f, 0.8);
    secondaryLight.position.set(-100, 80, -50);
    scene.add(secondaryLight);

    buildEnvironment();

    window.addEventListener('resize', onWindowResize, false);
}

// Build Floating Sky Arena (No Land Ground Beneath - Floating Platforms over Sky Void)
function buildEnvironment() {
    // Clear previous environment structures
    floatingTiles.forEach(t => scene.remove(t.mesh));
    floatingTiles = [];

    // Create Floating Central Grid Platforms with Collapsing Tiles
    const tileSize = 12;
    const gridDim = 12; // 12x12 grid of floating sky tiles
    const halfGrid = (gridDim * tileSize) / 2;

    const tileGeo = new THREE.BoxGeometry(tileSize - 0.8, 2, tileSize - 0.8);

    for (let r = 0; r < gridDim; r++) {
        for (let c = 0; c < gridDim; c++) {
            // Leave open gaps in the grid to create sky voids
            if ((r === 0 || r === gridDim - 1) && (c === 0 || c === gridDim - 1)) continue;

            const tileMat = new THREE.MeshStandardMaterial({
                color: (r + c) % 2 === 0 ? 0x12192c : 0x1a233d,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x00f3ff,
                emissiveIntensity: 0.15
            });

            const tileMesh = new THREE.Mesh(tileGeo, tileMat);
            const x = (c * tileSize) - halfGrid + tileSize / 2;
            const z = (r * tileSize) - halfGrid + tileSize / 2;
            tileMesh.position.set(x, 0, z);
            tileMesh.receiveShadow = true;
            tileMesh.castShadow = true;

            // Glowing Tile Edge Frame
            const edgeGeo = new THREE.EdgesGeometry(tileGeo);
            const edgeMat = new THREE.LineBasicMaterial({ color: 0x00f3ff });
            const wireframe = new THREE.LineSegments(edgeGeo, edgeMat);
            tileMesh.add(wireframe);

            scene.add(tileMesh);

            floatingTiles.push({
                mesh: tileMesh,
                wireframe: wireframe,
                initialY: 0,
                stepped: false,
                stepTimer: 0,
                collapsed: false,
                bounds: { minX: x - tileSize / 2, maxX: x + tileSize / 2, minZ: z - tileSize / 2, maxZ: z + tileSize / 2 }
            });
        }
    }

    // Secondary Higher-Tier Sky Platforms & Ramps
    createSkyPlatform(-110, 15, -110, 60, 40);
    createSkyPlatform(110, 20, 110, 50, 50);
    createSkyPlatform(-110, 25, 110, 50, 50);
    createSkyPlatform(110, 18, -110, 60, 40);

    // Sky Skybridges Connecting High Islands
    createSkyBridge(0, 12, -120, 100, 12, 0);
    createSkyBridge(0, 12, 120, 100, 12, 0);

    // Floating Jump Ramps in Sky
    createRamp(-45, 0, 0, Math.PI / 2);
    createRamp(45, 0, 0, -Math.PI / 2);
    createRamp(0, 0, -45, 0);
    createRamp(0, 0, 45, Math.PI);

    // Spawn Destructible Crates & Pass-Through Boost Arches
    spawnShatterables();
    spawnSpeedBoostArches();

    // Endless Sky Abyss Nebula Base (No Solid Ground surface below)
    const skyVoidGeo = new THREE.RingGeometry(80, 800, 32);
    const skyVoidMat = new THREE.MeshBasicMaterial({
        color: 0x050814,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
    });
    const skyVoidMesh = new THREE.Mesh(skyVoidGeo, skyVoidMat);
    skyVoidMesh.rotation.x = Math.PI / 2;
    skyVoidMesh.position.y = -80;
    scene.add(skyVoidMesh);

    // Distant Floating Megacity Skyscrapers
    createCityScenery();
}

function createSkyPlatform(x, y, z, width, depth) {
    const geo = new THREE.BoxGeometry(width, 3, depth);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x0c1220,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xff007f,
        emissiveIntensity: 0.2
    });
    const plat = new THREE.Mesh(geo, mat);
    plat.position.set(x, y, z);
    plat.receiveShadow = true;
    plat.castShadow = true;

    // Glowing Neon Border Edge
    const borderGeo = new THREE.BoxGeometry(width + 1, 0.5, depth + 1);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(0, 1.6, 0);
    plat.add(border);

    scene.add(plat);

    floatingTiles.push({
        mesh: plat,
        initialY: y,
        stepped: false,
        stepTimer: 0,
        collapsed: false,
        isPermanent: true, // Sky platforms don't crumble
        bounds: { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, topY: y + 1.5 }
    });
}

function createSkyBridge(x, y, z, length, width, rotationY) {
    const geo = new THREE.BoxGeometry(length, 2, width);
    const mat = new THREE.MeshStandardMaterial({ color: 0x11192e, metalness: 0.8, roughness: 0.3 });
    const bridge = new THREE.Mesh(geo, mat);
    bridge.position.set(x, y, z);
    bridge.rotation.y = rotationY;
    bridge.receiveShadow = true;
    bridge.castShadow = true;

    scene.add(bridge);

    floatingTiles.push({
        mesh: bridge,
        initialY: y,
        stepped: false,
        stepTimer: 0,
        collapsed: false,
        isPermanent: true,
        bounds: { minX: x - length / 2, maxX: x + length / 2, minZ: z - width / 2, maxZ: z + width / 2, topY: y + 1 }
    });
}

// Spawn Shatterable Interactive Crates & Pass-Through Barriers ("Drive/Go Through Things")
function spawnShatterables() {
    shatterables.forEach(s => scene.remove(s.mesh));
    shatterables = [];

    const crateGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);

    const positions = [
        { x: -20, y: 2, z: -20 }, { x: -18, y: 2, z: -20 }, { x: -20, y: 4.5, z: -20 },
        { x: 20, y: 2, z: 20 }, { x: 22, y: 2, z: 20 },
        { x: -30, y: 2, z: 30 }, { x: 30, y: 2, z: -30 },
        { x: 0, y: 2, z: -35 }, { x: 0, y: 2, z: 35 },
        { x: -110, y: 17, z: -110 }, { x: 110, y: 22, z: 110 }
    ];

    positions.forEach((pos, idx) => {
        const crateMat = new THREE.MeshStandardMaterial({
            color: idx % 2 === 0 ? 0xff0055 : 0xffe600,
            metalness: 0.6,
            roughness: 0.3,
            emissive: idx % 2 === 0 ? 0xff0055 : 0xffe600,
            emissiveIntensity: 0.3
        });
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.set(pos.x, pos.y, pos.z);
        crate.castShadow = true;
        scene.add(crate);

        shatterables.push({
            mesh: crate,
            position: new THREE.Vector3(pos.x, pos.y, pos.z),
            shattered: false
        });
    });
}

function updateShatterables(delta) {
    if (!playerVehicle) return;

    shatterables.forEach(s => {
        if (s.shattered) return;

        const dist = playerVehicle.position.distanceTo(s.position);
        if (dist < 3.2) {
            s.shattered = true;
            scene.remove(s.mesh);

            // Shatter Debris Particle FX
            createParticleExplosion(s.position, 0xffe600);
            soundManager.playImpact();

            // Reward score & coins for driving through crates
            gameState.score += 200;
            gameState.coins += 25;
            updateHUD();
        }
    });
}

// Collapsing Floating Tile Engine (Tiles fall into Sky Void when driven over)
function updateFloatingTiles(delta) {
    if (!playerVehicle) return;

    const px = playerVehicle.position.x;
    const pz = playerVehicle.position.z;
    const py = playerVehicle.position.y;

    floatingTiles.forEach(tile => {
        if (tile.isPermanent) return;

        // Check if player or AI is over tile
        if (!tile.collapsed && py > tile.initialY - 2 && py < tile.initialY + 4) {
            if (px >= tile.bounds.minX && px <= tile.bounds.maxX && pz >= tile.bounds.minZ && pz <= tile.bounds.maxZ) {
                tile.stepped = true;
            }
        }

        if (tile.stepped && !tile.collapsed) {
            tile.stepTimer += delta;

            // Warning flash before collapse
            if (tile.stepTimer > 0.6) {
                const flash = Math.sin(tile.stepTimer * 20) > 0;
                tile.mesh.material.emissive.setHex(flash ? 0xff0055 : 0x000000);
                if (tile.wireframe) tile.wireframe.material.color.setHex(0xff0055);
            }

            // Collapse tile into void
            if (tile.stepTimer > 1.2) {
                tile.collapsed = true;
                soundManager.playImpact();
                createParticleExplosion(tile.mesh.position, 0xff0055);
            }
        }

        if (tile.collapsed) {
            tile.mesh.position.y -= 45 * delta; // Fall rapidly into sky void
            if (tile.mesh.position.y < -120) {
                scene.remove(tile.mesh);
            }
        }
    });
}

// Spawn Pass-Through Speed Boost Arches
function spawnSpeedBoostArches() {
    speedBoostArches.forEach(a => scene.remove(a.mesh));
    speedBoostArches = [];

    const archPositions = [
        { x: 0, y: 3, z: -60, rot: 0 },
        { x: 0, y: 3, z: 60, rot: 0 },
        { x: -60, y: 3, z: 0, rot: Math.PI / 2 },
        { x: 60, y: 3, z: 0, rot: Math.PI / 2 }
    ];

    archPositions.forEach(p => {
        const archGroup = new THREE.Group();

        // Neon Gate Frame
        const gateGeo = new THREE.TorusGeometry(5, 0.4, 12, 24, Math.PI);
        const gateMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        const gate = new THREE.Mesh(gateGeo, gateMat);
        archGroup.add(gate);

        // Holographic Pass-Through Field Inside Arch
        const fieldGeo = new THREE.CircleGeometry(4.6, 24);
        const fieldMat = new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        });
        const field = new THREE.Mesh(fieldGeo, fieldMat);
        archGroup.add(field);

        archGroup.position.set(p.x, p.y, p.z);
        archGroup.rotation.y = p.rot;

        scene.add(archGroup);

        speedBoostArches.push({
            mesh: archGroup,
            position: new THREE.Vector3(p.x, p.y, p.z),
            cooldown: 0
        });
    });
}

function updateSpeedBoostArches(delta) {
    if (!playerVehicle) return;

    speedBoostArches.forEach(arch => {
        if (arch.cooldown > 0) {
            arch.cooldown -= delta;
            return;
        }

        const dist = playerVehicle.position.distanceTo(arch.position);
        if (dist < 5.0) {
            arch.cooldown = 1.5; // Cooldown before reactivating
            playerSpeed += 80; // Instant boost velocity
            playerNitro = Math.min(100, playerNitro + 40); // Restore Nitro
            soundManager.playPickup();
            createParticleExplosion(playerVehicle.position, 0x00f3ff);
            updateHUD();
        }
    });
}

function createRamp(x, z, size, rotationY) {
    const rampGroup = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(20, 8);
    shape.lineTo(20, 0);
    shape.closePath();

    const extrudeSettings = { depth: 16, bevelEnabled: false };
    const rampGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x00f3ff, roughness: 0.4, metalness: 0.7 });
    const rampMesh = new THREE.Mesh(rampGeo, rampMat);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    rampGroup.add(rampMesh);

    rampGroup.position.set(x, 0, z);
    rampGroup.rotation.y = rotationY;
    scene.add(rampGroup);
}

function createCityScenery() {
    const cityGroup = new THREE.Group();
    const buildingColors = [0x101420, 0x181e30, 0x0c0f18];
    const neonColors = [0x00f3ff, 0xff007f, 0xffe600];

    for (let i = 0; i < 40; i++) {
        const radius = 250 + Math.random() * 200;
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const width = 20 + Math.random() * 30;
        const depth = 20 + Math.random() * 30;
        const height = 80 + Math.random() * 180;

        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({
            color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
            roughness: 0.2
        });

        const building = new THREE.Mesh(geo, mat);
        building.position.set(x, height / 2 - 40, z);
        cityGroup.add(building);

        // Neon Strips on Buildings
        const stripGeo = new THREE.BoxGeometry(width + 0.5, 2, depth + 0.5);
        const stripMat = new THREE.MeshBasicMaterial({
            color: neonColors[Math.floor(Math.random() * neonColors.length)]
        });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(x, height - 35, z);
        cityGroup.add(strip);
    }
    scene.add(cityGroup);
}

// Construct Procedural 3D Flying Vehicle Mesh
function createVehicleMesh(carConfig) {
    const vehicleGroup = new THREE.Group();

    // Main Chassis Body
    const bodyGeo = new THREE.BoxGeometry(2.4, 0.9, 4.8);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: carConfig.color,
        metalness: 0.8,
        roughness: 0.2
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.8;
    bodyMesh.castShadow = true;
    vehicleGroup.add(bodyMesh);

    // Cabin Cockpit Glass
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.7, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x111122,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85
    });
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.set(0, 1.4, -0.2);
    vehicleGroup.add(cabinMesh);

    // Foldable Wing Extensions (Flight Mode)
    const leftWingGroup = new THREE.Group();
    const wingGeo = new THREE.BoxGeometry(2.5, 0.1, 1.2);
    const wingMat = new THREE.MeshStandardMaterial({ color: carConfig.color, metalness: 0.9 });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.25, 0, 0);
    leftWingGroup.add(leftWing);
    leftWingGroup.position.set(-1.2, 0.8, 0);
    vehicleGroup.add(leftWingGroup);

    const rightWingGroup = new THREE.Group();
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(1.25, 0, 0);
    rightWingGroup.add(rightWing);
    rightWingGroup.position.set(1.2, 0.8, 0);
    vehicleGroup.add(rightWingGroup);

    // Jet Thruster Engines (Rear)
    const jetGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.0, 16);
    const jetMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 });

    const leftJet = new THREE.Mesh(jetGeo, jetMat);
    leftJet.rotation.x = Math.PI / 2;
    leftJet.position.set(-0.7, 0.8, 2.4);
    vehicleGroup.add(leftJet);

    const rightJet = new THREE.Mesh(jetGeo, jetMat);
    rightJet.rotation.x = Math.PI / 2;
    rightJet.position.set(0.7, 0.8, 2.4);
    vehicleGroup.add(rightJet);

    // Jet Thruster Glow
    const glowGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: carConfig.accent });

    const leftGlow = new THREE.Mesh(glowGeo, glowMat);
    leftGlow.position.set(-0.7, 0.8, 2.8);
    vehicleGroup.add(leftGlow);

    const rightGlow = new THREE.Mesh(glowGeo, glowMat);
    rightGlow.position.set(0.7, 0.8, 2.8);
    vehicleGroup.add(rightGlow);

    // Glowing Neon Rims / Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const rimMat = new THREE.MeshBasicMaterial({ color: carConfig.accent });

    const wheelPositions = [
        [-1.3, 0.5, -1.5],
        [1.3, 0.5, -1.5],
        [-1.3, 0.5, 1.5],
        [1.3, 0.5, 1.5]
    ];

    const wheels = [];
    wheelPositions.forEach(pos => {
        const wGroup = new THREE.Group();
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wGroup.add(wheel);

        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 16), rimMat);
        rim.rotation.y = Math.PI / 2;
        wGroup.add(rim);

        wGroup.position.set(...pos);
        vehicleGroup.add(wGroup);
        wheels.push(wGroup);
    });

    vehicleGroup.userData = {
        leftWingGroup,
        rightWingGroup,
        leftGlow,
        rightGlow,
        wheels,
        config: carConfig
    };

    return vehicleGroup;
}

// Spawning Checkpoint Rings for Aerial Race Mode
function spawnRingCheckpoints() {
    ringCheckpoints.forEach(r => scene.remove(r.mesh));
    ringCheckpoints = [];

    const ringRadius = 8;
    const ringGeo = new THREE.TorusGeometry(ringRadius, 0.6, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe600 });

    const positions = [
        { x: 0, y: 15, z: -80 },
        { x: 50, y: 35, z: -140 },
        { x: 100, y: 55, z: -60 },
        { x: 80, y: 40, z: 50 },
        { x: 0, y: 25, z: 120 },
        { x: -90, y: 45, z: 80 },
        { x: -110, y: 60, z: -40 },
        { x: -50, y: 30, z: -100 }
    ];

    positions.forEach((pos, idx) => {
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(pos.x, pos.y, pos.z);
        ringMesh.rotation.y = Math.atan2(pos.x, pos.z);
        scene.add(ringMesh);

        ringCheckpoints.push({
            mesh: ringMesh,
            position: new THREE.Vector3(pos.x, pos.y, pos.z),
            index: idx,
            passed: false
        });
    });

    gameState.totalRings = ringCheckpoints.length;
    gameState.checkpointsPassed = 0;
}

// Spawn AI Opponents for Survival Mode
function spawnEnemies(count) {
    enemies.forEach(e => scene.remove(e.mesh));
    enemies = [];

    for (let i = 0; i < count; i++) {
        const carIndex = Math.floor(Math.random() * CAR_DATABASE.length);
        const config = { ...CAR_DATABASE[carIndex] };
        config.color = Math.random() * 0xffffff;

        const mesh = createVehicleMesh(config);
        const angle = (i / count) * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        mesh.position.set(Math.cos(angle) * dist, 2, Math.sin(angle) * dist);

        scene.add(mesh);

        enemies.push({
            mesh: mesh,
            health: 80 + gameState.wave * 20,
            maxHealth: 80 + gameState.wave * 20,
            speed: 30 + Math.random() * 20,
            velocity: new THREE.Vector3(),
            isFlying: false,
            targetPos: new THREE.Vector3()
        });
    }
}

// Particle System Effects (Explosions, Boost, Sparks)
function createParticleExplosion(pos, color = 0xff0055) {
    const count = 30;
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    for (let i = 0; i < count; i++) {
        positions.push(pos.x, pos.y, pos.z);
        velocities.push(
            (Math.random() - 0.5) * 20,
            Math.random() * 15 + 5,
            (Math.random() - 0.5) * 20
        );
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: color, size: 0.8, transparent: true, opacity: 1 });
    const pSystem = new THREE.Points(geo, mat);
    pSystem.userData = { velocities: velocities, life: 1.0 };

    scene.add(pSystem);
    activeParticles.push(pSystem);
}

function updateParticles(delta) {
    for (let i = activeParticles.length - 1; i >= 0; i--) {
        const pSystem = activeParticles[i];
        const life = pSystem.userData.life - delta * 2;
        pSystem.userData.life = life;

        if (life <= 0) {
            scene.remove(pSystem);
            activeParticles.splice(i, 1);
            continue;
        }

        pSystem.material.opacity = life;
        const positions = pSystem.geometry.attributes.position.array;
        const vels = pSystem.userData.velocities;

        for (let j = 0; j < vels.length / 3; j++) {
            positions[j * 3] += vels[j * 3] * delta;
            positions[j * 3 + 1] += vels[j * 3 + 1] * delta;
            positions[j * 3 + 2] += vels[j * 3 + 2] * delta;
            vels[j * 3 + 1] -= 9.8 * delta; // Gravity
        }
        pSystem.geometry.attributes.position.needsUpdate = true;
    }
}

// Input Event Handlers
function setupInputs() {
    window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || e.key === 'ArrowUp') inputKeys.w = true;
        if (k === 's' || e.key === 'ArrowDown') inputKeys.s = true;
        if (k === 'a' || e.key === 'ArrowLeft') inputKeys.a = true;
        if (k === 'd' || e.key === 'ArrowRight') inputKeys.d = true;
        if (e.key === ' ') inputKeys.space = true;
        if (e.key === 'Shift') inputKeys.shift = true;
        if (k === 'f' || k === 'e') {
            toggleFlightMode();
        }
        if (k === 'c') {
            cameraMode = (cameraMode + 1) % 3;
        }
        if (k === 'r') {
            resetPlayerPosition();
        }
        if (e.key === 'Escape' || k === 'p') {
            togglePauseGame();
        }
    });

    window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || e.key === 'ArrowUp') inputKeys.w = false;
        if (k === 's' || e.key === 'ArrowDown') inputKeys.s = false;
        if (k === 'a' || e.key === 'ArrowLeft') inputKeys.a = false;
        if (k === 'd' || e.key === 'ArrowRight') inputKeys.d = false;
        if (e.key === ' ') inputKeys.space = false;
        if (e.key === 'Shift') inputKeys.shift = false;
    });

    // Touch Button Controls
    setupTouchControls();
}

function setupTouchControls() {
    const bindTouch = (id, key) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); inputKeys[key] = true; });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); inputKeys[key] = false; });
    };

    bindTouch('btn-left', 'a');
    bindTouch('btn-right', 'd');
    bindTouch('btn-accel', 'w');
    bindTouch('btn-brake', 's');
    bindTouch('btn-boost', 'shift');

    const flyBtn = document.getElementById('btn-fly');
    if (flyBtn) {
        flyBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleFlightMode(); });
    }
}

function toggleFlightMode() {
    isFlyingMode = !isFlyingMode;
    const indicator = document.getElementById('flight-indicator');
    if (indicator) {
        if (isFlyingMode) {
            indicator.className = 'flight-status-badge flying';
            indicator.innerHTML = '<i class="fas fa-plane"></i> FLIGHT MODE';
        } else {
            indicator.className = 'flight-status-badge';
            indicator.innerHTML = '<i class="fas fa-car"></i> GROUND MODE';
        }
    }
}

function resetPlayerPosition() {
    if (playerVehicle) {
        playerVehicle.position.set(0, 5, 0);
        playerVehicle.rotation.set(0, 0, 0);
        playerVelocity.set(0, 0, 0);
        playerSpeed = 0;
    }
}

// Vehicle Physics Update Loop
function updatePlayerPhysics(delta) {
    if (!playerVehicle) return;

    const carData = CAR_DATABASE[gameState.selectedCarIndex];
    const upgrades = gameState.carUpgrades[gameState.selectedCarIndex];

    const maxSpeed = (carData.baseSpeed + upgrades.speed * 10) * (inputKeys.shift && playerNitro > 0 ? 1.6 : 1.0);
    const accelRate = 40 + upgrades.speed * 5;
    const turnSpeed = 2.2;

    // Wing Animation Interpolation
    const leftWing = playerVehicle.userData.leftWingGroup;
    const rightWing = playerVehicle.userData.rightWingGroup;
    const targetWingAngle = isFlyingMode ? Math.PI / 2 : 0;

    leftWing.rotation.z = THREE.MathUtils.lerp(leftWing.rotation.z, -targetWingAngle, delta * 5);
    rightWing.rotation.z = THREE.MathUtils.lerp(rightWing.rotation.z, targetWingAngle, delta * 5);

    // Nitro consumption
    if (inputKeys.shift && playerNitro > 0 && (inputKeys.w || isFlyingMode)) {
        playerNitro = Math.max(0, playerNitro - delta * 30);
    } else if (playerNitro < 100) {
        playerNitro = Math.min(100, playerNitro + delta * 15);
    }

    if (isFlyingMode) {
        // --- FLIGHT DYNAMICS ---
        if (inputKeys.w) playerSpeed = THREE.MathUtils.lerp(playerSpeed, maxSpeed, delta * 2);
        else playerSpeed = THREE.MathUtils.lerp(playerSpeed, 20, delta);

        if (inputKeys.a) playerVehicle.rotation.y += turnSpeed * delta;
        if (inputKeys.d) playerVehicle.rotation.y -= turnSpeed * delta;

        // Pitch Flight Control
        if (inputKeys.space) {
            playerVehicle.position.y += (25 + upgrades.flight * 3) * delta;
        } else {
            // Slight downward gravity float
            playerVehicle.position.y -= 4 * delta;
        }

        // Keep vehicle above ground
        if (playerVehicle.position.y < 2) {
            playerVehicle.position.y = 2;
        }

        // Apply Flight Forward Vector
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerVehicle.quaternion);
        playerVehicle.position.addScaledVector(forward, playerSpeed * delta);

    } else {
        // --- GROUND DRIVING DYNAMICS ---
        if (inputKeys.w) {
            playerSpeed = Math.min(maxSpeed, playerSpeed + accelRate * delta);
        } else if (inputKeys.s) {
            playerSpeed = Math.max(-maxSpeed * 0.4, playerSpeed - accelRate * delta);
        } else {
            playerSpeed = THREE.MathUtils.lerp(playerSpeed, 0, delta * 2);
        }

        if (Math.abs(playerSpeed) > 1) {
            const dir = playerSpeed > 0 ? 1 : -1;
            if (inputKeys.a) playerVehicle.rotation.y += turnSpeed * dir * delta;
            if (inputKeys.d) playerVehicle.rotation.y -= turnSpeed * dir * delta;
        }

        // Platform Ground Support & Void Physics Check
        let currentPlatformY = null;
        const px = playerVehicle.position.x;
        const pz = playerVehicle.position.z;

        for (const tile of floatingTiles) {
            if (!tile.collapsed && px >= tile.bounds.minX && px <= tile.bounds.maxX && pz >= tile.bounds.minZ && pz <= tile.bounds.maxZ) {
                const topY = tile.bounds.topY !== undefined ? tile.bounds.topY : tile.mesh.position.y + 1;
                if (playerVehicle.position.y >= topY - 1.5) {
                    currentPlatformY = topY;
                    break;
                }
            }
        }

        if (currentPlatformY !== null) {
            // Vehicle is supported by a floating sky platform
            if (playerVehicle.position.y > currentPlatformY + 0.1) {
                playerVelocity.y -= 25 * delta;
                playerVehicle.position.y += playerVelocity.y * delta;
                if (playerVehicle.position.y <= currentPlatformY) {
                    playerVehicle.position.y = currentPlatformY;
                    playerVelocity.y = 0;
                }
            } else {
                playerVehicle.position.y = currentPlatformY;
                playerVelocity.y = 0;
            }
        } else {
            // Open Sky Space - No land beneath! Apply freefall gravity
            playerVelocity.y -= 35 * delta;
            playerVehicle.position.y += playerVelocity.y * delta;
        }

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerVehicle.quaternion);
        playerVehicle.position.addScaledVector(forward, playerSpeed * delta);
    }

    // Sound Pitch Update
    soundManager.updateEnginePitch(Math.abs(playerSpeed));

    // Endless Sky Void Fall Check (Explosion into Abyss)
    if (playerVehicle.position.y < -18) {
        createParticleExplosion(playerVehicle.position, 0xff0055);
        soundManager.playExplosion();
        takeDamage(40);
        if (playerHealth > 0) {
            resetPlayerPosition();
        }
    }
}

// AI Opponent Logic & Survival Ramming
function updateAIPhysics(delta) {
    enemies.forEach((enemy, index) => {
        if (!playerVehicle) return;

        const distToPlayer = enemy.mesh.position.distanceTo(playerVehicle.position);

        // Steering towards player
        const dir = new THREE.Vector3().subVectors(playerVehicle.position, enemy.mesh.position).normalize();
        const targetAngle = Math.atan2(dir.x, dir.z) + Math.PI;

        enemy.mesh.rotation.y = THREE.MathUtils.lerp(enemy.mesh.rotation.y, targetAngle, delta * 2);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.mesh.quaternion);
        enemy.mesh.position.addScaledVector(forward, enemy.speed * delta);

        // AI Platform Ground vs Sky Void Gravity
        let aiPlatformY = null;
        for (const tile of floatingTiles) {
            if (!tile.collapsed && enemy.mesh.position.x >= tile.bounds.minX && enemy.mesh.position.x <= tile.bounds.maxX && enemy.mesh.position.z >= tile.bounds.minZ && enemy.mesh.position.z <= tile.bounds.maxZ) {
                aiPlatformY = tile.bounds.topY !== undefined ? tile.bounds.topY : tile.mesh.position.y + 1;
                break;
            }
        }

        if (distToPlayer < 40 && playerVehicle.position.y > 5) {
            enemy.mesh.position.y = THREE.MathUtils.lerp(enemy.mesh.position.y, playerVehicle.position.y, delta * 2);
        } else if (aiPlatformY !== null) {
            enemy.mesh.position.y = THREE.MathUtils.lerp(enemy.mesh.position.y, aiPlatformY, delta * 5);
        } else {
            // No platform underneath AI - fall into sky void!
            enemy.mesh.position.y -= 35 * delta;
        }

        // AI Sky Void Fall Destruction
        if (enemy.mesh.position.y < -18) {
            createParticleExplosion(enemy.mesh.position, 0xff0000);
            soundManager.playExplosion();
            scene.remove(enemy.mesh);
            enemies.splice(index, 1);

            gameState.kills++;
            gameState.score += 500;
            gameState.coins += 100;
            updateHUD();

            if (enemies.length === 0 && gameState.selectedMode === 'survival') {
                advanceWave();
            }
            return;
        }

        // Vehicle Ramming Collision
        if (distToPlayer < 3.5) {
            soundManager.playImpact();
            takeDamage(15);
            createParticleExplosion(playerVehicle.position, 0xffff00);

            // Bounce physics force
            playerSpeed = -playerSpeed * 0.5;
            enemy.health -= 35;

            if (enemy.health <= 0) {
                createParticleExplosion(enemy.mesh.position, 0xff0000);
                soundManager.playExplosion();
                scene.remove(enemy.mesh);
                enemies.splice(index, 1);

                gameState.kills++;
                gameState.score += 500;
                gameState.coins += 100;
                updateHUD();

                if (enemies.length === 0 && gameState.selectedMode === 'survival') {
                    advanceWave();
                }
            }
        }
    });
}

// Checkpoint Ring Collision in Race Mode
function updateRingCheckpoints() {
    if (gameState.selectedMode !== 'race' || !playerVehicle) return;

    let closestDist = Infinity;

    ringCheckpoints.forEach(ring => {
        if (ring.passed) return;

        const dist = playerVehicle.position.distanceTo(ring.position);
        if (dist < closestDist) closestDist = dist;

        if (dist < 10) {
            ring.passed = true;
            ring.mesh.material.color.setHex(0x00ff66);
            soundManager.playPickup();
            createParticleExplosion(ring.position, 0x00ff66);

            gameState.checkpointsPassed++;
            gameState.score += 1000;
            gameState.coins += 50;
            updateHUD();

            if (gameState.checkpointsPassed >= gameState.totalRings) {
                triggerGameOver(true);
            }
        }
    });

    const ringTracker = document.getElementById('ring-distance-tracker');
    const ringVal = document.getElementById('ring-dist-value');
    if (ringTracker && ringVal) {
        if (closestDist < Infinity) {
            ringTracker.classList.remove('hidden');
            ringVal.textContent = Math.round(closestDist) + 'm';
        } else {
            ringTracker.classList.add('hidden');
        }
    }
}

function takeDamage(amount) {
    playerHealth = Math.max(0, playerHealth - amount);
    updateHUD();

    if (playerHealth <= 0) {
        soundManager.playExplosion();
        createParticleExplosion(playerVehicle.position, 0xff0055);
        triggerGameOver(false);
    }
}

function advanceWave() {
    gameState.wave++;
    gameState.score += 2000;
    gameState.coins += 300;
    updateHUD();
    spawnEnemies(3 + gameState.wave);
}

// Smooth Camera Chase Rig
function updateCamera() {
    if (!playerVehicle) return;

    let targetOffset;
    if (cameraMode === 0) { // Standard Chase
        targetOffset = new THREE.Vector3(0, 6, 14);
    } else if (cameraMode === 1) { // Close Action
        targetOffset = new THREE.Vector3(0, 3, 8);
    } else { // High Top Down
        targetOffset = new THREE.Vector3(0, 35, 2);
    }

    const relativeOffset = targetOffset.applyQuaternion(playerVehicle.quaternion);
    const cameraTarget = playerVehicle.position.clone().add(relativeOffset);

    camera.position.lerp(cameraTarget, 0.1);
    camera.lookAt(playerVehicle.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
}

// Render Minimap Radar Overlay
function updateMinimap() {
    const miniCanvas = document.getElementById('minimap-canvas');
    if (!miniCanvas || !playerVehicle) return;
    const ctx = miniCanvas.getContext('2d');
    const w = miniCanvas.width;
    const h = miniCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10, 11, 16, 0.8)';
    ctx.fillRect(0, 0, w, h);

    const scale = 0.4;
    const cx = w / 2;
    const cy = h / 2;

    // Draw Radar Rings
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 55, 0, Math.PI * 2); ctx.stroke();

    // Draw Player Blip
    ctx.fillStyle = '#00f3ff';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();

    // Draw Enemies Blips
    ctx.fillStyle = '#ff0055';
    enemies.forEach(e => {
        const dx = (e.mesh.position.x - playerVehicle.position.x) * scale;
        const dz = (e.mesh.position.z - playerVehicle.position.z) * scale;
        if (Math.abs(dx) < cx - 5 && Math.abs(dz) < cy - 5) {
            ctx.beginPath(); ctx.arc(cx + dx, cy + dz, 4, 0, Math.PI * 2); ctx.fill();
        }
    });

    // Draw Rings Blips
    ctx.fillStyle = '#ffe600';
    ringCheckpoints.forEach(r => {
        if (r.passed) return;
        const dx = (r.position.x - playerVehicle.position.x) * scale;
        const dz = (r.position.z - playerVehicle.position.z) * scale;
        if (Math.abs(dx) < cx - 5 && Math.abs(dz) < cy - 5) {
            ctx.beginPath(); ctx.arc(cx + dx, cy + dz, 3, 0, Math.PI * 2); ctx.fill();
        }
    });
}

// HUD Elements Update
function updateHUD() {
    document.getElementById('menu-coins').textContent = gameState.coins.toLocaleString();
    document.getElementById('garage-coins').textContent = gameState.coins.toLocaleString();
    document.getElementById('hud-coins').textContent = gameState.coins.toLocaleString();
    document.getElementById('hud-score').textContent = gameState.score.toString().padStart(5, '0');

    // Health Fill
    const healthPercent = Math.max(0, Math.round((playerHealth / maxPlayerHealth) * 100));
    document.getElementById('health-value').textContent = healthPercent + '%';
    document.getElementById('health-bar-fill').style.width = healthPercent + '%';

    // Speedometer
    const currentSpeedKm = Math.round(Math.abs(playerSpeed) * 2.5);
    document.getElementById('speed-value').textContent = currentSpeedKm;
    const needleDeg = -120 + Math.min(240, (currentSpeedKm / 280) * 240);
    const needle = document.getElementById('speed-needle');
    if (needle) needle.style.transform = `rotate(${needleDeg}deg)`;

    // Altitude
    const altMeters = playerVehicle ? Math.max(0, Math.round(playerVehicle.position.y)) : 0;
    document.getElementById('altitude-value').textContent = altMeters + 'm';
    document.getElementById('altitude-bar-fill').style.width = Math.min(100, (altMeters / 100) * 100) + '%';

    // Nitro
    document.getElementById('nitro-value').textContent = Math.round(playerNitro) + '%';
    document.getElementById('nitro-bar-fill').style.width = playerNitro + '%';

    // Mode Specific Secondary Counters
    const modeLabel = document.getElementById('mode-hud-label');
    const secLabel = document.getElementById('secondary-hud-label');
    const primaryVal = document.getElementById('hud-primary-counter');
    const secVal = document.getElementById('hud-secondary-counter');

    if (gameState.selectedMode === 'survival') {
        modeLabel.textContent = 'SURVIVAL WAVE';
        secLabel.textContent = 'OPPONENTS LEFT';
        primaryVal.textContent = 'WAVE ' + gameState.wave;
        secVal.textContent = enemies.length;
    } else if (gameState.selectedMode === 'race') {
        modeLabel.textContent = 'CHECKPOINTS';
        secLabel.textContent = 'RACE MODE';
        primaryVal.textContent = gameState.checkpointsPassed + ' / ' + gameState.totalRings;
        secVal.textContent = 'AERIAL';
    } else {
        modeLabel.textContent = 'FREE FLY';
        secLabel.textContent = 'STUNT ARENA';
        primaryVal.textContent = 'INFINITE';
        secVal.textContent = 'UNLIMITED';
    }
}

// Game Loop & Clock Delta
let clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    if (!gameState.isPaused && !gameState.isGameOver) {
        updatePlayerPhysics(delta);
        updateAIPhysics(delta);
        updateRingCheckpoints();
        updateShatterables(delta);
        updateSpeedBoostArches(delta);
        updateFloatingTiles(delta);
        updateParticles(delta);
        updateCamera();
        updateMinimap();
    }

    renderer.render(scene, camera);
}

// Window Resize Responsive
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Game Screen & Mode Controller Functions
function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('garage-screen').classList.add('hidden');
    document.getElementById('game-hud').classList.remove('hidden');

    gameState.isGameOver = false;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.wave = 1;
    gameState.kills = 0;
    gameState.checkpointsPassed = 0;

    const carData = CAR_DATABASE[gameState.selectedCarIndex];
    const upgrades = gameState.carUpgrades[gameState.selectedCarIndex];
    maxPlayerHealth = carData.baseArmor + upgrades.armor * 20;
    playerHealth = maxPlayerHealth;
    playerNitro = 100;

    // Spawn Selected Player Vehicle
    if (playerVehicle) scene.remove(playerVehicle);
    playerVehicle = createVehicleMesh(carData);
    playerVehicle.position.set(0, 1, 0);
    scene.add(playerVehicle);

    soundManager.playEngine();

    if (gameState.selectedMode === 'survival') {
        spawnEnemies(4);
    } else if (gameState.selectedMode === 'race') {
        enemies.forEach(e => scene.remove(e.mesh));
        enemies = [];
        spawnRingCheckpoints();
    } else {
        enemies.forEach(e => scene.remove(e.mesh));
        enemies = [];
        ringCheckpoints.forEach(r => scene.remove(r.mesh));
        ringCheckpoints = [];
    }

    updateHUD();
}

function triggerGameOver(isWin) {
    gameState.isGameOver = true;
    soundManager.stopEngine();

    const overScreen = document.getElementById('game-over-screen');
    const title = document.getElementById('result-title');
    const subtitle = document.getElementById('result-subtitle');

    overScreen.classList.remove('hidden');

    if (isWin) {
        title.className = 'result-win';
        title.textContent = 'VICTORY!';
        subtitle.textContent = 'You dominated the cyber arena as the ARENA KING!';
    } else {
        title.className = 'result-lose';
        title.textContent = 'DEMOLISHED';
        subtitle.textContent = 'Your vehicle hull was destroyed in combat!';
    }

    document.getElementById('res-wave').textContent = gameState.selectedMode === 'race' ? gameState.checkpointsPassed : gameState.wave;
    document.getElementById('res-kills').textContent = gameState.kills;
    document.getElementById('res-coins').textContent = '+' + (gameState.kills * 100 + gameState.checkpointsPassed * 50);
    document.getElementById('res-score').textContent = gameState.score;

    saveData();
}

function togglePauseGame() {
    if (gameState.isGameOver) return;
    gameState.isPaused = !gameState.isPaused;

    const pauseScreen = document.getElementById('pause-screen');
    if (gameState.isPaused) {
        pauseScreen.classList.remove('hidden');
        soundManager.stopEngine();
    } else {
        pauseScreen.classList.add('hidden');
        soundManager.playEngine();
    }
}

// Garage & Shop Logic Controller
function updateGarageView() {
    const car = CAR_DATABASE[gameState.selectedCarIndex];
    const isUnlocked = gameState.unlockedCars[gameState.selectedCarIndex];
    const upgrades = gameState.carUpgrades[gameState.selectedCarIndex];

    document.getElementById('car-name').textContent = car.name;
    const badge = document.getElementById('car-status');

    if (isUnlocked) {
        badge.textContent = 'UNLOCKED';
        badge.className = 'car-badge';
        document.getElementById('select-car-btn').classList.remove('hidden');
        document.getElementById('buy-car-btn').classList.add('hidden');
    } else {
        badge.textContent = 'LOCKED';
        badge.className = 'car-badge locked';
        document.getElementById('select-car-btn').classList.add('hidden');
        const buyBtn = document.getElementById('buy-car-btn');
        buyBtn.classList.remove('hidden');
        buyBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> BUY FOR ${car.price} COINS`;
    }

    // Stat Fill Progress Bars
    document.getElementById('stat-speed').style.width = (car.baseSpeed / 120 * 100 + upgrades.speed * 10) + '%';
    document.getElementById('stat-armor').style.width = (car.baseArmor / 220 * 100 + upgrades.armor * 10) + '%';
    document.getElementById('stat-boost').style.width = (car.baseBoost / 200 * 100 + upgrades.boost * 10) + '%';
    document.getElementById('stat-flight').style.width = (car.baseFlight / 120 * 100 + upgrades.flight * 10) + '%';

    // Show 3D preview vehicle in garage
    if (playerVehicle) scene.remove(playerVehicle);
    playerVehicle = createVehicleMesh(car);
    playerVehicle.position.set(0, 1, 0);
    scene.add(playerVehicle);
}

// UI Event Handlers & Initializers
function setupUIEvents() {
    // Mode Selection Cards
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            gameState.selectedMode = card.getAttribute('data-mode');
        });
    });

    // Main Menu Navigation
    document.getElementById('start-btn').addEventListener('click', startGame);

    document.getElementById('garage-btn').addEventListener('click', () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('garage-screen').classList.remove('hidden');
        updateGarageView();
    });

    document.getElementById('garage-back-btn').addEventListener('click', () => {
        document.getElementById('garage-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });

    document.getElementById('controls-btn').addEventListener('click', () => {
        document.getElementById('controls-modal').classList.remove('hidden');
    });

    document.getElementById('close-controls-btn').addEventListener('click', () => {
        document.getElementById('controls-modal').classList.add('hidden');
    });

    // Sound Toggle Button
    document.getElementById('audio-toggle-btn').addEventListener('click', () => {
        gameState.soundEnabled = !gameState.soundEnabled;
        const btn = document.getElementById('audio-toggle-btn');
        btn.innerHTML = gameState.soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    });

    // Garage Carousel & Actions
    document.getElementById('prev-car-btn').addEventListener('click', () => {
        gameState.selectedCarIndex = (gameState.selectedCarIndex - 1 + CAR_DATABASE.length) % CAR_DATABASE.length;
        updateGarageView();
    });

    document.getElementById('next-car-btn').addEventListener('click', () => {
        gameState.selectedCarIndex = (gameState.selectedCarIndex + 1) % CAR_DATABASE.length;
        updateGarageView();
    });

    document.getElementById('buy-car-btn').addEventListener('click', () => {
        const car = CAR_DATABASE[gameState.selectedCarIndex];
        if (gameState.coins >= car.price) {
            gameState.coins -= car.price;
            gameState.unlockedCars[gameState.selectedCarIndex] = true;
            saveData();
            updateHUD();
            updateGarageView();
            soundManager.playPickup();
        } else {
            alert("Not enough coins! Win arena survival matches to earn more coins.");
        }
    });

    document.getElementById('select-car-btn').addEventListener('click', () => {
        document.getElementById('garage-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });

    // Stat Upgrade Buttons
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const stat = btn.getAttribute('data-stat');
            const cost = 200;
            if (gameState.coins >= cost) {
                const upgrades = gameState.carUpgrades[gameState.selectedCarIndex];
                if (upgrades[stat] < 5) {
                    gameState.coins -= cost;
                    upgrades[stat]++;
                    saveData();
                    updateHUD();
                    updateGarageView();
                    soundManager.playPickup();
                }
            }
        });
    });

    // Pause & Result Modal Buttons
    document.getElementById('pause-btn').addEventListener('click', togglePauseGame);
    document.getElementById('resume-btn').addEventListener('click', togglePauseGame);
    document.getElementById('restart-btn').addEventListener('click', () => {
        togglePauseGame();
        startGame();
    });

    document.getElementById('pause-garage-btn').addEventListener('click', () => {
        togglePauseGame();
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('garage-screen').classList.remove('hidden');
        updateGarageView();
    });

    document.getElementById('pause-menu-btn').addEventListener('click', () => {
        togglePauseGame();
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });

    document.getElementById('play-again-btn').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        startGame();
    });

    document.getElementById('result-garage-btn').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('garage-screen').classList.remove('hidden');
        updateGarageView();
    });

    document.getElementById('result-menu-btn').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });
}

// Window OnLoad Initialization Entry Point
window.addEventListener('load', () => {
    loadSavedData();
    initThreeScene();
    setupInputs();
    setupUIEvents();
    updateHUD();

    // Default Main Menu Preview Vehicle
    playerVehicle = createVehicleMesh(CAR_DATABASE[0]);
    playerVehicle.position.set(0, 1, 0);
    scene.add(playerVehicle);

    animate();
});
