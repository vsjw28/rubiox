import React, { useState } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Zap,
  Shield,
  Compass,
  Wind,
  Crown,
  Flame,
  Check,
  X,
  PlusCircle,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StoreItem, StoreCategory, InventoryItem, PlayerCustomization } from '../types';
import { soundManager } from '../utils/audio';

export const STORE_ITEMS: StoreItem[] = [
  // Consumable / Power-up items
  {
    id: 'store_speed',
    name: 'Speed-Trank',
    category: 'items',
    price: 15,
    description: '+50% Tempo beim Laufen & Sprinten für 15 Sek.',
    icon: '🧪',
    rarity: 'common',
    itemId: 'speed_potion',
  },
  {
    id: 'store_spring',
    name: 'Super-Sprungfeder',
    category: 'items',
    price: 20,
    description: 'Katapultiert dich sofort 38m hoch in die Luft!',
    icon: '🚀',
    rarity: 'rare',
    itemId: 'super_spring',
  },
  {
    id: 'store_gravity',
    name: 'Schwerkraft-Spule',
    category: 'items',
    price: 25,
    description: 'Reduziert die Schwerkraft um 60% für 20 Sekunden.',
    icon: '🌀',
    rarity: 'rare',
    itemId: 'gravity_coil',
  },
  {
    id: 'store_glider',
    name: 'Gleiter-Ballon',
    category: 'items',
    price: 25,
    description: 'Sanftes Gleiten in der Luft durch Halten der Sprungtaste.',
    icon: '🎈',
    rarity: 'rare',
    itemId: 'bubble_glider',
  },
  {
    id: 'store_shield',
    name: 'Sicherheitsschild',
    category: 'items',
    price: 30,
    description: 'Schützt dich automatisch vor 1 Sturz oder Lava-Treffer!',
    icon: '🛡️',
    rarity: 'epic',
    itemId: 'safety_shield',
  },
  {
    id: 'store_compass',
    name: 'Teleport-Kompass',
    category: 'items',
    price: 15,
    description: 'Beamt dich sofort zurück zu deinem letzten Checkpoint.',
    icon: '🧭',
    rarity: 'common',
    itemId: 'teleport_compass',
  },

  // Exclusive Cosmetics
  {
    id: 'store_crown',
    name: 'Königskrone',
    category: 'cosmetics',
    price: 50,
    description: 'Exklusive goldene Krone mit glänzenden Rubinen.',
    icon: '👑',
    rarity: 'legendary',
    hatType: 'crown',
  },
  {
    id: 'store_fedora',
    name: 'Meister-Fedora',
    category: 'cosmetics',
    price: 45,
    description: 'Der legendäre Roblox-Hut mit feinem Goldband.',
    icon: '🎩',
    rarity: 'epic',
    hatType: 'fedora',
  },
  {
    id: 'store_halo',
    name: 'Heiligenschein',
    category: 'cosmetics',
    price: 40,
    description: 'Schwebender, leuchtender Heiligenschein.',
    icon: '😇',
    rarity: 'rare',
    hatType: 'halo',
  },
  {
    id: 'store_ninja',
    name: 'Ninja-Stirnband',
    category: 'cosmetics',
    price: 35,
    description: 'Traditionelles rotes Stirnband mit wehendem Band.',
    icon: '🥷',
    rarity: 'rare',
    hatType: 'ninja',
  },
  {
    id: 'store_fire_trail',
    name: 'Flammen-Schweif',
    category: 'cosmetics',
    price: 40,
    description: 'Hinterlasse feurige Partikel bei jedem Schritt!',
    icon: '🔥',
    rarity: 'epic',
    trailType: 'fire',
  },
  {
    id: 'store_plasma_trail',
    name: 'Plasma-Aura',
    category: 'cosmetics',
    price: 55,
    description: 'Mystische violette Partikelaura für echte Champions.',
    icon: '⚡',
    rarity: 'legendary',
    trailType: 'plasma',
  },
  {
    id: 'store_sparkles_trail',
    name: 'Sternenregen',
    category: 'cosmetics',
    price: 30,
    description: 'Glitzernde Goldsterne wirbeln um deine Füße.',
    icon: '✨',
    rarity: 'rare',
    trailType: 'sparkles',
  },
];

interface StoreModalProps {
  coins: number;
  inventory: InventoryItem[];
  customization: PlayerCustomization;
  onClose: () => void;
  onBuyItem: (item: StoreItem) => boolean;
}

