import { LevelPerk, HatType, TrailType } from '../types';

export const LEVEL_PERKS: LevelPerk[] = [
  {
    level: 1,
    title: 'Anfänger-Sprint',
    description: 'Drücke SHIFT für schnelleres Laufen.',
    type: 'ability',
    unlocked: true,
    icon: '⚡',
  },
  {
    level: 2,
    title: 'Doppelsprung (Double Jump)',
    description: 'Drücke SPACE ein zweites Mal in der Luft für einen Extra-Sprung!',
    type: 'ability',
    unlocked: false,
    icon: '🦘',
  },
  {
    level: 3,
    title: 'Ninja-Stirnband & Regenbogen-Schweif',
    description: 'Rüste das rote Ninja-Band und den bunten Partikel-Schweif aus.',
    type: 'cosmetic',
    unlocked: false,
    icon: '🥷',
  },
  {
    level: 4,
    title: 'Münz-Magnet (Coin Magnet)',
    description: 'Zieht automatisch Münzen im Umkreis von 6 Metern magisch an.',
    type: 'ability',
    unlocked: false,
    icon: '🧲',
  },
  {
    level: 5,
    title: 'Wikingerhelm & Tanz-Emote',
    description: 'Klassischer Stahlhelm mit Hörnern sowie das Tanz-Emote.',
    type: 'cosmetic',
    unlocked: false,
    icon: '⚔️',
  },
  {
    level: 6,
    title: 'Federfall (Low Gravity Boots)',
    description: '25% verringerte Fallbeschleunigung für sanftere Sprünge.',
    type: 'ability',
    unlocked: false,
    icon: '🪶',
  },
  {
    level: 7,
    title: 'Königskrone & Flammen-Schweif',
    description: 'Königliche Goldkrone mit Edelsteinen und lodernder Flammenspur.',
    type: 'cosmetic',
    unlocked: false,
    icon: '👑',
  },
  {
    level: 8,
    title: 'Super-Sprint-Rush',
    description: '35% zusätzliche Sprintgeschwindigkeit bei gehaltenem SHIFT.',
    type: 'ability',
    unlocked: false,
    icon: '🚀',
  },
  {
    level: 9,
    title: 'Heiligenschein & Plasma-Aura',
    description: 'Schwebender goldener Heiligenschein und neon-blaue Plasma-Partikel.',
    type: 'cosmetic',
    unlocked: false,
    icon: '😇',
  },
  {
    level: 10,
    title: 'Meister-Fedora & Ehrenstatus',
    description: 'Der legendäre Roblox-Meisterhut für Obby-Champions.',
    type: 'cosmetic',
    unlocked: false,
    icon: '🎩',
  },
];

// XP curve: Level 1 starts at 0, level 2 at 250, etc.
export const LEVEL_THRESHOLDS = [
  0,     // Level 1
  250,   // Level 2
  600,   // Level 3
  1100,  // Level 4
  1800,  // Level 5
  2700,  // Level 6
  3800,  // Level 7
  5100,  // Level 8
  6600,  // Level 9
  8500,  // Level 10
  11000, // Level 11+
];

const STORAGE_KEY = 'roblox_obby_progression_v1';

export interface ProgressionState {
  xp: number;
  level: number;
  unlockedHats: HatType[];
  unlockedTrails: TrailType[];
}

export class ProgressionManager {
  private state: ProgressionState;
  private listeners: ((state: ProgressionState, gainedXp?: number, levelUp?: boolean) => void)[] = [];

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): ProgressionState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          xp: parsed.xp || 0,
          level: this.calcLevelFromXp(parsed.xp || 0),
          unlockedHats: parsed.unlockedHats || ['none', 'cap'],
          unlockedTrails: parsed.unlockedTrails || ['none'],
        };
      }
    } catch {
      // Fallback
    }

    return {
      xp: 0,
      level: 1,
      unlockedHats: ['none', 'cap'],
      unlockedTrails: ['none'],
    };
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save progression to localStorage:', e);
    }
  }

  public calcLevelFromXp(xp: number): number {
    let lvl = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        lvl = i + 1;
      } else {
        break;
      }
    }
    return lvl;
  }

  public getXpProgress(): { currentLevel: number; xpInLevel: number; xpForLevel: number; totalXp: number } {
    const lvl = this.state.level;
    const currentBase = LEVEL_THRESHOLDS[lvl - 1] || 0;
    const nextBase = LEVEL_THRESHOLDS[lvl] || (currentBase + 3000);

    return {
      currentLevel: lvl,
      xpInLevel: Math.max(0, this.state.xp - currentBase),
      xpForLevel: Math.max(1, nextBase - currentBase),
      totalXp: this.state.xp,
    };
  }

  public addXp(amount: number): { levelUp: boolean; newLevel: number; gainedXp: number } {
    const oldLevel = this.state.level;
    this.state.xp += amount;
    const newLevel = this.calcLevelFromXp(this.state.xp);
    const didLevelUp = newLevel > oldLevel;
    this.state.level = newLevel;

    // Check unlocks on level up
    if (didLevelUp) {
      this.updateUnlocksForLevel(newLevel);
    }

    this.saveState();
    this.notify(amount, didLevelUp);

    return {
      levelUp: didLevelUp,
      newLevel,
      gainedXp: amount,
    };
  }

  private updateUnlocksForLevel(lvl: number) {
    const hats = new Set<HatType>(this.state.unlockedHats);
    const trails = new Set<TrailType>(this.state.unlockedTrails);

    hats.add('none');
    hats.add('cap');

    if (lvl >= 3) {
      hats.add('ninja');
      trails.add('sparkles');
    }
    if (lvl >= 5) {
      hats.add('viking');
    }
    if (lvl >= 7) {
      hats.add('crown');
      trails.add('fire');
    }
    if (lvl >= 9) {
      hats.add('halo');
      trails.add('plasma');
    }
    if (lvl >= 10) {
      hats.add('fedora');
    }

    this.state.unlockedHats = Array.from(hats);
    this.state.unlockedTrails = Array.from(trails);
  }

  public getState(): ProgressionState {
    return { ...this.state };
  }

  public hasPerk(levelRequired: number): boolean {
    return this.state.level >= levelRequired;
  }

  public subscribe(fn: (state: ProgressionState, gainedXp?: number, levelUp?: boolean) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify(gainedXp?: number, levelUp?: boolean) {
    this.listeners.forEach(fn => fn(this.state, gainedXp, levelUp));
  }
}

export const progressionManager = new ProgressionManager();
