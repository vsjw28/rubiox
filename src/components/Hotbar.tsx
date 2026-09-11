import React from 'react';
import { InventoryItem, ActiveBuff, ItemId } from '../types';

interface HotbarProps {
  items: InventoryItem[];
  activeBuffs: ActiveBuff[];
  onUseItem: (id: ItemId) => void;
  onOpenInventory: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({
  items,
  activeBuffs,
  onUseItem,
  onOpenInventory,
}) => {
  // Show up to 5 items that player has in inventory
  const availableItems = items.filter(item => item.count > 0).slice(0, 5);
  // Pad with empty slots up to 5
  const slots = Array.from({ length: 5 }, (_, i) => availableItems[i] || null);

  return (
    <div className="flex flex-col items-center gap-2 pointer-events-auto select-none">
      {/* Active Buffs bar */}
      {activeBuffs.length > 0 && (
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-400/30 shadow-lg">
          <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Aktive Buffs:</span>
          {activeBuffs.map(buff => (
            <div
              key={buff.id}
              className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-600/30 rounded-full border border-blue-400/40 text-xs font-bold text-white shadow-sm"
              title={`${buff.name}: noch ${Math.ceil(buff.remainingTime)}s`}
            >
              <span>{buff.icon}</span>
              <span>{Math.ceil(buff.remainingTime)}s</span>
            </div>
          ))}
        </div>
      )}

      {/* 5 Quick Slots */}
      <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md p-2 rounded-2xl border-2 border-slate-700/80 shadow-2xl">
        {slots.map((item, idx) => {
          const isActive = item && activeBuffs.some(b => b.id === item.id);
          return (
            <button
              key={idx}
              id={`hotbar-slot-${idx + 1}`}
              onClick={() => item && onUseItem(item.id)}
              disabled={!item}
              className={`relative w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-150 ${
                item
                  ? 'bg-slate-800 hover:bg-slate-700 active:scale-95 border-2 border-slate-600 hover:border-blue-400 cursor-pointer text-white shadow-md'
                  : 'bg-slate-800/40 border-2 border-dashed border-slate-700/50 cursor-default opacity-50'
              } ${isActive ? 'ring-2 ring-emerald-400 bg-emerald-900/40' : ''}`}
            >
              {/* Hotkey tag */}
              <span className="absolute top-1 left-1.5 text-[10px] font-black text-slate-400 bg-slate-900/80 px-1 rounded">
                {idx + 1}
              </span>

              {item ? (
                <>
                  <span className="text-2xl mt-1">{item.icon}</span>
                  {/* Quantity badge */}
                  <span className="absolute bottom-1 right-1 text-xs font-extrabold text-amber-300 bg-slate-950/90 px-1.5 py-0.2 rounded-full border border-amber-400/30">
                    x{item.count}
                  </span>
                </>
              ) : (
                <span className="text-slate-600 text-xs font-bold">-</span>
              )}
            </button>
          );
        })}

        {/* Inventory / Backpack button */}
        <button
          id="hotbar-open-inventory-btn"
          onClick={onOpenInventory}
          className="w-14 h-14 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 border-2 border-blue-400 flex flex-col items-center justify-center text-white cursor-pointer shadow-lg transition-transform ml-1"
          title="Inventar öffnen (Taste I)"
        >
          <span className="text-2xl">🎒</span>
          <span className="text-[10px] font-black tracking-wider uppercase">Inv [I]</span>
        </button>
      </div>
    </div>
  );
};
