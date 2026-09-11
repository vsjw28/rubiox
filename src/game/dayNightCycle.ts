import * as THREE from 'three';

export type TimeOfDayPhase = 'morning' | 'day' | 'sunset' | 'night';

export interface DayNightInfo {
  timeHours: number; // 0.0 to 24.0
  formattedTime: string; // "14:32"
  phase: TimeOfDayPhase;
  phaseLabel: string; // "Tag", "Sonnenuntergang", etc.
  phaseIcon: string; // "☀️", "🌅", "🌇", "🌙"
  sunAngle: number; // in radians
}

export class DayNightCycle {
  private scene: THREE.Scene;
  private timeHours = 0.0; // Permanent Midnight (Night only mode as requested)
  private timeSpeed = 0.0;
  
  // Lighting
  private sunLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;

  // Celestial 3D visual meshes
  private celestialGroup: THREE.Group;
  private sunMesh: THREE.Mesh;
  private sunGlow: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private moonGlow: THREE.Mesh;
  private starfield: THREE.Points;
  private starfieldMaterial: THREE.PointsMaterial;

  // Sky color palettes
  private static readonly COLOR_NIGHT = new THREE.Color(0x060a17); // Deep dark midnight blue

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.celestialGroup = new THREE.Group();
    this.scene.add(this.celestialGroup);

    // 1. Setup Ambient & Hemisphere for clear visibility of platforms at night
    this.ambientLight = new THREE.AmbientLight(0x4a5d8c, 0.65);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x283350, 0x111625, 0.45);
    this.scene.add(this.hemiLight);

    // 2. Setup Sun Directional Light (disabled at night)
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 0.0);
    this.scene.add(this.sunLight);

    // 3. Setup Moon Directional Light (crisp moonlight)
    this.moonLight = new THREE.DirectionalLight(0x9bd0ff, 0.85);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 1024;
    this.moonLight.shadow.mapSize.height = 1024;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 350;
    const d = 70;
    this.moonLight.shadow.camera.left = -d;
    this.moonLight.shadow.camera.right = d;
    this.moonLight.shadow.camera.top = d;
    this.moonLight.shadow.camera.bottom = -d;
    this.moonLight.shadow.bias = -0.0005;
    this.scene.add(this.moonLight);

    // 4. Create Sun 3D Visual Mesh (hidden)
    const sunGeo = new THREE.SphereGeometry(7, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff275, visible: false });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.celestialGroup.add(this.sunMesh);

    const sunGlowGeo = new THREE.SphereGeometry(12, 16, 16);
    const sunGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0, visible: false });
    this.sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    this.celestialGroup.add(this.sunGlow);

    // 5. Create Moon 3D Visual Mesh
    const moonGeo = new THREE.SphereGeometry(8.5, 20, 20);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe8f4ff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.celestialGroup.add(this.moonMesh);

    const moonGlowGeo = new THREE.SphereGeometry(13.5, 16, 16);
    const moonGlowMat = new THREE.MeshBasicMaterial({
      color: 0x6bb5ff,
      transparent: true,
      opacity: 0.3,
    });
    this.moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    this.celestialGroup.add(this.moonGlow);

    // 6. Create Starfield with twinkling stars
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.6;

      const r = 320 + Math.random() * 60;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 15;
      const z = r * Math.sin(phi) * Math.sin(theta);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starfieldMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: false,
    });
    this.starfield = new THREE.Points(starGeo, this.starfieldMaterial);
    this.scene.add(this.starfield);

    // Set permanent night initial background and fog
    this.scene.background = DayNightCycle.COLOR_NIGHT;
    this.scene.fog = new THREE.FogExp2(0x060a17, 0.0055);

    // Initial update
    this.update(0);
  }

  public update(delta: number, characterPosition?: THREE.Vector3): DayNightInfo {
    // Starfield slow cosmic rotation
    if (this.starfield) {
      this.starfield.rotation.y += delta * 0.015;
    }

    const center = characterPosition ? characterPosition.clone() : new THREE.Vector3(0, 15, 0);
    this.celestialGroup.position.set(center.x, center.y * 0.4, center.z);
    this.starfield.position.set(center.x, 0, center.z);

    // Moon fixed majestically in the midnight sky
    const moonDist = 200;
    const moonAngle = Math.PI * 0.38;
    const moonX = Math.cos(moonAngle) * moonDist;
    const moonY = Math.sin(moonAngle) * moonDist;
    const moonZ = -70;

    this.moonMesh.position.set(moonX, moonY, moonZ);
    this.moonGlow.position.set(moonX, moonY, moonZ);

    this.moonLight.position.set(center.x + moonX * 0.3, center.y + moonY * 0.3 + 30, center.z + moonZ * 0.3);
    this.moonLight.target.position.set(center.x, center.y, center.z);
    this.moonLight.target.updateMatrixWorld();

    return {
      timeHours: 0.0,
      formattedTime: '00:00',
      phase: 'night',
      phaseLabel: 'Mitternacht',
      phaseIcon: '🌙',
      sunAngle: Math.PI,
    };
  }

  public setTime(hours: number) {
    // Night only
    this.update(0);
  }

  public getTime(): number {
    return 0.0;
  }
}
