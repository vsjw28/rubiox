import React, { useState } from 'react';
import { X, Package, Shirt, Award, Check, Lock, Zap, Sparkles } from 'lucide-react';
import { InventoryItem, ItemId, PlayerCustomization, HatType, TrailType } from '../types';
import { LEVEL_PERKS, progressionManager } from '../game/progression';

interface InventoryModalProps {
  items: InventoryItem[];
  customization: PlayerCustomization;
  level: number;
  xpProgress: { currentLevel: number; xpInLevel: number; xpForLevel: number; totalXp: number };
  onClose: () => void;
  onUseItem: (id: ItemId) => void;
  onUpdateCustomization: (c: Partial<PlayerCustomization>) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  items,
  customization,
  level,
  xpProgress,
  onClose,
  onUseItem,
  onUpdateCustomization,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'wardrobe' | 'progression'>('items');
  const [nameInput, setNameInput] = useState(customization.name);

  const hatsList: { type: HatType; name: string; minLevel: number; icon: string }[] = [
    { type: 'none', name: 'Kein Hut', minLevel: 1, icon: '🚫' },
    { type: 'cap', name: 'Rote Baseball-Cap', minLevel: 1, icon: '🧢' },
    { type: 'ninja', name: 'Ninja-Stirnband', minLevel: 3, icon: '🥷' },
    { type: 'party', name: 'Party-Hut', minLevel: 4, icon: '🎉' },
    { type: 'viking', name: 'Wikinger-Helm', minLevel: 5, icon: '⚔️' },
    { type: 'crown', name: 'Königskrone', minLevel: 7, icon: '👑' },
    { type: 'halo', name: 'Heiligenschein', minLevel: 9, icon: '😇' },
    { type: 'fedora', name: 'Meister-Fedora', minLevel: 10, icon: '🎩' },
  ];

  const trailsList: { type: TrailType; name: string; minLevel: number; icon: string }[] = [
    { type: 'none', name: 'Kein Schweif', minLevel: 1, icon: '🚫' },
    { type: 'sparkles', name: 'Sternenregen (Bunt)', minLevel: 3, icon: '✨' },
    { type: 'fire', name: 'Flammen-Schweif', minLevel: 7, icon: '🔥' },
    { type: 'plasma', name: 'Plasma-Aura', minLevel: 9, icon: '⚡' },
  ];

  const colorPresets = [
    '#f5cd30', '#0d69ac', '#278d2b', '#d63031', '#e84393',
    '#6c5ce7', '#00cec9', '#fdcb6e', '#e17055', '#2d3436', '#ffffff'
  ];

  const handleNameSave = () => {
    const trimmed = nameInput.trim().slice(0, 16);
    if (trimmed) {
      onUpdateCustomization({ name: trimmed });
    }
  };

