export interface Checkpoint {
  id: number;
  name: string;
  position: [number, number, number];
}

export interface PlatformObstacle {
  type: 'solid' | 'lava' | 'bounce' | 'moving' | 'spinner' | 'finish';
  position: [number, number, number];
  size: [number, number, number];
  color: number;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  axis?: 'x' | 'y' | 'z';
  range?: number;
  speed?: number;
  center?: [number, number, number];
  rotationSpeed?: number;
}

export interface CoinCollectible {
  id: number;
  position: [number, number, number];
  collected: boolean;
}

export type GameMode = 'menu' | 'singleplayer' | 'multiplayer_race';

export interface RaceOpponentState {
  id: string;
  name: string;
  stage: number;
  totalStages: number;
  progressPercent: number;
  isFinished: boolean;
  finishTime?: number;
  isAi?: boolean;
}

export interface PlayerStats {
  currentStage: number;
  totalStages: number;
  coins: number;
  totalCoins: number;
  deaths: number;
  timeElapsed: number;
  isFinished: boolean;
  level: number;
  xp: number;
  xpCurrentLevel: number;
  xpNextLevel: number;
}

export type HatType = 'none' | 'cap' | 'crown' | 'halo' | 'viking' | 'ninja' | 'party' | 'fedora';
export type TrailType = 'none' | 'sparkles' | 'fire' | 'plasma';
export type EmoteType = 'wave' | 'cheer' | 'dance' | 'highfive';

export interface PlayerCustomization {
  name: string;
  headColor: string;
  torsoColor: string;
  legsColor: string;
  hat: HatType;
  trail: TrailType;
}

export type ItemId =
  | 'speed_potion'
  | 'gravity_coil'
  | 'super_spring'
  | 'safety_shield'
  | 'teleport_compass'
  | 'bubble_glider';

export interface InventoryItem {
  id: ItemId;
  name: string;
  description: string;
  icon: string;
  count: number;
  duration?: number; // duration in seconds if timed buff
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface ActiveBuff {
  id: ItemId;
  name: string;
  icon: string;
  remainingTime: number; // in seconds
  totalTime: number;
}

export interface RemotePlayerData {
  id: string;
  name: string;
  level: number;
  headColor: string;
  torsoColor: string;
  legsColor: string;
  hat: HatType;
  trail: TrailType;
  position: [number, number, number];
  rotationY: number;
  walkCycle: number;
  isMoving: boolean;
  isJumping: boolean;
  stage: number;
  lastMessage?: string;
  messageTimer?: number;
  activeEmote?: EmoteType;
  emoteTimer?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface LevelPerk {
  level: number;
  title: string;
  description: string;
  type: 'ability' | 'cosmetic';
  unlocked: boolean;
  icon: string;
}

export interface WorldPickup {
  id: string;
  itemId: ItemId;
  position: [number, number, number];
  collected: boolean;
  mesh?: any;
  respawnTime?: number;
}

export type StoreCategory = 'items' | 'cosmetics';

export interface StoreItem {
  id: string;
  name: string;
  category: StoreCategory;
  price: number; // in coins
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  itemId?: ItemId;
  hatType?: HatType;
  trailType?: TrailType;
}

export interface DayNightState {
  timeHours: number;
  formattedTime: string;
  phase: 'morning' | 'day' | 'sunset' | 'night';
  phaseLabel: string;
  phaseIcon: string;
}
