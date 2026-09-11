import * as THREE from 'three';
import { InventoryItem, ItemId, ActiveBuff, WorldPickup } from '../types';
import { soundManager } from '../utils/audio';

export const ITEM_DEFINITIONS: Record<ItemId, Omit<InventoryItem, 'count'>> = {
  speed_potion: {
    id: 'speed_potion',
    name: 'Geschwindigkeitstrank',
    description: '+50% Lauf- und Sprinttempo für 15 Sekunden. Zieht einen blauen Energieschweif nach sich.',
    icon: '🧪',
    duration: 15,
    rarity: 'common',
  },
  gravity_coil: {
    id: 'gravity_coil',
    name: 'Schwerkraft-Spirale (Gravity Coil)',
    description: 'Roblox-Klassiker! Reduziert Schwerkraft um 60% für 20 Sekunden – gigantische Sprünge.',
    icon: '🌀',
    duration: 20,
    rarity: 'rare',
  },
  super_spring: {
    id: 'super_spring',
    name: 'Super-Sprungfeder',
    description: 'Katapultiert dich sofort 35 Meter hoch in die Luft, um jede Wand mühelos zu überspringen.',
    icon: '🦘',
    rarity: 'rare',
  },
  safety_shield: {
    id: 'safety_shield',
    name: 'Schutz-Schild (Safety Forcefield)',
    description: 'Schützt vor dem nächsten Lava- oder Hindernistreffer und rettet dich vor dem Tod!',
    icon: '🛡️',
    rarity: 'epic',
  },
  teleport_compass: {
    id: 'teleport_compass',
    name: 'Rückhol-Kompass',
    description: 'Teleportiert dich augenblicklich sicher auf die Plattform deines aktuellen Checkpoints.',
    icon: '🧭',
    rarity: 'common',
  },
  bubble_glider: {
    id: 'bubble_glider',
    name: 'Schwebe-Ballon (Bubble Glider)',
    description: 'Halte SPACE in der Luft für 20 Sekunden, um sanft wie eine Feder durch die Luft zu gleiten.',
    icon: '🎈',
    duration: 20,
    rarity: 'legendary',
  },
};

const STORAGE_KEY = 'roblox_obby_inventory_v1';

export class InventoryManager {
  private items: Map<ItemId, number> = new Map();
  private activeBuffs: Map<ItemId, ActiveBuff> = new Map();
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([id, count]) => {
          if (typeof count === 'number' && count > 0) {
            this.items.set(id as ItemId, count);
          }
        });
      } else {
        // Initial welcome starter pack
        this.items.set('speed_potion', 2);
        this.items.set('super_spring', 1);
        this.items.set('safety_shield', 1);
      }
    } catch {
      this.items.set('speed_potion', 2);
      this.items.set('super_spring', 1);
    }
  }

  private saveState() {
    try {
      const obj: Record<string, number> = {};
      this.items.forEach((count, id) => {
        if (count > 0) obj[id] = count;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to save inventory:', e);
    }
  }

  public getItems(): InventoryItem[] {
    const list: InventoryItem[] = [];
    Object.keys(ITEM_DEFINITIONS).forEach(idStr => {
      const id = idStr as ItemId;
      const count = this.items.get(id) || 0;
      list.push({
        ...ITEM_DEFINITIONS[id],
        count,
      });
    });
    return list;
  }

  public addItem(id: ItemId, quantity = 1) {
    const current = this.items.get(id) || 0;
    this.items.set(id, current + quantity);
    this.saveState();
    this.notify();
  }

  public hasItem(id: ItemId): boolean {
    return (this.items.get(id) || 0) > 0;
  }

  public useItem(id: ItemId): { success: boolean; buffApplied?: boolean; effect?: string } {
    const count = this.items.get(id) || 0;
    if (count <= 0) return { success: false };

    const def = ITEM_DEFINITIONS[id];
    this.items.set(id, count - 1);
    this.saveState();

    soundManager.playCoin(); // audio chime for using item

    if (def.duration) {
      this.activeBuffs.set(id, {
        id,
        name: def.name,
        icon: def.icon,
        remainingTime: def.duration,
        totalTime: def.duration,
      });
    }

    this.notify();
    return { success: true, buffApplied: !!def.duration, effect: id };
  }

  public hasActiveBuff(id: ItemId): boolean {
    return this.activeBuffs.has(id);
  }

  public getActiveBuffs(): ActiveBuff[] {
    return Array.from(this.activeBuffs.values());
  }

  public consumeShield(): boolean {
    const shieldCount = this.items.get('safety_shield') || 0;
    if (shieldCount > 0) {
      this.items.set('safety_shield', shieldCount - 1);
      this.saveState();
      this.notify();
      return true;
    }
    return false;
  }

  public update(delta: number) {
    let changed = false;
    this.activeBuffs.forEach((buff, id) => {
      buff.remainingTime -= delta;
      if (buff.remainingTime <= 0) {
        this.activeBuffs.delete(id);
        changed = true;
      }
    });
    if (changed) {
      this.notify();
    }
  }

  public subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }
}

export const inventoryManager = new InventoryManager();

// Create 3D world pickup mesh
export function createPickupMesh(itemId: ItemId): THREE.Group {
  const group = new THREE.Group();

  // Floating crystalline pedestal / crystal
  let color = 0x00d2d3;
  let emissive = 0x01a3a4;

  if (itemId === 'speed_potion') {
    color = 0x0984e3;
    emissive = 0x74b9ff;
  } else if (itemId === 'gravity_coil') {
    color = 0x9b59b6;
    emissive = 0x8e44ad;
  } else if (itemId === 'super_spring') {
    color = 0xf1c40f;
    emissive = 0xf39c12;
  } else if (itemId === 'safety_shield') {
    color = 0x2ecc71;
    emissive = 0x27ae60;
  } else if (itemId === 'teleport_compass') {
    color = 0xe67e22;
    emissive = 0xd35400;
  } else if (itemId === 'bubble_glider') {
    color = 0xf368e0;
    emissive = 0xff9ff3;
  }

  // Outer glowing crystal / crate
  const outerGeo = new THREE.OctahedronGeometry(0.7, 0);
  const outerMat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 1.2,
    roughness: 0.2,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });
  const outer = new THREE.Mesh(outerGeo, outerMat);
  group.add(outer);

  // Inner rotating core
  const innerGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  group.add(inner);

  // Glowing ring underneath
  const ringGeo = new THREE.RingGeometry(0.8, 1.0, 16);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.7;
  group.add(ring);

  return group;
}
