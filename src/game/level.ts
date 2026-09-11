import * as THREE from 'three';
import { PlatformObstacle, ItemId } from '../types';
import { createPickupMesh } from './inventory';

export interface LevelData {
  group: THREE.Group;
  solidColliders: { mesh: THREE.Mesh; box: THREE.Box3; type: PlatformObstacle['type'] }[];
  hazardColliders: { mesh: THREE.Mesh; box: THREE.Box3; type: 'lava' | 'spinner' }[];
  bounceColliders: { mesh: THREE.Mesh; box: THREE.Box3; power: number }[];
  checkpoints: { id: number; position: [number, number, number]; padMesh: THREE.Mesh; lightMesh: THREE.Mesh; box: THREE.Box3 }[];
  coins: { id: number; mesh: THREE.Group; position: [number, number, number]; collected: boolean }[];
  pickups: { id: string; itemId: ItemId; position: [number, number, number]; mesh: THREE.Group; collected: boolean; respawnTimer: number }[];
  animatedObstacles: {
    mesh: THREE.Mesh | THREE.Group;
    update: (time: number, delta: number) => void;
    collider?: { mesh: THREE.Mesh; box: THREE.Box3; type: 'lava' | 'spinner' | 'solid' };
  }[];
  finishPad: { mesh: THREE.Mesh; box: THREE.Box3 };
  trophy: THREE.Group;
  mode: 'single' | 'race_dual';
  laneOffset: number; // -7.5 for Lane 1 in race_dual, 0 for single
  totalStages: number;
}

// Single shared high-performance stud texture (no memory leak, no duplicate canvases)
let sharedStudTexture: THREE.CanvasTexture | null = null;
function getSharedStudTexture(): THREE.CanvasTexture {
  if (!sharedStudTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Base background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 64, 64);

    // Subtle dark border
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 62, 62);

    // 4 Roblox Studs
    const centers = [[16, 16], [48, 16], [16, 48], [48, 48]];
    centers.forEach(([x, y]) => {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(x + 1, y + 2, 8.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#eeeeee';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 5.5, 0, Math.PI * 2);
      ctx.fill();
    });

    sharedStudTexture = new THREE.CanvasTexture(canvas);
    sharedStudTexture.wrapS = THREE.RepeatWrapping;
    sharedStudTexture.wrapT = THREE.RepeatWrapping;
  }
  return sharedStudTexture;
}

// Material cache by color hex to reuse shaders & drop draw-calls
const materialCache = new Map<number, THREE.MeshStandardMaterial>();
function getCachedMaterial(colorHex: number, emissiveIntensity = 0.25): THREE.MeshStandardMaterial {
  if (materialCache.has(colorHex)) {
    return materialCache.get(colorHex)!;
  }
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.35,
    metalness: 0.12,
    emissive: colorHex,
    emissiveIntensity: emissiveIntensity,
  });
  materialCache.set(colorHex, mat);
  return mat;
}

