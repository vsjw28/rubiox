import * as THREE from 'three';
import { RemotePlayerData, HatType, TrailType, EmoteType } from '../types';
import { createHatMesh, ParticleTrailManager } from './accessories';

// Generates an interactive billboard canvas for player nametag & chat bubble
function createNametagCanvas(name: string, level: number, stage: number, message?: string, emote?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 256);

  let currentY = 160;

  // 1. Chat Speech Bubble if message exists
  if (message) {
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    const textWidth = Math.min(460, ctx.measureText(message).width + 36);
    const bubbleX = 256 - textWidth / 2;
    const bubbleY = 40;
    const bubbleH = 50;

    // Speech bubble background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, textWidth, bubbleH, 16);
    ctx.fill();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Little tail pointing down
    ctx.beginPath();
    ctx.moveTo(250, bubbleY + bubbleH);
    ctx.lineTo(256, bubbleY + bubbleH + 12);
    ctx.lineTo(262, bubbleY + bubbleH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();

    // Message text
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message.slice(0, 32), 256, bubbleY + bubbleH / 2);
  }

  // 2. Emote badge if active
  if (emote) {
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(234, 179, 8, 0.95)';
    ctx.beginPath();
    ctx.roundRect(146, currentY - 50, 220, 38, 12);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#713f12';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emote, 256, currentY - 31);
  }

  // 3. Player Name & Level Badge
  const tagText = `[Lv.${level}] ${name}`;
  ctx.font = 'bold 28px "Segoe UI", sans-serif';
  const tagWidth = ctx.measureText(tagText).width + 36;
  const tagX = 256 - tagWidth / 2;

  // Background pill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.beginPath();
  ctx.roundRect(tagX, currentY, tagWidth, 48, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Name text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, 256, currentY + 24);

  // 4. Stage pill underneath
  const stageText = `Stage ${stage}`;
  ctx.font = '600 20px "Segoe UI", sans-serif';
  const stageW = ctx.measureText(stageText).width + 20;
  ctx.fillStyle = 'rgba(37, 99, 235, 0.85)';
  ctx.beginPath();
  ctx.roundRect(256 - stageW / 2, currentY + 54, stageW, 28, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(stageText, 256, currentY + 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class RemotePlayer {
  public data: RemotePlayerData;
  public group: THREE.Group;
  public head: THREE.Mesh;
  public torso: THREE.Mesh;
  public leftArm: THREE.Group;
  public rightArm: THREE.Group;
  public leftLeg: THREE.Group;
  public rightLeg: THREE.Group;
  public hatGroup: THREE.Group | null = null;
  public trailManager = new ParticleTrailManager();

  private nametagSprite: THREE.Sprite;
  private nametagTexture: THREE.CanvasTexture | null = null;
  private targetPosition = new THREE.Vector3();
  private targetRotationY = 0;
  private walkCycle = 0;
  private currentEmote: EmoteType | null = null;
  private emoteDuration = 0;

  constructor(data: RemotePlayerData, scene: THREE.Scene) {
    this.data = { ...data };
    this.group = new THREE.Group();

    // 1. Materials with customizable colors
    const headColor = new THREE.Color(data.headColor || '#f5cd30');
    const torsoColor = new THREE.Color(data.torsoColor || '#0d69ac');
    const legsColor = new THREE.Color(data.legsColor || '#278d2b');

    const headMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.4 });
    const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: 0.4 });
    const legsMat = new THREE.MeshStandardMaterial({ color: legsColor, roughness: 0.4 });

    // Head
    const headGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 3.25, 0);
    this.head.castShadow = true;

    // Stud
    const studGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16);
    const stud = new THREE.Mesh(studGeo, headMat);
    stud.position.set(0, 0.55, 0);
    this.head.add(stud);
    this.group.add(this.head);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(1.6, 1.8, 0.9);
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.set(0, 1.9, 0);
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Helper for limbs
    function createLimb(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(0, -h / 2, 0);
      mesh.castShadow = true;
      pivot.add(mesh);
      return pivot;
    }

    this.leftArm = createLimb(0.7, 1.7, 0.7, headMat, 1.15, 2.7);
    this.rightArm = createLimb(0.7, 1.7, 0.7, headMat, -1.15, 2.7);
    this.leftLeg = createLimb(0.75, 1.8, 0.8, legsMat, 0.42, 1.0);
    this.rightLeg = createLimb(0.75, 1.8, 0.8, legsMat, -0.42, 1.0);

    this.group.add(this.leftArm);
    this.group.add(this.rightArm);
    this.group.add(this.leftLeg);
    this.group.add(this.rightLeg);

    // Hat
    this.applyHat(data.hat);

    // Nametag Sprite
    this.nametagTexture = createNametagCanvas(data.name, data.level, data.stage);
    const spriteMat = new THREE.SpriteMaterial({ map: this.nametagTexture, transparent: true });
    this.nametagSprite = new THREE.Sprite(spriteMat);
    this.nametagSprite.scale.set(4.5, 2.25, 1);
    this.nametagSprite.position.set(0, 4.8, 0);
    this.group.add(this.nametagSprite);

    // Trails
    scene.add(this.trailManager.group);

    // Set initial position
    this.targetPosition.set(...data.position);
    this.group.position.copy(this.targetPosition);
    this.targetRotationY = data.rotationY;
    this.group.rotation.y = this.targetRotationY;

    scene.add(this.group);
  }

  public applyHat(hat: HatType) {
    if (this.hatGroup) {
      this.head.remove(this.hatGroup);
      this.hatGroup = null;
    }
    this.data.hat = hat;
    const mesh = createHatMesh(hat);
    if (mesh) {
      this.hatGroup = mesh;
      this.head.add(this.hatGroup);
    }
  }

  public updateData(newData: Partial<RemotePlayerData>) {
    Object.assign(this.data, newData);

    if (newData.position) {
      this.targetPosition.set(...newData.position);
    }
    if (typeof newData.rotationY === 'number') {
      this.targetRotationY = newData.rotationY;
    }
    if (newData.hat && newData.hat !== this.data.hat) {
      this.applyHat(newData.hat);
    }
    if (newData.stage !== undefined || newData.level !== undefined || newData.name !== undefined) {
      this.refreshNametag();
    }
  }

  public showChat(text: string) {
    this.data.lastMessage = text;
    this.data.messageTimer = 6.0; // show bubble for 6 seconds
    this.refreshNametag();
  }

  public triggerEmote(emote: EmoteType) {
    this.currentEmote = emote;
    this.emoteDuration = 4.0;
    let label = '';
    if (emote === 'wave') label = '👋 Winkt!';
    if (emote === 'cheer') label = '🙌 Jubelt!';
    if (emote === 'dance') label = '💃 Tanzt!';
    if (emote === 'highfive') label = '✋ High-Five!';
    this.refreshNametag(label);
  }

  private refreshNametag(emoteLabel?: string) {
    const newTex = createNametagCanvas(
      this.data.name,
      this.data.level,
      this.data.stage,
      this.data.messageTimer && this.data.messageTimer > 0 ? this.data.lastMessage : undefined,
      emoteLabel || (this.emoteDuration > 0 ? this.getEmoteLabel() : undefined)
    );

    if (this.nametagTexture) {
      this.nametagTexture.dispose();
    }
    this.nametagTexture = newTex;
    this.nametagSprite.material.map = newTex;
    this.nametagSprite.material.needsUpdate = true;
  }

  private getEmoteLabel(): string {
    if (this.currentEmote === 'wave') return '👋 Winkt!';
    if (this.currentEmote === 'cheer') return '🙌 Jubelt!';
    if (this.currentEmote === 'dance') return '💃 Tanzt!';
    if (this.currentEmote === 'highfive') return '✋ High-Five!';
    return '';
  }

  public update(delta: number) {
    // Smooth position and rotation lerping
    this.group.position.lerp(this.targetPosition, Math.min(1, 15 * delta));

    let rotDiff = this.targetRotationY - this.group.rotation.y;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    this.group.rotation.y += rotDiff * Math.min(1, 15 * delta);

    // Update timers
    if (this.data.messageTimer && this.data.messageTimer > 0) {
      this.data.messageTimer -= delta;
      if (this.data.messageTimer <= 0) {
        this.data.lastMessage = undefined;
        this.refreshNametag();
      }
    }

    if (this.emoteDuration > 0) {
      this.emoteDuration -= delta;
      if (this.emoteDuration <= 0) {
        this.currentEmote = null;
        this.refreshNametag();
      }
    }

    // Emit trail if moving
    if (this.data.isMoving && this.data.trail && this.data.trail !== 'none') {
      this.trailManager.emit(this.group.position, this.data.trail);
    }
    this.trailManager.update(delta);

    // Emote animation takes precedence over movement
    if (this.currentEmote) {
      this.animateEmote(delta);
      return;
    }

    // Normal limb animation
    if (this.data.isJumping) {
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, -1.2, 15 * delta);
      this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, -1.2, 15 * delta);
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0.35, 15 * delta);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, -0.2, 15 * delta);
    } else if (this.data.isMoving) {
      this.walkCycle += delta * 12;
      const armAngle = Math.sin(this.walkCycle) * 0.9;
      const legAngle = Math.sin(this.walkCycle) * 0.85;

      this.leftArm.rotation.x = -armAngle;
      this.rightArm.rotation.x = armAngle;
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      this.head.position.y = 3.25 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.08;
      this.torso.position.y = 1.9 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.05;
    } else {
      // Idle
      this.walkCycle += delta * 2.5;
      const idleSwing = Math.sin(this.walkCycle) * 0.04;
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, idleSwing, 10 * delta);
      this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, -idleSwing, 10 * delta);
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, 10 * delta);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, 10 * delta);
      this.head.position.y = 3.25 + Math.sin(this.walkCycle) * 0.03;
      this.torso.position.y = 1.9;
    }
  }

  private animateEmote(delta: number) {
    this.walkCycle += delta * 8;

    switch (this.currentEmote) {
      case 'wave': {
        // Wave right hand high in the air
        this.rightArm.rotation.x = -2.4;
        this.rightArm.rotation.z = -0.5 + Math.sin(this.walkCycle * 2) * 0.5;
        this.leftArm.rotation.x = 0;
        this.leftArm.rotation.z = 0.1;
        break;
      }
      case 'cheer': {
        // Both arms raised jumping
        this.rightArm.rotation.x = -2.8;
        this.leftArm.rotation.x = -2.8;
        this.rightArm.rotation.z = -0.3;
        this.leftArm.rotation.z = 0.3;
        this.group.position.y = this.targetPosition.y + Math.abs(Math.sin(this.walkCycle * 2)) * 0.5;
        break;
      }
      case 'dance': {
        // Rhythmic hip and arm swaying
        const sway = Math.sin(this.walkCycle * 2);
        this.torso.rotation.y = sway * 0.4;
        this.head.rotation.y = -sway * 0.3;
        this.leftArm.rotation.x = Math.sin(this.walkCycle * 2) * 1.0;
        this.rightArm.rotation.x = -Math.sin(this.walkCycle * 2) * 1.0;
        this.leftLeg.rotation.x = sway * 0.3;
        this.rightLeg.rotation.x = -sway * 0.3;
        break;
      }
      case 'highfive': {
        // Right arm extended forward
        this.rightArm.rotation.x = -1.6;
        this.rightArm.rotation.z = -0.2;
        this.leftArm.rotation.x = 0;
        break;
      }
    }
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.group);
    scene.remove(this.trailManager.group);
    this.trailManager.clear();
    if (this.nametagTexture) this.nametagTexture.dispose();
  }
}
