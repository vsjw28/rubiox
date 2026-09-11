import * as THREE from 'three';
import { HatType, TrailType } from '../types';

export function createHatMesh(type: HatType): THREE.Group | null {
  if (type === 'none') return null;

  const group = new THREE.Group();

  switch (type) {
    case 'cap': {
      // Classic baseball cap
      const crownGeo = new THREE.CylinderGeometry(0.52, 0.54, 0.35, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.5 });
      const capCrown = new THREE.Mesh(crownGeo, capMat);
      capCrown.position.y = 0.55;
      group.add(capCrown);

      // Brim
      const brimGeo = new THREE.BoxGeometry(0.65, 0.06, 0.65);
      const brim = new THREE.Mesh(brimGeo, capMat);
      brim.position.set(0, 0.42, 0.45);
      group.add(brim);

      // Top button
      const btnGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const btn = new THREE.Mesh(btnGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
      btn.position.y = 0.74;
      group.add(btn);
      break;
    }

    case 'crown': {
      // Royal Golden Crown
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.85,
        roughness: 0.2,
        emissive: 0x553300,
      });

      const baseGeo = new THREE.CylinderGeometry(0.55, 0.52, 0.25, 20);
      const base = new THREE.Mesh(baseGeo, goldMat);
      base.position.y = 0.52;
      group.add(base);

      // 5 Crown points (cones)
      const numPoints = 5;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const peakGeo = new THREE.ConeGeometry(0.12, 0.35, 4);
        const peak = new THREE.Mesh(peakGeo, goldMat);
        const px = Math.cos(angle) * 0.48;
        const pz = Math.sin(angle) * 0.48;
        peak.position.set(px, 0.75, pz);
        group.add(peak);

        // Gemstone on each peak
        const gemGeo = new THREE.OctahedronGeometry(0.06);
        const gemMat = new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xff0044 : 0x00ccff,
          emissive: i % 2 === 0 ? 0x880022 : 0x004488,
          roughness: 0.1,
        });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        gem.position.set(px, 0.94, pz);
        group.add(gem);
      }
      break;
    }

    case 'halo': {
      // Floating Angel Halo
      const haloGeo = new THREE.TorusGeometry(0.48, 0.08, 12, 24);
      const haloMat = new THREE.MeshStandardMaterial({
        color: 0xffea00,
        emissive: 0xffd700,
        emissiveIntensity: 1.5,
        roughness: 0.1,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.95;
      group.add(halo);
      break;
    }

    case 'viking': {
      // Viking Helmet
      const helmetGeo = new THREE.SphereGeometry(0.56, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });
      const helmet = new THREE.Mesh(helmetGeo, steelMat);
      helmet.position.y = 0.5;
      group.add(helmet);

      const hornMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.4 });
      // Left horn
      const leftHornGeo = new THREE.ConeGeometry(0.14, 0.6, 8);
      const leftHorn = new THREE.Mesh(leftHornGeo, hornMat);
      leftHorn.position.set(0.58, 0.7, 0);
      leftHorn.rotation.z = -Math.PI / 3;
      leftHorn.rotation.x = -0.2;
      group.add(leftHorn);

      // Right horn
      const rightHornGeo = new THREE.ConeGeometry(0.14, 0.6, 8);
      const rightHorn = new THREE.Mesh(rightHornGeo, hornMat);
      rightHorn.position.set(-0.58, 0.7, 0);
      rightHorn.rotation.z = Math.PI / 3;
      rightHorn.rotation.x = -0.2;
      group.add(rightHorn);
      break;
    }

    case 'ninja': {
      // Ninja Headband
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.4 });
      const bandGeo = new THREE.BoxGeometry(1.06, 0.22, 1.06);
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.y = 0.2;
      group.add(band);

      // Trailing ribbon behind
      const ribbonGeo = new THREE.BoxGeometry(0.2, 0.6, 0.04);
      const ribbon1 = new THREE.Mesh(ribbonGeo, bandMat);
      ribbon1.position.set(-0.15, -0.1, -0.6);
      ribbon1.rotation.x = 0.4;
      group.add(ribbon1);

      const ribbon2 = new THREE.Mesh(ribbonGeo, bandMat);
      ribbon2.position.set(0.15, -0.12, -0.62);
      ribbon2.rotation.x = 0.35;
      ribbon2.rotation.z = 0.1;
      group.add(ribbon2);
      break;
    }

    case 'party': {
      // Party Cone Hat
      const coneGeo = new THREE.ConeGeometry(0.38, 0.85, 16);
      const partyMat = new THREE.MeshStandardMaterial({ color: 0xe056fd, roughness: 0.4 });
      const cone = new THREE.Mesh(coneGeo, partyMat);
      cone.position.y = 0.85;
      group.add(cone);

      const pompomGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const pompom = new THREE.Mesh(pompomGeo, new THREE.MeshStandardMaterial({ color: 0xffbe76 }));
      pompom.position.y = 1.3;
      group.add(pompom);
      break;
    }

    case 'fedora': {
      // Classic Fedora
      const fedoraMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.6 });
      const brimGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.05, 20);
      const brim = new THREE.Mesh(brimGeo, fedoraMat);
      brim.position.y = 0.42;
      group.add(brim);

      const crownGeo = new THREE.CylinderGeometry(0.48, 0.54, 0.45, 18);
      const crown = new THREE.Mesh(crownGeo, fedoraMat);
      crown.position.y = 0.65;
      group.add(crown);

      // Red band
      const bandGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 18);
      const band = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: 0xd63031 }));
      band.position.y = 0.48;
      group.add(band);
      break;
    }
  }

  return group;
}

