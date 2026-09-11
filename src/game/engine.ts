import * as THREE from 'three';
import { createRobloxCharacter, RobloxCharacter } from './character';
import { buildObbyLevel, LevelData } from './level';
import { soundManager } from '../utils/audio';
import { PlayerStats, PlayerCustomization, ItemId, EmoteType, HatType, TrailType, InventoryItem, DayNightState } from '../types';
import { progressionManager } from './progression';
import { inventoryManager, ITEM_DEFINITIONS } from './inventory';
import { MultiplayerClient } from './multiplayer';
import { DayNightCycle, DayNightInfo } from './dayNightCycle';

export interface RaceOpponentInfo {
  name: string;
  stage: number;
  totalStages: number;
  progressPercent: number;
  isFinished: boolean;
  time: number;
  isAi: boolean;
}

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: PlayerStats) => void;
  onVictory: () => void;
  onCheckpoint: (stage: number) => void;
  onXpGained?: (amount: number, levelUp: boolean, newLevel: number) => void;
  onItemCollected?: (item: InventoryItem) => void;
  onShieldUsed?: () => void;
  onShiftLockToggle?: (active: boolean) => void;
  onDayNightUpdate?: (info: DayNightInfo) => void;
  onRaceUpdate?: (opponent: RaceOpponentInfo, playerTime: number, winner: 'player' | 'opponent' | null) => void;
}

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public container: HTMLElement;
  public character: RobloxCharacter;
  public level: LevelData;
  public multiplayer: MultiplayerClient | null = null;
  public dayNight: DayNightCycle;
  public shiftLock = false;
  private lastDayNightInfo: DayNightInfo | null = null;

  // Game Mode & 1v1 Race Duel
  public gameMode: 'single' | 'race_dual' = 'single';
  public raceTimer = 0;
  public raceWinner: 'player' | 'opponent' | null = null;
  public opponentCharacter: RobloxCharacter | null = null;
  public aiRival: {
    name: string;
    stage: number;
    progress: number;
    z: number;
    isJumping: boolean;
    jumpTimer: number;
    speed: number;
    stumbleTimer: number;
  } | null = null;

  // Camera settings
  public cameraDistance = 14;
  public cameraYaw = 0;
  public cameraPitch = 0.35;
  private isPointerDown = false;
  private prevPointerX = 0;
  private prevPointerY = 0;

  // Input states
  private keys: Record<string, boolean> = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  };

  // Touch joystick virtual input
  public virtualInput = {
    x: 0,
    y: 0,
    jump: false,
  };

  // Gameplay state
  public stats: PlayerStats;
  private currentCheckpointPos = new THREE.Vector3(0, 2.5, 0);
  private isAlive = true;
  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private callbacks: GameEngineCallbacks;

  // Jump tracking
  private jumpKeyWasDown = false;
  private maxAirJumps = 0;
  private airJumpsUsed = 0;

  // Network sync throttler (20Hz)
  private lastNetworkSendTime = 0;

  // Shield invincible timer
  private shieldInvincibleTimer = 0;

  constructor(
    container: HTMLElement,
    callbacks: GameEngineCallbacks,
    initialCustomization: PlayerCustomization
  ) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Setup Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a17);
    this.scene.fog = new THREE.FogExp2(0x060a17, 0.0055);

    // 2. Setup Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 800);

    // 3. Setup WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // smooth 60fps on retina
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // 4. Setup Permanent Night Environment
    this.dayNight = new DayNightCycle(this.scene);

    // 5. Build Level (defaults to single)
    this.level = buildObbyLevel('single');
    this.scene.add(this.level.group);

    // 6. Build Local Player Character
    this.character = createRobloxCharacter(
      initialCustomization.headColor,
      initialCustomization.torsoColor,
      initialCustomization.legsColor
    );
    this.character.applyHat(initialCustomization.hat);
    this.character.currentTrail = initialCustomization.trail;
    this.currentCheckpointPos.set(this.level.laneOffset, 2.5, 0);
    this.character.group.position.copy(this.currentCheckpointPos);
    this.scene.add(this.character.group);
    this.scene.add(this.character.trailManager.group);

    // Add Player Night Headlight / Flashlight (casts subtle forward cone in dark night)
    const headlight = new THREE.SpotLight(0xaad8ff, 1.6, 45, Math.PI / 3.8, 0.5, 1.2);
    headlight.position.set(0, 2.5, 0.4);
    headlight.target.position.set(0, 0, 16);
    this.character.group.add(headlight);
    this.character.group.add(headlight.target);

    // 7. Initialize Progression & Stats
    const xpProgress = progressionManager.getXpProgress();
    this.stats = {
      currentStage: 1,
      totalStages: this.level.totalStages,
      coins: 0,
      totalCoins: this.level.coins.length,
      deaths: 0,
      timeElapsed: 0,
      isFinished: false,
      level: xpProgress.currentLevel,
      xp: xpProgress.totalXp,
      xpCurrentLevel: xpProgress.xpInLevel,
      xpNextLevel: xpProgress.xpForLevel,
    };
    this.updatePerkCapabilities();

    // 8. Bind Events
    this.bindEvents();

    // 9. Start Game Loop
    this.clock.start();
    this.loop();
  }

  public initMultiplayer(client: MultiplayerClient) {
    this.multiplayer = client;
  }

  // Switch between Singleplayer and 1v1 Dual Track Obby
  public switchGameMode(mode: 'single' | 'race_dual') {
    this.gameMode = mode;
    this.scene.remove(this.level.group);

    this.level = buildObbyLevel(mode);
    this.scene.add(this.level.group);

    this.stats.totalStages = this.level.totalStages;
    this.stats.currentStage = 1;
    this.stats.isFinished = false;
    this.stats.timeElapsed = 0;
    this.raceTimer = 0;
    this.raceWinner = null;

    // Reset player position to appropriate lane
    this.currentCheckpointPos.set(this.level.laneOffset, 2.5, 0);
    this.respawnAtCheckpoint();

    // Opponent Setup for Lane 2 in 1v1 Race mode
    if (mode === 'race_dual') {
      if (!this.opponentCharacter) {
        this.opponentCharacter = createRobloxCharacter('#ff4757', '#2f3542', '#3742fa');
        this.opponentCharacter.applyHat('ninja');
        this.opponentCharacter.currentTrail = 'fire';
        this.scene.add(this.opponentCharacter.group);
        this.scene.add(this.opponentCharacter.trailManager.group);
      }
      this.opponentCharacter.group.visible = true;
      this.opponentCharacter.group.position.set(7.5, 2.5, 0);
      this.opponentCharacter.resetPose();

      this.aiRival = {
        name: 'Rival_Speedy',
        stage: 1,
        progress: 0,
        z: 0,
        isJumping: false,
        jumpTimer: 0,
        speed: 10.8,
        stumbleTimer: 0,
      };
    } else {
      if (this.opponentCharacter) {
        this.opponentCharacter.group.visible = false;
      }
      this.aiRival = null;
    }

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  public toggleShiftLock(force?: boolean) {
    this.shiftLock = force !== undefined ? force : !this.shiftLock;
    soundManager.playCheckpoint();

    if (this.shiftLock) {
      this.character.rotationY = this.cameraYaw;
      this.character.group.rotation.y = this.cameraYaw;
      this.requestPointerLock();
    } else {
      this.exitPointerLock();
    }

    if (this.callbacks.onShiftLockToggle) {
      this.callbacks.onShiftLockToggle(this.shiftLock);
    }
  }

  public requestPointerLock() {
    try {
      const el = this.renderer.domElement;
      if (document.pointerLockElement !== el && el.requestPointerLock) {
        el.requestPointerLock();
      }
    } catch {
      // Ignored
    }
  }

  public exitPointerLock() {
    try {
      if (document.pointerLockElement && document.exitPointerLock) {
        document.exitPointerLock();
      }
    } catch {
      // Ignored
    }
  }

  public spendCoins(amount: number): boolean {
    if (this.stats.coins >= amount) {
      this.stats.coins -= amount;
      this.callbacks.onStatsUpdate({ ...this.stats });
      return true;
    }
    return false;
  }

  // Reset all keys and velocity to cure respawn walking bug
  public resetInputs() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.jump = false;
    this.keys.sprint = false;
    this.virtualInput = { x: 0, y: 0, jump: false };
    if (this.character) {
      this.character.velocity.set(0, 0, 0);
      this.character.isGrounded = true;
      this.character.resetPose();
    }
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('blur', this.onWindowBlur);

    const el = this.renderer.domElement;
    el.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });

    // Touch listeners
    el.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd);
  }

  private unbindEvents() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('blur', this.onWindowBlur);

    const el = this.renderer.domElement;
    el.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    el.removeEventListener('wheel', this.onWheel);

    el.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
  }

  private onWindowBlur = () => {
    this.resetInputs();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // If dead or modal has focused input, do not process gameplay keys
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (!this.isAlive) {
      this.resetInputs();
      return;
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.jump = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.keys.sprint = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        if (!e.repeat) {
          this.toggleShiftLock();
        }
        break;
      case 'KeyR':
        this.respawnAtCheckpoint();
        break;
      case 'Digit1':
        this.useHotbarItem(0);
        break;
      case 'Digit2':
        this.useHotbarItem(1);
        break;
      case 'Digit3':
        this.useHotbarItem(2);
        break;
      case 'Digit4':
        this.useHotbarItem(3);
        break;
      case 'Digit5':
        this.useHotbarItem(4);
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.keys.sprint = false;
        break;
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.shiftLock) {
      this.requestPointerLock();
      return;
    }

    if (e.button === 0 || e.button === 2) {
      this.isPointerDown = true;
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.shiftLock) {
      const sens = 0.0032;
      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;

      this.cameraYaw -= movementX * sens;
      this.cameraPitch = Math.max(0.08, Math.min(1.4, this.cameraPitch + movementY * sens));

      this.character.rotationY = this.cameraYaw;
      this.character.group.rotation.y = this.cameraYaw;
      this.updateCamera();
      return;
    }

    if (!this.isPointerDown) return;
    const dx = e.clientX - this.prevPointerX;
    const dy = e.clientY - this.prevPointerY;
    this.prevPointerX = e.clientX;
    this.prevPointerY = e.clientY;

    this.cameraYaw -= dx * 0.005;
    this.cameraPitch = Math.max(0.08, Math.min(1.4, this.cameraPitch + dy * 0.005));
    this.updateCamera();
  };

  private onMouseUp = () => {
    this.isPointerDown = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.cameraDistance = Math.max(6, Math.min(26, this.cameraDistance + e.deltaY * 0.02));
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      this.isPointerDown = true;
      this.prevPointerX = e.touches[0].clientX;
      this.prevPointerY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.isPointerDown || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - this.prevPointerX;
    const dy = e.touches[0].clientY - this.prevPointerY;
    this.prevPointerX = e.touches[0].clientX;
    this.prevPointerY = e.touches[0].clientY;

    const sens = 0.007;
    this.cameraYaw -= dx * sens;
    this.cameraPitch = Math.max(0.08, Math.min(1.4, this.cameraPitch + dy * sens));
  };

  private onTouchEnd = () => {
    this.isPointerDown = false;
  };

  public onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public updatePerkCapabilities() {
    const lvl = progressionManager.getState().level;
    this.maxAirJumps = lvl >= 2 ? 1 : 0;
  }

  public setCustomization(c: Partial<PlayerCustomization>) {
    if (c.headColor || c.torsoColor || c.legsColor) {
      const state = this.multiplayer?.customization;
      this.character.applyColors(
        c.headColor || state?.headColor || '#f5cd30',
        c.torsoColor || state?.torsoColor || '#0d69ac',
        c.legsColor || state?.legsColor || '#278d2b'
      );
    }
    if (c.hat !== undefined) {
      this.character.applyHat(c.hat);
    }
    if (c.trail !== undefined) {
      this.character.currentTrail = c.trail;
    }
    if (this.multiplayer) {
      this.multiplayer.updateCustomization(c);
    }
  }

  public triggerEmote(emote: EmoteType) {
    this.character.triggerEmote(emote);
    if (this.multiplayer) {
      this.multiplayer.sendEmote(emote);
    }
  }

  public triggerHighFive() {
    this.triggerEmote('highfive');
    if (this.multiplayer) {
      const nearby = this.multiplayer.findNearbyPlayer(this.character.group.position, 4.0);
      if (nearby) {
        this.multiplayer.sendHighFive(nearby.data.id);
      }
    }
  }

  public useHotbarItem(slotIndex: number) {
    const items = inventoryManager.getItems().filter(i => i.count > 0);
    if (items[slotIndex]) {
      this.useItem(items[slotIndex].id);
    }
  }

  public useItem(itemId: ItemId) {
    const used = inventoryManager.useItem(itemId);
    if (!used) return;

    soundManager.playPowerUp();

    switch (itemId) {
      case 'teleport_compass': {
        const nextCp = this.level.checkpoints.find(c => c.id === this.stats.currentStage + 1);
        if (nextCp) {
          this.currentCheckpointPos.set(nextCp.position[0], nextCp.position[1] + 1.2, nextCp.position[2]);
          this.stats.currentStage = nextCp.id;
          this.respawnAtCheckpoint();
          soundManager.playCheckpoint();
          this.callbacks.onCheckpoint(nextCp.id);
          this.callbacks.onStatsUpdate({ ...this.stats });
        }
        break;
      }
      case 'super_spring': {
        this.character.velocity.y = 38.0;
        this.airJumpsUsed = 0;
        soundManager.playBounce();
        this.character.trailManager.emit(this.character.group.position, 'plasma');
        break;
      }
      case 'safety_shield': {
        this.shieldInvincibleTimer = 15.0;
        break;
      }
      case 'speed_potion':
      case 'gravity_coil':
      case 'bubble_glider':
        break;
    }
  }

  public addXpReward(amount: number) {
    const res = progressionManager.addXp(amount);
    const xpProgress = progressionManager.getXpProgress();
    this.stats.level = xpProgress.currentLevel;
    this.stats.xp = xpProgress.totalXp;
    this.stats.xpCurrentLevel = xpProgress.xpInLevel;
    this.stats.xpNextLevel = xpProgress.xpForLevel;

    if (res.levelUp) {
      this.updatePerkCapabilities();
      soundManager.playVictory();
      if (this.multiplayer) {
        this.multiplayer.setLevel(this.stats.level);
      }
    }

    if (this.callbacks.onXpGained) {
      this.callbacks.onXpGained(amount, res.levelUp, res.newLevel);
    }
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  public respawnAtCheckpoint() {
    this.character.group.position.copy(this.currentCheckpointPos);
    this.resetInputs();
    this.airJumpsUsed = 0;
    this.isAlive = true;
  }

  public dieAndRespawn() {
    if (!this.isAlive) return;

    if (this.shieldInvincibleTimer <= 0) {
      if (inventoryManager.hasActiveBuff('safety_shield') || inventoryManager.hasItem('safety_shield')) {
        inventoryManager.consumeShield();
        this.shieldInvincibleTimer = 2.0;
        this.character.velocity.y = 18.0;
        soundManager.playBounce();
        if (this.callbacks.onShieldUsed) {
          this.callbacks.onShieldUsed();
        }
        return;
      }
    } else {
      return;
    }

    this.isAlive = false;
    this.resetInputs(); // Stops motion immediately on death
    soundManager.playOof();
    this.stats.deaths++;
    this.callbacks.onStatsUpdate({ ...this.stats });

    setTimeout(() => {
      this.respawnAtCheckpoint();
    }, 350);
  }

  public resetGame() {
    this.currentCheckpointPos.set(this.level.laneOffset, 2.5, 0);
    const xpProgress = progressionManager.getXpProgress();
    this.stats = {
      currentStage: 1,
      totalStages: this.level.totalStages,
      coins: 0,
      totalCoins: this.level.coins.length,
      deaths: 0,
      timeElapsed: 0,
      isFinished: false,
      level: xpProgress.currentLevel,
      xp: xpProgress.totalXp,
      xpCurrentLevel: xpProgress.xpInLevel,
      xpNextLevel: xpProgress.xpForLevel,
    };
    this.raceTimer = 0;
    this.raceWinner = null;

    this.level.coins.forEach(c => {
      c.collected = false;
      c.mesh.visible = true;
    });
    this.level.pickups.forEach(p => {
      p.collected = false;
      p.mesh.visible = true;
      p.respawnTimer = 0;
    });
    this.level.checkpoints.forEach(cp => {
      const mat = cp.lightMesh.material as THREE.MeshStandardMaterial;
      if (cp.id === 1) {
        mat.color.setHex(0x00ff66);
        mat.emissive.setHex(0x00ee44);
      } else {
        mat.color.setHex(0xffaa00);
        mat.emissive.setHex(0xaa5500);
      }
    });

    this.respawnAtCheckpoint();
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private updatePlayer(delta: number) {
    if (!this.isAlive) {
      this.character.velocity.set(0, 0, 0);
      return;
    }

    if (this.shieldInvincibleTimer > 0) {
      this.shieldInvincibleTimer -= delta;
    }

    // Active item buff modifiers
    const hasSpeedPotion = inventoryManager.hasActiveBuff('speed_potion');
    const hasGravityCoil = inventoryManager.hasActiveBuff('gravity_coil');
    const hasGlider = inventoryManager.hasActiveBuff('bubble_glider');
    const hasLowGravPerk = progressionManager.hasPerk(6);
    const hasSuperSprintPerk = progressionManager.hasPerk(8);

    // Movement speeds
    let sprintMultiplier = 1.0;
    if (this.keys.sprint) {
      sprintMultiplier = hasSuperSprintPerk ? 1.8 : 1.45;
    }
    let baseSpeed = 13.5 * sprintMultiplier;
    if (hasSpeedPotion) {
      baseSpeed *= 1.5;
    }

    // Gravity calculation
    let gravity = -46.0;
    if (hasGravityCoil) {
      gravity = -18.0;
    } else if (hasLowGravPerk) {
      gravity = -34.0;
    }

    let jumpSpeed = 20.8;
    if (hasGravityCoil) {
      jumpSpeed = 24.5;
    }

    // Forward direction from camera
    const forwardX = Math.sin(this.cameraYaw);
    const forwardZ = Math.cos(this.cameraYaw);
    const rightX = -forwardZ;
    const rightZ = forwardX;

    let moveX = 0;
    let moveZ = 0;

    if (this.keys.forward) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    if (this.keys.backward) {
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    if (this.keys.left) {
      moveX -= rightX;
      moveZ -= rightZ;
    }
    if (this.keys.right) {
      moveX += rightX;
      moveZ += rightZ;
    }

    // Virtual touch joystick
    if (Math.abs(this.virtualInput.x) > 0.05 || Math.abs(this.virtualInput.y) > 0.05) {
      moveX += rightX * this.virtualInput.x + forwardX * -this.virtualInput.y;
      moveZ += rightZ * this.virtualInput.x + forwardZ * -this.virtualInput.y;
    }

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    const isMoving = len > 0.05;

    if (isMoving) {
      moveX /= len;
      moveZ /= len;

      this.character.velocity.x = moveX * baseSpeed;
      this.character.velocity.z = moveZ * baseSpeed;

      if (!this.shiftLock) {
        const targetRot = Math.atan2(moveX, moveZ);
        let diff = targetRot - this.character.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.character.rotationY += diff * Math.min(1.0, 18.0 * delta);
        this.character.group.rotation.y = this.character.rotationY;
      }
    } else {
      this.character.velocity.x *= Math.pow(0.001, delta);
      this.character.velocity.z *= Math.pow(0.001, delta);
      if (Math.abs(this.character.velocity.x) < 0.05) this.character.velocity.x = 0;
      if (Math.abs(this.character.velocity.z) < 0.05) this.character.velocity.z = 0;
    }

    if (this.shiftLock) {
      this.character.rotationY = this.cameraYaw;
      this.character.group.rotation.y = this.cameraYaw;
    }

    // Jump handling
    const wantsJump = this.keys.jump || this.virtualInput.jump;
    const justPressedJump = wantsJump && !this.jumpKeyWasDown;

    if (justPressedJump) {
      if (this.character.isGrounded) {
        this.character.velocity.y = jumpSpeed;
        this.character.isGrounded = false;
        soundManager.playJump();
      } else if (this.airJumpsUsed < this.maxAirJumps) {
        this.airJumpsUsed++;
        this.character.velocity.y = jumpSpeed * 0.95;
        soundManager.playJump();
        this.character.trailManager.emit(this.character.group.position, 'sparkles');
      }
    }
    this.jumpKeyWasDown = wantsJump;

    // Bubble glider
    if (hasGlider && wantsJump && !this.character.isGrounded && this.character.velocity.y < -2.5) {
      this.character.velocity.y = -2.5;
    }

    // Gravity
    this.character.velocity.y += gravity * delta;
    if (this.character.velocity.y < -50) {
      this.character.velocity.y = -50;
    }

    // =========================================================================
    // PERFORMANCE-OPTIMIZED COLLISION SYSTEM (Spatial Culling for 60 FPS)
    // =========================================================================
    const playerZ = this.character.group.position.z;
    const nextPos = this.character.group.position.clone();
    nextPos.x += this.character.velocity.x * delta;
    nextPos.y += this.character.velocity.y * delta;
    nextPos.z += this.character.velocity.z * delta;

    const playerBox = new THREE.Box3();
    const halfWidth = 0.65;
    const charHeight = 3.8;

    let groundedThisFrame = false;
    const testBoxY = new THREE.Box3(
      new THREE.Vector3(this.character.group.position.x - halfWidth, nextPos.y, this.character.group.position.z - halfWidth),
      new THREE.Vector3(this.character.group.position.x + halfWidth, nextPos.y + charHeight, this.character.group.position.z + halfWidth)
    );

    // Filter colliders within 35 meters along Z
    for (const collider of this.level.solidColliders) {
      if (Math.abs(collider.box.min.z - playerZ) > 35 && Math.abs(collider.box.max.z - playerZ) > 35) continue;

      if (testBoxY.intersectsBox(collider.box)) {
        if (this.character.velocity.y <= 0 && this.character.group.position.y >= collider.box.max.y - 0.7) {
          nextPos.y = collider.box.max.y;
          this.character.velocity.y = 0;
          groundedThisFrame = true;
          this.airJumpsUsed = 0;

          if (collider.type === 'bounce') {
            const bounce = this.level.bounceColliders.find(b => b.mesh === collider.mesh);
            if (bounce) {
              this.character.velocity.y = bounce.power;
              groundedThisFrame = false;
              soundManager.playBounce();
              this.addXpReward(25);
            }
          }
        } else if (this.character.velocity.y > 0 && this.character.group.position.y + charHeight <= collider.box.min.y + 0.6) {
          nextPos.y = collider.box.min.y - charHeight;
          this.character.velocity.y = 0;
        }
      }
    }

    this.character.isGrounded = groundedThisFrame;

    // Walls X check with spatial culling
    const testBoxX = new THREE.Box3(
      new THREE.Vector3(nextPos.x - halfWidth, nextPos.y + 0.3, this.character.group.position.z - halfWidth),
      new THREE.Vector3(nextPos.x + halfWidth, nextPos.y + charHeight - 0.3, this.character.group.position.z + halfWidth)
    );
    for (const collider of this.level.solidColliders) {
      if (Math.abs(collider.box.min.z - playerZ) > 35 && Math.abs(collider.box.max.z - playerZ) > 35) continue;
      if (testBoxX.intersectsBox(collider.box)) {
        nextPos.x = this.character.group.position.x;
        this.character.velocity.x = 0;
        break;
      }
    }

    // Walls Z check with spatial culling
    const testBoxZ = new THREE.Box3(
      new THREE.Vector3(nextPos.x - halfWidth, nextPos.y + 0.3, nextPos.z - halfWidth),
      new THREE.Vector3(nextPos.x + halfWidth, nextPos.y + charHeight - 0.3, nextPos.z + halfWidth)
    );
    for (const collider of this.level.solidColliders) {
      if (Math.abs(collider.box.min.z - playerZ) > 35 && Math.abs(collider.box.max.z - playerZ) > 35) continue;
      if (testBoxZ.intersectsBox(collider.box)) {
        nextPos.z = this.character.group.position.z;
        this.character.velocity.z = 0;
        break;
      }
    }

    this.character.group.position.copy(nextPos);

    playerBox.setFromCenterAndSize(
      new THREE.Vector3(nextPos.x, nextPos.y + charHeight / 2, nextPos.z),
      new THREE.Vector3(halfWidth * 2, charHeight, halfWidth * 2)
    );

    // Hazard checks (Lava blocks and rotating spinners)
    for (const hazard of this.level.hazardColliders) {
      if (Math.abs(hazard.box.min.z - playerZ) > 35 && Math.abs(hazard.box.max.z - playerZ) > 35) continue;
      if (playerBox.intersectsBox(hazard.box)) {
        this.dieAndRespawn();
        return;
      }
    }

    // Void fall check
    if (this.character.group.position.y < -12) {
      this.dieAndRespawn();
      return;
    }

    // Checkpoints trigger
    for (const cp of this.level.checkpoints) {
      if (playerBox.intersectsBox(cp.box)) {
        if (cp.id > this.stats.currentStage) {
          this.stats.currentStage = cp.id;
          this.currentCheckpointPos.set(cp.position[0], cp.position[1] + 1.2, cp.position[2]);

          const mat = cp.lightMesh.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x00ff66);
          mat.emissive.setHex(0x00ee44);
          mat.emissiveIntensity = 1.8;

          soundManager.playCheckpoint();
          this.addXpReward(150);
          this.callbacks.onCheckpoint(cp.id);
          this.callbacks.onStatsUpdate({ ...this.stats });
        }
      }
    }

    // Coin collection
    const hasMagnetPerk = progressionManager.hasPerk(4);
    const magnetRadius = 6.0;

    for (const coin of this.level.coins) {
      if (!coin.collected) {
        const coinPos = new THREE.Vector3(...coin.position);
        const dist = playerBox.distanceToPoint(coinPos);

        if (hasMagnetPerk && dist < magnetRadius && dist > 1.2) {
          const pullDir = this.character.group.position.clone().add(new THREE.Vector3(0, 1.8, 0)).sub(coinPos).normalize();
          coin.position[0] += pullDir.x * 12 * delta;
          coin.position[1] += pullDir.y * 12 * delta;
          coin.position[2] += pullDir.z * 12 * delta;
          coin.mesh.position.set(...coin.position);
        }

        if (dist < 1.5) {
          coin.collected = true;
          coin.mesh.visible = false;
          this.stats.coins++;
          soundManager.playCoin();
          this.addXpReward(50);
          this.callbacks.onStatsUpdate({ ...this.stats });
        }
      }
    }

    // Pickups collection
    for (const pickup of this.level.pickups) {
      if (!pickup.collected) {
        const pPos = new THREE.Vector3(...pickup.position);
        const dist = playerBox.distanceToPoint(pPos);
        if (dist < 1.8) {
          pickup.collected = true;
          pickup.mesh.visible = false;
          pickup.respawnTimer = 30.0;

          inventoryManager.addItem(pickup.itemId, 1);
          soundManager.playCoin();
          this.addXpReward(40);

          if (this.callbacks.onItemCollected) {
            const def = ITEM_DEFINITIONS[pickup.itemId];
            this.callbacks.onItemCollected({
              ...def,
              count: 1,
            });
          }
        }
      }
    }

    // Finish Pad / Victory check
    if (!this.stats.isFinished && playerBox.intersectsBox(this.level.finishPad.box)) {
      this.stats.isFinished = true;
      if (!this.raceWinner) {
        this.raceWinner = 'player';
      }
      soundManager.playVictory();
      this.addXpReward(1000); // 1000 XP Grand Champion Reward!
      this.callbacks.onVictory();
      this.callbacks.onStatsUpdate({ ...this.stats });
    }

    // Animate Character Pose
    this.character.updateAnimation(isMoving, !this.character.isGrounded, delta);

    // Multiplayer Throttled Packet Send (20Hz)
    const now = performance.now();
    if (this.multiplayer && now - this.lastNetworkSendTime > 50) {
      this.lastNetworkSendTime = now;
      this.multiplayer.sendUpdate({
        position: [this.character.group.position.x, this.character.group.position.y, this.character.group.position.z],
        rotationY: this.character.rotationY,
        walkCycle: this.character.walkCycle,
        isMoving,
        isJumping: !this.character.isGrounded,
        stage: this.stats.currentStage,
      });
    }
  }

  // Update AI Rival Bot & Race Stats for 1v1 Mode
  private updateRaceDuel(delta: number) {
    if (this.gameMode !== 'race_dual') return;

    this.raceTimer += delta;

    // Check if there is a real human remote player in the room
    const remotePlayers = this.multiplayer ? Array.from(this.multiplayer.remotePlayers.values()) : [];
    const humanOpponent = remotePlayers[0];

    let opponentStage = 1;
    let opponentPercent = 0;
    let isOpponentFinished = false;
    let opponentName = 'Rival_Speedy';
    let isAi = true;

    if (humanOpponent) {
      // Real human opponent
      opponentName = humanOpponent.data.name;
      opponentStage = humanOpponent.data.stage || 1;
      opponentPercent = Math.min(100, (opponentStage / this.level.totalStages) * 100);
      isOpponentFinished = opponentStage >= this.level.totalStages;
      isAi = false;
    } else if (this.aiRival && this.opponentCharacter) {
      // Dynamic AI Rival Bot running on Lane 2 (X = +7.5)
      opponentName = this.aiRival.name;

      if (!this.stats.isFinished && !this.raceWinner) {
        this.aiRival.z += this.aiRival.speed * delta;
        const totalZ = 330;
        this.aiRival.progress = Math.min(1.0, this.aiRival.z / totalZ);
        this.aiRival.stage = Math.min(15, Math.floor(this.aiRival.progress * 14) + 1);

        // Simulated jumping over obstacles
        this.aiRival.jumpTimer -= delta;
        if (this.aiRival.jumpTimer <= 0) {
          this.aiRival.isJumping = true;
          this.aiRival.jumpTimer = 3.0 + Math.random() * 2.5;
        }

        let rivalY = 2.5;
        if (this.aiRival.isJumping) {
          rivalY += Math.sin((5.5 - this.aiRival.jumpTimer) * Math.PI) * 2.8;
          if (this.aiRival.jumpTimer < 2.5) {
            this.aiRival.isJumping = false;
          }
        }

        this.opponentCharacter.group.position.set(7.5, Math.max(2.5, rivalY), this.aiRival.z);
        this.opponentCharacter.updateAnimation(true, this.aiRival.isJumping, delta);

        if (this.aiRival.z >= 330) {
          isOpponentFinished = true;
          if (!this.raceWinner) {
            this.raceWinner = 'opponent';
          }
        }
      }

      opponentStage = this.aiRival.stage;
      opponentPercent = this.aiRival.progress * 100;
    }

    if (this.callbacks.onRaceUpdate) {
      this.callbacks.onRaceUpdate(
        {
          name: opponentName,
          stage: opponentStage,
          totalStages: this.level.totalStages,
          progressPercent: opponentPercent,
          isFinished: isOpponentFinished,
          time: this.raceTimer,
          isAi,
        },
        this.raceTimer,
        this.raceWinner
      );
    }
  }

  private updateCamera() {
    const target = this.character.group.position.clone();
    target.y += 2.0;

    const horizontalDistance = this.cameraDistance * Math.cos(this.cameraPitch);
    const verticalDistance = this.cameraDistance * Math.sin(this.cameraPitch);

    let camX = target.x - Math.sin(this.cameraYaw) * horizontalDistance;
    let camZ = target.z - Math.cos(this.cameraYaw) * horizontalDistance;
    const camY = target.y + verticalDistance;

    if (this.shiftLock) {
      const shoulderOffset = 1.35;
      const rightX = -Math.cos(this.cameraYaw);
      const rightZ = Math.sin(this.cameraYaw);
      camX += rightX * shoulderOffset;
      camZ += rightZ * shoulderOffset;
      target.x += rightX * (shoulderOffset * 0.4);
      target.z += rightZ * (shoulderOffset * 0.4);
    }

    this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.28);
    this.camera.lookAt(target);
  }

  private loop = () => {
    this.animationFrameId = requestAnimationFrame(this.loop);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    if (!this.stats.isFinished) {
      this.stats.timeElapsed += delta;
      this.callbacks.onStatsUpdate({ ...this.stats });
    }

    // Permanent Night Sky and Stars Update
    const dayNightInfo = this.dayNight.update(delta, this.character.group.position);
    if (this.callbacks.onDayNightUpdate) {
      if (!this.lastDayNightInfo) {
        this.lastDayNightInfo = dayNightInfo;
        this.callbacks.onDayNightUpdate(dayNightInfo);
      }
    }

    // Inventory active buffs
    inventoryManager.update(delta);

    // Multiplayer remote players
    if (this.multiplayer) {
      this.multiplayer.update(delta);
    }

    // 1v1 Race Duel updates
    this.updateRaceDuel(delta);

    // Animated obstacles
    this.level.animatedObstacles.forEach(obs => obs.update(elapsedTime, delta));

    // Collectible coins animation
    this.level.coins.forEach(coin => {
      if (!coin.collected) {
        coin.mesh.rotation.y = elapsedTime * 3.5;
        coin.mesh.position.y = coin.position[1] + Math.sin(elapsedTime * 4 + coin.id) * 0.25;
      }
    });

    // World pickups
    this.level.pickups.forEach(pickup => {
      if (!pickup.collected) {
        pickup.mesh.rotation.y = elapsedTime * 2.5;
        pickup.mesh.position.y = pickup.position[1] + Math.sin(elapsedTime * 3) * 0.2;
      } else if (pickup.respawnTimer > 0) {
        pickup.respawnTimer -= delta;
        if (pickup.respawnTimer <= 0) {
          pickup.collected = false;
          pickup.mesh.visible = true;
        }
      }
    });

    // Player physics
    this.updatePlayer(delta);

    // Camera
    this.updateCamera();

    // Render scene
    this.renderer.render(this.scene, this.camera);
  };

  public teleportTo(pos: [number, number, number], stage?: number) {
    this.character.group.position.set(pos[0], pos[1] + 1.2, pos[2]);
    this.character.velocity.set(0, 0, 0);
    this.character.isGrounded = false;
    if (stage !== undefined && stage > this.stats.currentStage) {
      this.stats.currentStage = stage;
      this.callbacks.onStatsUpdate({ ...this.stats });
    }
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.unbindEvents();
    if (this.multiplayer) {
      this.multiplayer.destroy();
    }
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
