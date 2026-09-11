import * as THREE from 'three';
import { HatType, TrailType, EmoteType } from '../types';
import { createHatMesh, ParticleTrailManager } from './accessories';

export interface RobloxCharacter {
  group: THREE.Group;
  head: THREE.Mesh;
  torso: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  velocity: THREE.Vector3;
  isGrounded: boolean;
  canJump: boolean;
  jumpsRemaining: number;
  walkCycle: number;
  rotationY: number;
  currentHat: HatType;
  hatGroup: THREE.Group | null;
  currentTrail: TrailType;
  trailManager: ParticleTrailManager;
  currentEmote: EmoteType | null;
  emoteTimer: number;

  applyHat: (hat: HatType) => void;
  applyColors: (head: string, torso: string, legs: string) => void;
  triggerEmote: (emote: EmoteType) => void;
  updateAnimation: (isMoving: boolean, isJumping: boolean, delta: number) => void;
  resetPose: () => void;
}

// Generate the classic Roblox smile face texture on canvas
function createFaceTexture(baseColorHex = '#f5cd30'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 256, 256);

  // Eyes
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(80, 105, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(176, 105, 18, 0, Math.PI * 2);
  ctx.fill();

  // Eye shines
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(85, 100, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(181, 100, 6, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(128, 135, 52, 0.25 * Math.PI, 0.75 * Math.PI, false);
  ctx.stroke();

  // Cheeks
  ctx.fillStyle = 'rgba(255, 120, 100, 0.4)';
  ctx.beginPath();
  ctx.arc(60, 140, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(196, 140, 16, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRobloxCharacter(
  initialHeadColor = '#f5cd30',
  initialTorsoColor = '#0d69ac',
  initialLegsColor = '#278d2b'
): RobloxCharacter {
  const group = new THREE.Group();

  let headMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialHeadColor),
    roughness: 0.4,
    metalness: 0.1,
  });

  let torsoMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialTorsoColor),
    roughness: 0.4,
    metalness: 0.1,
  });

  let legsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialLegsColor),
    roughness: 0.4,
    metalness: 0.1,
  });

  let faceTexture = createFaceTexture(initialHeadColor);
  let faceMat = new THREE.MeshStandardMaterial({
    map: faceTexture,
    roughness: 0.4,
    metalness: 0.1,
  });

  const headMaterials = [headMat, headMat, headMat, headMat, faceMat, headMat];
  const headGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  const head = new THREE.Mesh(headGeo, headMaterials);
  head.castShadow = true;
  head.receiveShadow = true;
  head.position.set(0, 3.25, 0);

  const studGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16);
  const stud = new THREE.Mesh(studGeo, headMat);
  stud.position.set(0, 0.55, 0);
  stud.castShadow = true;
  head.add(stud);
  group.add(head);

  const torsoGeo = new THREE.BoxGeometry(1.6, 1.8, 0.9);
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.castShadow = true;
  torso.receiveShadow = true;
  torso.position.set(0, 1.9, 0);
  group.add(torso);

  function createLimb(w: number, h: number, d: number, mat: THREE.Material, px: number, py: number, pz: number) {
    const pivot = new THREE.Group();
    pivot.position.set(px, py, pz);

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(0, -h / 2, 0);

    pivot.add(mesh);
    return { pivot, mesh };
  }

  const leftArmData = createLimb(0.7, 1.7, 0.7, headMat, 1.15, 2.7, 0);
  const leftArm = leftArmData.pivot;
  group.add(leftArm);

  const rightArmData = createLimb(0.7, 1.7, 0.7, headMat, -1.15, 2.7, 0);
  const rightArm = rightArmData.pivot;
  group.add(rightArm);

  const leftLegData = createLimb(0.75, 1.8, 0.8, legsMat, 0.42, 1.0, 0);
  const leftLeg = leftLegData.pivot;
  group.add(leftLeg);

  const rightLegData = createLimb(0.75, 1.8, 0.8, legsMat, -0.42, 1.0, 0);
  const rightLeg = rightLegData.pivot;
  group.add(rightLeg);

  const trailManager = new ParticleTrailManager();

  const character: RobloxCharacter = {
    group,
    head,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    velocity: new THREE.Vector3(0, 0, 0),
    isGrounded: true,
    canJump: true,
    jumpsRemaining: 1,
    walkCycle: 0,
    rotationY: 0,
    currentHat: 'none',
    hatGroup: null,
    currentTrail: 'none',
    trailManager,
    currentEmote: null,
    emoteTimer: 0,

    applyHat(hat: HatType) {
      if (this.hatGroup) {
        head.remove(this.hatGroup);
        this.hatGroup = null;
      }
      this.currentHat = hat;
      const mesh = createHatMesh(hat);
      if (mesh) {
        this.hatGroup = mesh;
        head.add(this.hatGroup);
      }
    },

    applyColors(hCol: string, tCol: string, lCol: string) {
      headMat.color.set(hCol);
      torsoMat.color.set(tCol);
      legsMat.color.set(lCol);
      faceTexture.dispose();
      faceTexture = createFaceTexture(hCol);
      faceMat.map = faceTexture;
      faceMat.needsUpdate = true;
    },

    triggerEmote(emote: EmoteType) {
      this.currentEmote = emote;
      this.emoteTimer = 4.0;
    },

    updateAnimation(isMoving: boolean, isJumping: boolean, delta: number) {
      // Trail effect
      if (isMoving && this.currentTrail !== 'none') {
        this.trailManager.emit(this.group.position, this.currentTrail);
      }
      this.trailManager.update(delta);

      // Handle emote if active and not moving/jumping
      if (this.currentEmote && this.emoteTimer > 0) {
        this.emoteTimer -= delta;
        if (isMoving || isJumping) {
          this.currentEmote = null;
        } else {
          this.walkCycle += delta * 8;
          if (this.currentEmote === 'wave') {
            rightArm.rotation.x = -2.4;
            rightArm.rotation.z = -0.5 + Math.sin(this.walkCycle * 2) * 0.5;
            leftArm.rotation.x = 0;
            leftArm.rotation.z = 0.1;
          } else if (this.currentEmote === 'cheer') {
            rightArm.rotation.x = -2.8;
            leftArm.rotation.x = -2.8;
            rightArm.rotation.z = -0.3;
            leftArm.rotation.z = 0.3;
          } else if (this.currentEmote === 'dance') {
            const sway = Math.sin(this.walkCycle * 2);
            torso.rotation.y = sway * 0.4;
            head.rotation.y = -sway * 0.3;
            leftArm.rotation.x = Math.sin(this.walkCycle * 2) * 1.0;
            rightArm.rotation.x = -Math.sin(this.walkCycle * 2) * 1.0;
          } else if (this.currentEmote === 'highfive') {
            rightArm.rotation.x = -1.6;
            rightArm.rotation.z = -0.2;
            leftArm.rotation.x = 0;
          }
          return;
        }
      }

      if (isJumping) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.2, 15 * delta);
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.2, 15 * delta);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.4, 15 * delta);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.4, 15 * delta);

        leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0.35, 15 * delta);
        rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, -0.2, 15 * delta);
        return;
      }

      if (isMoving) {
        this.walkCycle += delta * 12;
        const armAngle = Math.sin(this.walkCycle) * 0.9;
        const legAngle = Math.sin(this.walkCycle) * 0.85;

        leftArm.rotation.x = -armAngle;
        rightArm.rotation.x = armAngle;
        leftArm.rotation.z = 0.08;
        rightArm.rotation.z = -0.08;

        leftLeg.rotation.x = legAngle;
        rightLeg.rotation.x = -legAngle;

        head.position.y = 3.25 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.08;
        torso.position.y = 1.9 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.05;
        torso.rotation.y = 0;
        head.rotation.y = 0;
      } else {
        this.walkCycle += delta * 2.5;
        const idleSwing = Math.sin(this.walkCycle) * 0.04;

        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, idleSwing, 10 * delta);
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -idleSwing, 10 * delta);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.05, 10 * delta);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.05, 10 * delta);

        leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 10 * delta);
        rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 10 * delta);

        head.position.y = 3.25 + Math.sin(this.walkCycle) * 0.03;
        torso.position.y = 1.9;
        torso.rotation.y = 0;
        head.rotation.y = 0;
      }
    },

    resetPose() {
      leftArm.rotation.set(0, 0, 0);
      rightArm.rotation.set(0, 0, 0);
      leftLeg.rotation.set(0, 0, 0);
      rightLeg.rotation.set(0, 0, 0);
      head.position.set(0, 3.25, 0);
      torso.position.set(0, 1.9, 0);
      torso.rotation.y = 0;
      head.rotation.y = 0;
      this.walkCycle = 0;
      this.currentEmote = null;
    },
  };

  return character;
}