  return (
    <div
      id="inventory-modal-overlay"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide text-white">Rucksack & Garderobe</h2>
              <p className="text-xs text-slate-400">Verwalte Items, kosmetische Hüte und Level-Fähigkeiten</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'items'
                ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Gegenstände ({items.reduce((acc, i) => acc + i.count, 0)})</span>
          </button>

          <button
            onClick={() => setActiveTab('wardrobe')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'wardrobe'
                ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>Garderobe & Avatar</span>
          </button>

          <button
            onClick={() => setActiveTab('progression')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'progression'
                ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Fähigkeiten (Lv. {level})</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto max-h-[60vh] flex flex-col gap-4">
          {/* TAB 1: INVENTORY ITEMS */}
          {activeTab === 'items' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(item => {
                const isOwned = item.count > 0;
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isOwned
                        ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50 shadow-md'
                        : 'bg-slate-800/30 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-3xl">{item.icon}</span>
                          <div>
                            <h3 className="font-bold text-sm text-white">{item.name}</h3>
                            <span
                              className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                item.rarity === 'legendary'
                                  ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                                  : item.rarity === 'epic'
                                  ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40'
                                  : item.rarity === 'rare'
                                  ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {item.rarity}
                            </span>
                          </div>
                        </div>

                        <span className="text-sm font-black text-amber-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                          x{item.count}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.duration ? `Dauer: ${item.duration}s` : 'Sofort-Effekt'}
                      </span>

                      <button
                        onClick={() => {
                          onUseItem(item.id);
                        }}
                        disabled={!isOwned}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isOwned
                            ? 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-md cursor-pointer'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Benutzen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: WARDROBE & AVATAR */}
          {activeTab === 'wardrobe' && (
            <div className="flex flex-col gap-6">
              {/* Player Name Change */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Spielername (wird im Multiplayer angezeigt)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    maxLength={16}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleNameSave}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Speichern
                  </button>
                </div>
              </div>

              {/* Hats Selection */}
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <span>Hüte & Kopfbedeckungen</span>
                  <span className="text-xs text-slate-400 font-normal">(Steige im Level auf, um mehr freizuschalten)</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {hatsList.map(hat => {
                    const isUnlocked = level >= hat.minLevel;
                    const isEquipped = customization.hat === hat.type;

                    return (
                      <button
                        key={hat.type}
                        disabled={!isUnlocked}
                        onClick={() => onUpdateCustomization({ hat: hat.type })}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                          isEquipped
                            ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-500 text-white'
                            : isUnlocked
                            ? 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-200 cursor-pointer'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className="text-2xl mb-1">{hat.icon}</span>
                        <span className="font-bold text-xs">{hat.name}</span>
                        {!isUnlocked ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-bold">
                            <Lock className="w-3 h-3" /> Ab Lv. {hat.minLevel}
                          </span>
                        ) : isEquipped ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-bold">
                            <Check className="w-3 h-3" /> Ausgerüstet
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 mt-1">Auswählen</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Particle Trails */}
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2.5">
                  Partikel-Schweife (Trails)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {trailsList.map(trail => {
                    const isUnlocked = level >= trail.minLevel;
                    const isEquipped = customization.trail === trail.type;

                    return (
                      <button
                        key={trail.type}
                        disabled={!isUnlocked}
                        onClick={() => onUpdateCustomization({ trail: trail.type })}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                          isEquipped
                            ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-500 text-white'
                            : isUnlocked
                            ? 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-200 cursor-pointer'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className="text-2xl mb-1">{trail.icon}</span>
                        <span className="font-bold text-xs">{trail.name}</span>
                        {!isUnlocked ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-bold">
                            <Lock className="w-3 h-3" /> Ab Lv. {trail.minLevel}
                          </span>
                        ) : isEquipped ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-bold">
                            <Check className="w-3 h-3" /> Ausgerüstet
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 mt-1">Auswählen</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Customizer */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Roblox-Blockfarben (Kopf, Torso, Beine)
                </h3>

                {/* Head Color */}
                <div>
                  <span className="text-xs text-slate-300 font-bold block mb-1.5">Kopffarbe:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {colorPresets.map(col => (
                      <button
                        key={col}
                        onClick={() => onUpdateCustomization({ headColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer ${
                          customization.headColor === col ? 'border-white scale-110 shadow-lg' : 'border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Torso Color */}
                <div>
                  <span className="text-xs text-slate-300 font-bold block mb-1.5">Torsofarbe:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {colorPresets.map(col => (
                      <button
                        key={col}
                        onClick={() => onUpdateCustomization({ torsoColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer ${
                          customization.torsoColor === col ? 'border-white scale-110 shadow-lg' : 'border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Legs Color */}
                <div>
                  <span className="text-xs text-slate-300 font-bold block mb-1.5">Beinfarbe:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {colorPresets.map(col => (
                      <button
                        key={col}
                        onClick={() => onUpdateCustomization({ legsColor: col })}
                        style={{ backgroundColor: col }}
                        className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer ${
                          customization.legsColor === col ? 'border-white scale-110 shadow-lg' : 'border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEVEL PROGRESSION & PERKS */}
          {activeTab === 'progression' && (
            <div className="flex flex-col gap-4">
              {/* Progress Summary Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 border border-blue-500/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-amber-300">Level {level}</span>
                    <span className="text-xs text-slate-300 font-medium">
                      ({xpProgress.totalXp} Gesamt-XP)
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-300">
                    {xpProgress.xpInLevel} / {xpProgress.xpForLevel} XP zum nächsten Level
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (xpProgress.xpInLevel / xpProgress.xpForLevel) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Perks timeline */}
              <div className="flex flex-col gap-2.5">
                {LEVEL_PERKS.map(perk => {
                  const isUnlocked = level >= perk.level;
                  return (
                    <div
                      key={perk.level}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isUnlocked
                          ? 'bg-slate-800/80 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold border ${
                            isUnlocked
                              ? 'bg-emerald-950/60 border-emerald-400/50 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                          }`}
                        >
                          {perk.icon}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-amber-400/30">
                              Lv. {perk.level}
                            </span>
                            <h4 className="font-bold text-sm text-white">{perk.title}</h4>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{perk.description}</p>
                        </div>
                      </div>

                      <div>
                        {isUnlocked ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40">
                            <Check className="w-3.5 h-3.5" /> Aktiv
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-400 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
                            <Lock className="w-3.5 h-3.5" /> Gesperrt
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