export class ParticleTrailManager {
  private particles: {
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    velocity: THREE.Vector3;
  }[] = [];
  public group = new THREE.Group();

  constructor() {}

  public emit(pos: THREE.Vector3, type: TrailType) {
    if (type === 'none') return;

    let color = 0xffffff;
    let size = 0.18;
    if (type === 'sparkles') {
      const colors = [0xffd32a, 0xff3f34, 0x05c46b, 0x0fbcf9, 0xef5777];
      color = colors[Math.floor(Math.random() * colors.length)];
      size = 0.16 + Math.random() * 0.1;
    } else if (type === 'fire') {
      const colors = [0xff3838, 0xff9f1a, 0xffb8b8, 0xff5252];
      color = colors[Math.floor(Math.random() * colors.length)];
      size = 0.2 + Math.random() * 0.15;
    } else if (type === 'plasma') {
      const colors = [0x7d5fff, 0x7158e2, 0x18dcff, 0x67e6dc];
      color = colors[Math.floor(Math.random() * colors.length)];
      size = 0.18 + Math.random() * 0.12;
    }

    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);

    // Position at character feet / torso with slight jitter
    mesh.position.set(
      pos.x + (Math.random() - 0.5) * 0.6,
      pos.y + 0.3 + Math.random() * 0.6,
      pos.z + (Math.random() - 0.5) * 0.6
    );

    this.group.add(mesh);
    this.particles.push({
      mesh,
      life: 0,
      maxLife: 0.6 + Math.random() * 0.4,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        type === 'fire' ? 1.2 + Math.random() * 0.8 : (Math.random() - 0.2) * 0.8,
        (Math.random() - 0.5) * 0.5
      ),
    });
  }

  public update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      p.mesh.position.x += p.velocity.x * delta;
      p.mesh.position.y += p.velocity.y * delta;
      p.mesh.position.z += p.velocity.z * delta;

      p.mesh.rotation.x += delta * 4;
      p.mesh.rotation.y += delta * 4;

      const progress = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress);
      const scale = Math.max(0.1, 1 - progress * 0.8);
      p.mesh.scale.set(scale, scale, scale);

      if (p.life >= p.maxLife) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  public clear() {
    this.particles.forEach(p => {
      this.group.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
  }
}