export function buildObbyLevel(mode: 'single' | 'race_dual' = 'single'): LevelData {
  const group = new THREE.Group();

  const solidColliders: LevelData['solidColliders'] = [];
  const hazardColliders: LevelData['hazardColliders'] = [];
  const bounceColliders: LevelData['bounceColliders'] = [];
  const checkpoints: LevelData['checkpoints'] = [];
  const coins: LevelData['coins'] = [];
  const pickups: LevelData['pickups'] = [];
  const animatedObstacles: LevelData['animatedObstacles'] = [];

  // Glow materials for Night Obby
  const neonRedLavaMat = new THREE.MeshStandardMaterial({
    color: 0xff0033,
    emissive: 0xff0022,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  const neonGreenPadMat = new THREE.MeshStandardMaterial({
    color: 0x00ff66,
    emissive: 0x00ee44,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  const inactiveCheckpointMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xaa5500,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });

  const yellowBounceMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xff9900,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });

  const goldCoinMat = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    metalness: 0.85,
    roughness: 0.15,
    emissive: 0xff8800,
    emissiveIntensity: 0.4,
  });

  // Reusable geometries
  const coinGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.2, 16);
  const cpBaseGeo = new THREE.CylinderGeometry(2.3, 2.4, 0.35, 20);
  const cpLightGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.4, 20);

  // Helper to add solid block
  function addBlock(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    colorHex: number,
    options?: { isHazard?: boolean; registerCollision?: boolean }
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = options?.isHazard ? neonRedLavaMat : getCachedMaterial(colorHex);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.receiveShadow = true;
    group.add(mesh);

    if (options?.registerCollision !== false) {
      const box = new THREE.Box3();
      box.setFromObject(mesh);

      if (options?.isHazard) {
        hazardColliders.push({ mesh, box, type: 'lava' });
      } else {
        solidColliders.push({ mesh, box, type: 'solid' });
      }
    }

    return mesh;
  }

  // Helper to add bounce trampoline
  function addBouncePad(x: number, y: number, z: number, power = 30, registerCollision = true): THREE.Mesh {
    const baseGeo = new THREE.BoxGeometry(3.6, 0.4, 3.6);
    const baseMat = getCachedMaterial(0x222233, 0.1);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(x, y - 0.2, z);
    group.add(base);

    const padGeo = new THREE.BoxGeometry(3.2, 0.5, 3.2);
    const pad = new THREE.Mesh(padGeo, yellowBounceMat);
    pad.position.set(x, y + 0.25, z);
    group.add(pad);

    if (registerCollision) {
      const box = new THREE.Box3();
      box.setFromObject(pad);
      bounceColliders.push({ mesh: pad, box, power });
      solidColliders.push({ mesh: pad, box, type: 'bounce' });
    }

    return pad;
  }

  // Helper to add checkpoint
  function addCheckpoint(id: number, x: number, y: number, z: number, registerCollision = true) {
    const baseMat = getCachedMaterial(0xffffff, 0.2);
    const padMesh = new THREE.Mesh(cpBaseGeo, baseMat);
    padMesh.position.set(x, y + 0.17, z);
    group.add(padMesh);

    const lightMesh = new THREE.Mesh(cpLightGeo, id === 1 ? neonGreenPadMat : inactiveCheckpointMat);
    lightMesh.position.set(x, y + 0.22, z);
    group.add(lightMesh);

    // Neon Flag pole
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8);
    const poleMat = getCachedMaterial(0x8899aa, 0.3);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x - 1.4, y + 1.8, z);
    group.add(pole);

    // Flag banner
    const flagGeo = new THREE.BoxGeometry(0.9, 0.6, 0.05);
    const flagMat = getCachedMaterial(id === 1 ? 0x00ff66 : 0xffaa00, 0.8);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(x - 0.95, y + 3.1, z);
    group.add(flag);

    if (registerCollision) {
      const box = new THREE.Box3();
      box.setFromCenterAndSize(new THREE.Vector3(x, y + 1.5, z), new THREE.Vector3(4.2, 3.5, 4.2));
      checkpoints.push({
        id,
        position: [x, y + 0.5, z],
        padMesh,
        lightMesh,
        box,
      });
    }
  }

  let coinCounter = 1;
  function addCoin(x: number, y: number, z: number) {
    const coinGroup = new THREE.Group();
    coinGroup.position.set(x, y, z);

    const coinMesh = new THREE.Mesh(coinGeo, goldCoinMat);
    coinMesh.rotation.x = Math.PI / 2;
    coinGroup.add(coinMesh);

    group.add(coinGroup);

    coins.push({
      id: coinCounter++,
      mesh: coinGroup,
      position: [x, y, z],
      collected: false,
    });
  }

  function addPickup(id: string, itemId: ItemId, x: number, y: number, z: number) {
    const mesh = createPickupMesh(itemId);
    mesh.position.set(x, y, z);
    group.add(mesh);

    pickups.push({
      id,
      itemId,
      position: [x, y, z],
      mesh,
      collected: false,
      respawnTimer: 0,
    });
  }

  // Lane Configuration
  // In single player: 1 track at X = 0
  // In race_dual: 2 tracks at X = -7.5 (Lane 1, player) and X = +7.5 (Lane 2, opponent)
  const lanes = mode === 'race_dual' ? [-7.5, 7.5] : [0];
  const primaryLaneX = mode === 'race_dual' ? -7.5 : 0;
  const totalStages = 15;

  // Build tracks for each lane
  lanes.forEach((laneX) => {
    const isPlayerLane = laneX === primaryLaneX;

    let curY = 0;
    let curZ = 0;

    // SPAWN PLATFORM (Stage 1)
    addBlock(laneX, curY, curZ, 8, 1.2, 8, 0x1e90ff, { registerCollision: isPlayerLane });
    addCheckpoint(1, laneX, curY + 1.2, curZ, isPlayerLane);

    // =========================================================================
    // 15 HANDCRAFTED CHALLENGING ROBLOX STAGES
    // =========================================================================

    // Stage 1: Neon Warm-Up Jumps (varying heights over the void)
    curZ += 8;
    const stepColors = [0x00f3ff, 0xff007f, 0x00ff88, 0xffbb00];
    for (let i = 0; i < 4; i++) {
      curZ += 4.2;
      const stepY = curY + Math.sin(i * 1.2) * 0.8;
      addBlock(laneX + (i % 2 === 0 ? -1.2 : 1.2), stepY, curZ, 2.8, 0.8, 2.8, stepColors[i], { registerCollision: isPlayerLane });
      if (isPlayerLane && i % 2 === 1) addCoin(laneX + (i % 2 === 0 ? -1.2 : 1.2), stepY + 1.6, curZ);
    }
    curZ += 6;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0x00f3ff, { registerCollision: isPlayerLane });
    addCheckpoint(2, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 2: Neon Red Killbrick Jump-Overs (Catwalk with glowing lava bars)
    curZ += 6;
    addBlock(laneX, curY, curZ + 10, 3.2, 0.8, 20, 0x334466, { registerCollision: isPlayerLane });
    for (let i = 0; i < 4; i++) {
      const kbZ = curZ + 3 + i * 4.5;
      const kb = addBlock(laneX, curY + 0.8, kbZ, 3.4, 0.6, 0.6, 0xff0022, {
        isHazard: isPlayerLane,
        registerCollision: isPlayerLane,
      });
      if (isPlayerLane) addCoin(laneX, curY + 2.4, kbZ);
    }
    curZ += 22;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0xff007f, { registerCollision: isPlayerLane });
    addCheckpoint(3, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 3: Star Stepping Stones (Cylindrical Pillars staggered left/right)
    curZ += 6;
    for (let i = 0; i < 5; i++) {
      curZ += 4.5;
      const offset = (i % 2 === 0 ? -1.6 : 1.6);
      addBlock(laneX + offset, curY + i * 0.3, curZ, 2.4, 1.2, 2.4, 0x9b59b6, { registerCollision: isPlayerLane });
      if (isPlayerLane && i === 2) addPickup(`pickup_${laneX}_1`, 'speed_potion', laneX + offset, curY + i * 0.3 + 2.0, curZ);
    }
    curY += 1.5;
    curZ += 6;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0x9b59b6, { registerCollision: isPlayerLane });
    addCheckpoint(4, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 4: Classic Roblox Wall-Wrap (Jumping around a high floating wall)
    curZ += 6;
    // Walkway up to wall
    addBlock(laneX, curY, curZ + 4, 2.8, 0.8, 8, 0x00d2d3, { registerCollision: isPlayerLane });
    // High partition wall blocking direct forward path
    addBlock(laneX, curY + 0.8, curZ + 8, 1.2, 5.5, 0.8, 0x111625, { registerCollision: isPlayerLane });
    // Left outer stepping ledge to wrap around
    addBlock(laneX - 2.8, curY, curZ + 8, 1.8, 0.8, 1.8, 0x00d2d3, { registerCollision: isPlayerLane });
    // Landing pad on other side
    addBlock(laneX, curY, curZ + 12, 2.8, 0.8, 6, 0x00d2d3, { registerCollision: isPlayerLane });
    curZ += 16;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0x00d2d3, { registerCollision: isPlayerLane });
    addCheckpoint(5, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 5: Rotating Laser Spinners (Cross beams that rotate)
    curZ += 6;
    // Circular arena
    addBlock(laneX, curY, curZ + 8, 8, 0.8, 16, 0x2c3e50, { registerCollision: isPlayerLane });

    // Spinner 1
    const spinnerGroup1 = new THREE.Group();
    spinnerGroup1.position.set(laneX, curY + 1.2, curZ + 5);
    const armGeo = new THREE.BoxGeometry(7.5, 0.5, 0.5);
    const arm1 = new THREE.Mesh(armGeo, neonRedLavaMat);
    const arm2 = new THREE.Mesh(armGeo, neonRedLavaMat);
    arm2.rotation.y = Math.PI / 2;
    spinnerGroup1.add(arm1, arm2);
    group.add(spinnerGroup1);

    const spin1Box = new THREE.Box3();
    if (isPlayerLane) {
      hazardColliders.push({ mesh: arm1, box: spin1Box, type: 'spinner' });
    }

    animatedObstacles.push({
      mesh: spinnerGroup1,
      update: (t) => {
        spinnerGroup1.rotation.y = t * 1.8;
        if (isPlayerLane) spin1Box.setFromObject(spinnerGroup1);
      },
    });

    // Spinner 2 (rotates opposite)
    const spinnerGroup2 = new THREE.Group();
    spinnerGroup2.position.set(laneX, curY + 1.2, curZ + 11);
    const arm3 = new THREE.Mesh(armGeo, neonRedLavaMat);
    spinnerGroup2.add(arm3);
    group.add(spinnerGroup2);

    const spin2Box = new THREE.Box3();
    if (isPlayerLane) {
      hazardColliders.push({ mesh: arm3, box: spin2Box, type: 'spinner' });
    }

    animatedObstacles.push({
      mesh: spinnerGroup2,
      update: (t) => {
        spinnerGroup2.rotation.y = -t * 2.2;
        if (isPlayerLane) spin2Box.setFromObject(spinnerGroup2);
      },
    });

    curZ += 18;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0xff4757, { registerCollision: isPlayerLane });
    addCheckpoint(6, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 6: Disappearing / Blinking Neon Platforms
    curZ += 6;
    for (let i = 0; i < 3; i++) {
      curZ += 4.5;
      const blinkMesh = addBlock(laneX, curY, curZ, 3.2, 0.8, 3.2, 0x2ed573, { registerCollision: isPlayerLane });
      const phaseOffset = i * 1.2;
      const blinkBox = new THREE.Box3();
      blinkBox.setFromObject(blinkMesh);

      animatedObstacles.push({
        mesh: blinkMesh,
        update: (time) => {
          const cycle = Math.sin(time * 2.5 + phaseOffset);
          const isSolid = cycle > -0.2;
          (blinkMesh.material as THREE.MeshStandardMaterial).opacity = isSolid ? 1.0 : 0.2;
          (blinkMesh.material as THREE.MeshStandardMaterial).transparent = true;
          if (isPlayerLane) {
            if (isSolid) {
              blinkBox.setFromObject(blinkMesh);
            } else {
              blinkBox.makeEmpty(); // Fall through when invisible!
            }
          }
        },
      });
    }
    curZ += 6;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0x2ed573, { registerCollision: isPlayerLane });
    addCheckpoint(7, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 7: Trampoline Mega-Spring (Huge jump across giant lava canyon)
    curZ += 6;
    addBlock(laneX, curY, curZ, 5, 0.8, 5, 0xffa502, { registerCollision: isPlayerLane });
    addBouncePad(laneX, curY + 0.8, curZ + 1.5, 34, isPlayerLane);

    // Giant lava void below
    addBlock(laneX, curY - 6, curZ + 16, 12, 1, 28, 0xff0022, { isHazard: isPlayerLane, registerCollision: isPlayerLane });

    // Far landing pad
    curZ += 32;
    curY += 6; // Elevated landing!
    addBlock(laneX, curY, curZ, 7, 1, 7, 0xffa502, { registerCollision: isPlayerLane });
    addCheckpoint(8, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 8: Razor Balance Walk (Ultra-thin 0.6m balance beam)
    curZ += 6;
    addBlock(laneX, curY, curZ + 8, 0.6, 0.6, 16, 0x00f3ff, { registerCollision: isPlayerLane });
    // Hazard lasers below beam
    addBlock(laneX - 1.8, curY - 0.5, curZ + 8, 1.2, 0.3, 16, 0xff0022, { isHazard: isPlayerLane, registerCollision: isPlayerLane });
    addBlock(laneX + 1.8, curY - 0.5, curZ + 8, 1.2, 0.3, 16, 0xff0022, { isHazard: isPlayerLane, registerCollision: isPlayerLane });
    if (isPlayerLane) {
      addCoin(laneX, curY + 1.8, curZ + 4);
      addCoin(laneX, curY + 1.8, curZ + 8);
      addCoin(laneX, curY + 1.8, curZ + 12);
    }
    curZ += 18;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0x00f3ff, { registerCollision: isPlayerLane });
    addCheckpoint(9, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 9: Ascending Pyramid Staircase
    curZ += 6;
    for (let i = 0; i < 5; i++) {
      curZ += 3.8;
      curY += 1.0;
      addBlock(laneX + (i % 2 === 0 ? -1.0 : 1.0), curY, curZ, 2.6, 0.8, 2.6, 0xe67e22, { registerCollision: isPlayerLane });
    }
    curZ += 6;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0xe67e22, { registerCollision: isPlayerLane });
    addCheckpoint(10, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 10: Mystery Glass Bridge (Two panes, choose correctly!)
    curZ += 6;
    const safeLeft = [true, false, true, false];
    for (let i = 0; i < 4; i++) {
      curZ += 4.2;
      const leftPane = addBlock(laneX - 1.6, curY, curZ, 2.2, 0.3, 3.2, safeLeft[i] ? 0x81ecec : 0xffffff, {
        registerCollision: isPlayerLane && safeLeft[i],
      });
      const rightPane = addBlock(laneX + 1.6, curY, curZ, 2.2, 0.3, 3.2, !safeLeft[i] ? 0x81ecec : 0xffffff, {
        registerCollision: isPlayerLane && !safeLeft[i],
      });
      (leftPane.material as THREE.MeshStandardMaterial).transparent = true;
      (leftPane.material as THREE.MeshStandardMaterial).opacity = 0.65;
      (rightPane.material as THREE.MeshStandardMaterial).transparent = true;
      (rightPane.material as THREE.MeshStandardMaterial).opacity = 0.65;
    }
    curZ += 6;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0x81ecec, { registerCollision: isPlayerLane });
    addCheckpoint(11, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 11: Speed Dash Zone (Speed pads & long gap jumps)
    curZ += 6;
    addBlock(laneX, curY, curZ + 2, 4, 0.8, 6, 0x16a085, { registerCollision: isPlayerLane });
    if (isPlayerLane) addPickup(`pickup_${laneX}_2`, 'speed_potion', laneX, curY + 2.0, curZ + 2);
    // Speed dash pad
    const speedPad = addBlock(laneX, curY + 0.82, curZ + 3, 3.0, 0.1, 2.5, 0x00ffcc, { registerCollision: false });
    (speedPad.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x00ffcc);
    (speedPad.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0;

    // Huge 6m gap
    curZ += 12;
    addBlock(laneX, curY, curZ, 3.2, 0.8, 3.2, 0x16a085, { registerCollision: isPlayerLane });
    curZ += 6.5;
    addBlock(laneX, curY, curZ, 3.2, 0.8, 3.2, 0x16a085, { registerCollision: isPlayerLane });
    curZ += 6;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0x16a085, { registerCollision: isPlayerLane });
    addCheckpoint(12, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 12: Truss Vertical Ladder Climb (Staggered steep vertical steps)
    curZ += 6;
    for (let i = 0; i < 5; i++) {
      curZ += 2.8;
      curY += 1.4;
      addBlock(laneX, curY, curZ, 2.2, 0.4, 1.8, 0xffda79, { registerCollision: isPlayerLane });
      if (isPlayerLane && i % 2 === 0) addCoin(laneX, curY + 1.6, curZ);
    }
    curZ += 5;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0xffda79, { registerCollision: isPlayerLane });
    addCheckpoint(13, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 13: Rolling Cylinder Hurdles
    curZ += 6;
    for (let i = 0; i < 4; i++) {
      curZ += 4.4;
      const cylGeo = new THREE.CylinderGeometry(0.7, 0.7, 4.0, 16);
      const cylMat = getCachedMaterial(0x34495e, 0.2);
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      cyl.position.set(laneX, curY + 0.7, curZ);
      cyl.rotation.z = Math.PI / 2;
      group.add(cyl);

      if (isPlayerLane) {
        const cylBox = new THREE.Box3();
        cylBox.setFromObject(cyl);
        solidColliders.push({ mesh: cyl, box: cylBox, type: 'solid' });
      }

      // Lava pit below
      addBlock(laneX, curY - 4, curZ, 6, 0.5, 4, 0xff0022, { isHazard: isPlayerLane, registerCollision: isPlayerLane });
    }
    curZ += 6;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0x34495e, { registerCollision: isPlayerLane });
    addCheckpoint(14, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 14: Triple Hazard Spinners (Final gauntlet before summit)
    curZ += 6;
    addBlock(laneX, curY, curZ + 12, 6, 0.8, 24, 0x111625, { registerCollision: isPlayerLane });
    for (let i = 0; i < 3; i++) {
      const spGroup = new THREE.Group();
      spGroup.position.set(laneX, curY + 1.2, curZ + 4 + i * 8);
      const spArm = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.5, 0.5), neonRedLavaMat);
      spGroup.add(spArm);
      group.add(spGroup);

      const spBox = new THREE.Box3();
      if (isPlayerLane) {
        hazardColliders.push({ mesh: spArm, box: spBox, type: 'spinner' });
      }

      animatedObstacles.push({
        mesh: spGroup,
        update: (time) => {
          spGroup.rotation.y = time * (i % 2 === 0 ? 2.5 : -2.5);
          if (isPlayerLane) spBox.setFromObject(spGroup);
        },
      });
    }
    curZ += 28;
    addBlock(laneX, curY, curZ, 6, 1, 6, 0x706fd3, { registerCollision: isPlayerLane });
    addCheckpoint(15, laneX, curY + 1, curZ, isPlayerLane);

    // Stage 15: Grand Champion Sky Castle & Victory Podium!
    curZ += 8;
    curY += 2;
    // Grand Platform
    const castlePad = addBlock(laneX, curY, curZ + 8, 12, 1.5, 16, 0xffd700, { registerCollision: isPlayerLane });

    // Finish portal / pad
    const finishGeo = new THREE.BoxGeometry(5, 0.4, 5);
    const finishMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffaa,
      emissiveIntensity: 2.0,
    });
    const finishPadMesh = new THREE.Mesh(finishGeo, finishMat);
    finishPadMesh.position.set(laneX, curY + 1.7, curZ + 10);
    group.add(finishPadMesh);

    // Decorative Castle Pillars
    const pillarGeo = new THREE.BoxGeometry(1.2, 8, 1.2);
    const pillarMat = getCachedMaterial(0x2c3e50, 0.4);
    [-5, 5].forEach((px) => {
      [2, 14].forEach((pz) => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(laneX + px, curY + 4, curZ + pz);
        group.add(pillar);
      });
    });

    if (isPlayerLane) {
      const fBox = new THREE.Box3();
      fBox.setFromObject(finishPadMesh);
      finishPad = { mesh: finishPadMesh, box: fBox };
    }
  });

  // Center Divider for 1v1 Race Obby Mode
  if (mode === 'race_dual') {
    // Neon Laser line running between the two lanes
    const dividerLength = 340;
    const dividerGeo = new THREE.BoxGeometry(0.25, 1.2, dividerLength);
    const dividerMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.8,
    });
    const dividerMesh = new THREE.Mesh(dividerGeo, dividerMat);
    dividerMesh.position.set(0, 1.5, 160);
    group.add(dividerMesh);

    // Floating beacon pylons along center line
    for (let bz = 0; bz <= 320; bz += 35) {
      const beaconGeo = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xff007f,
        emissive: 0xff007f,
        emissiveIntensity: 2.0,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 4, bz);
      group.add(beacon);
    }
  }

  // Floating Grand Trophy at the peak
  const trophyGroup = new THREE.Group();
  trophyGroup.position.set(primaryLaneX, 22, 335);

  const trophyBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 0.8, 16), goldCoinMat);
  const trophyCup = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 0.8, 2.2, 16), goldCoinMat);
  trophyCup.position.y = 1.4;
  trophyGroup.add(trophyBase, trophyCup);
  group.add(trophyGroup);

  animatedObstacles.push({
    mesh: trophyGroup,
    update: (time) => {
      trophyGroup.rotation.y = time * 1.5;
      trophyGroup.position.y = 22 + Math.sin(time * 2.0) * 0.5;
    },
  });

  // Finish Pad fallback if single lane
  let finishPad = {
    mesh: new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 4)),
    box: new THREE.Box3(),
  };

  const finalCp = checkpoints[checkpoints.length - 1];
  if (finalCp) {
    finishPad.box.setFromCenterAndSize(
      new THREE.Vector3(finalCp.position[0], finalCp.position[1] + 1, finalCp.position[2] + 4),
      new THREE.Vector3(6, 4, 6)
    );
  }

  return {
    group,
    solidColliders,
    hazardColliders,
    bounceColliders,
    checkpoints,
    coins,
    pickups,
    animatedObstacles,
    finishPad,
    trophy: trophyGroup,
    mode,
    laneOffset: primaryLaneX,
    totalStages,
  };
}