export const StoreModal: React.FC<StoreModalProps> = ({
  coins,
  inventory,
  customization,
  onClose,
  onBuyItem,
}) => {
  const [activeCategory, setActiveCategory] = useState<StoreCategory>('items');
  const [purchaseNotice, setPurchaseNotice] = useState<{ text: string; success: boolean } | null>(null);

  const filteredItems = STORE_ITEMS.filter(i => i.category === activeCategory);

  const handlePurchase = (item: StoreItem) => {
    if (coins < item.price) {
      soundManager.playOof();
      setPurchaseNotice({
        text: `Nicht genug Münzen! Du brauchst ${item.price} 🪙 (hast ${coins}).`,
        success: false,
      });
      setTimeout(() => setPurchaseNotice(null), 3500);
      return;
    }

    const success = onBuyItem(item);
    if (success) {
      soundManager.playVictory();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
      });
      setPurchaseNotice({
        text: `Erfolgreich gekauft: ${item.name}! 🎉`,
        success: true,
      });
      setTimeout(() => setPurchaseNotice(null), 3500);
    }
  };

  const getRarityBadge = (rarity: StoreItem['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300 border border-amber-500/30">Legendär</span>;
      case 'epic':
        return <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-purple-300 border border-purple-500/30">Episch</span>;
      case 'rare':
        return <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-blue-300 border border-blue-500/30">Selten</span>;
      default:
        return <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/30">Standard</span>;
    }
  };

  return (
    <div
      id="store-modal-overlay"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-5 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="store-modal-content"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border-2 border-amber-400/40 bg-slate-900/95 text-white shadow-2xl overflow-hidden"
      >
        {/* Header with Coin Counter */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-amber-600/25 via-slate-900 to-slate-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-2xl shadow-lg shadow-amber-500/25">
              🛍️
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide text-white flex items-center gap-2">
                Roblox Obby Store
                <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-bold">50 Stages</span>
              </h2>
              <p className="text-xs text-slate-400">Hol dir hilfreiche Power-Ups und coole Kosmetika mit deinen Münzen</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Coins Balance */}
            <div className="flex items-center gap-2 rounded-2xl border border-amber-400/60 bg-amber-500/20 px-3.5 py-1.5 shadow-inner">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <div className="text-right">
                <span className="text-xs text-amber-300 font-semibold block leading-none">Münzen</span>
                <span className="text-base font-black text-amber-400 leading-tight">{coins} 🪙</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Purchase Notification Banner */}
        {purchaseNotice && (
          <div
            className={`px-4 py-2.5 text-center text-xs font-bold transition-all ${
              purchaseNotice.success
                ? 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30'
            }`}
          >
            {purchaseNotice.text}
          </div>
        )}

        {/* Categories Tab Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveCategory('items')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition cursor-pointer ${
              activeCategory === 'items'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Power-Up Items ({STORE_ITEMS.filter(i => i.category === 'items').length})</span>
          </button>

          <button
            onClick={() => setActiveCategory('cosmetics')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition cursor-pointer ${
              activeCategory === 'cosmetics'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="h-4 w-4" />
            <span>Kosmetika & Trails ({STORE_ITEMS.filter(i => i.category === 'cosmetics').length})</span>
          </button>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredItems.map(item => {
              // Check owned count
              let ownedCount = 0;
              let isEquipped = false;
              if (item.itemId) {
                const inv = inventory.find(i => i.id === item.itemId);
                ownedCount = inv ? inv.count : 0;
              } else if (item.hatType) {
                isEquipped = customization.hat === item.hatType;
              } else if (item.trailType) {
                isEquipped = customization.trail === item.trailType;
              }

              const canAfford = coins >= item.price;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-800/60 p-3.5 transition-all hover:border-slate-700 hover:bg-slate-800/90 shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 text-3xl shadow-inner">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="font-black text-sm text-white truncate">{item.name}</h4>
                        {getRarityBadge(item.rarity)}
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer with Price and Buy Button */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-1.5 font-black text-amber-400 text-sm">
                      <span>{item.price}</span>
                      <span className="text-xs">🪙 Münzen</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ownedCount > 0 && (
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded-lg">
                          Im Rucksack: {ownedCount}
                        </span>
                      )}
                      {isEquipped && (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Check className="h-3 w-3" /> Ausgerüstet
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                          canAfford
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Kaufen</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info note */}
        <div className="border-t border-slate-800 bg-slate-950/60 px-5 py-3 flex items-center justify-between text-xs text-slate-400">
          <span>Tipp: Sammle Münzen auf den Plattformen aller 50 Stages!</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-amber-400 hover:text-amber-300 transition cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
