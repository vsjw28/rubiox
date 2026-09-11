import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, Sparkles, X, ArrowRight } from 'lucide-react';
import { LEVEL_PERKS } from '../game/progression';

interface LevelUpCelebrationProps {
  newLevel: number;
  onClose: () => void;
  onOpenPerks: () => void;
}

export const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  newLevel,
  onClose,
  onOpenPerks,
}) => {
  const perk = LEVEL_PERKS.find(p => p.level === newLevel);

  useEffect(() => {
    // Blast festive confetti
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <div
      id="level-up-celebration-overlay"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Level badge icon */}
        <div className="w-20 h-20 rounded-2xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-lg mb-3 animate-bounce">
          {perk?.icon || '🏆'}
        </div>

        <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-400/40">
          Level Aufstieg!
        </span>

        <h2 className="text-3xl font-black text-white mt-2 tracking-tight">
          Level {newLevel} Erreicht!
        </h2>

        {perk ? (
          <div className="mt-4 p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl w-full text-left">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              Neu freigeschaltet:
            </span>
            <div className="text-sm font-black text-white mt-0.5">{perk.title}</div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{perk.description}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-300 mt-2">Du wirst immer besser! Weiterspringen!</p>
        )}

        <div className="flex gap-2 w-full mt-5">
          <button
            onClick={() => {
              onClose();
              onOpenPerks();
            }}
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Perks ansehen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
};
