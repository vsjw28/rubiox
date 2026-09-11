import React, { useState } from 'react';
import { Play, Users, Server, ArrowLeft, Copy, Check, Swords, Shield, Moon, Compass, Sparkles } from 'lucide-react';

interface MainMenuProps {
  onStartSinglePlayer: () => void;
  onStartMultiplayerRace: (roomId: string) => void;
  onOpenCustomizer?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartSinglePlayer,
  onStartMultiplayerRace,
  onOpenCustomizer,
}) => {
  const [view, setView] = useState<'main' | 'multiplayer' | 'host' | 'join'>('main');
  const [generatedRoom] = useState(() => `OBBY-${Math.floor(100 + Math.random() * 900)}`);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedRoom);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none">
      {/* Background Starry Glow FX */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-md w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/50 flex flex-col items-center text-center">
        
        {/* Roblox Inspired Title Logo */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Moon className="w-3.5 h-3.5" /> Permanent Night Edition
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] font-sans">
            ROBLOX OBBY
          </h1>
          <p className="text-sm font-semibold text-cyan-300/80 mt-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> 15 Schwere Level • 1v1 Race Duel
          </p>
        </div>

        {/* VIEW 1: Main Menu */}
        {view === 'main' && (
          <div className="w-full space-y-4">
            {/* Single Player Button */}
            <button
              onClick={onStartSinglePlayer}
              className="w-full group relative py-4 px-6 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xl rounded-2xl shadow-[0_6px_0_#065f46] hover:shadow-[0_4px_0_#065f46] hover:translate-y-0.5 active:translate-y-1.5 active:shadow-[0_1px_0_#065f46] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>SINGLE PLAYER</span>
            </button>

            {/* Multiplayer Button */}
            <button
              onClick={() => setView('multiplayer')}
              className="w-full group relative py-4 px-6 bg-gradient-to-b from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-xl rounded-2xl shadow-[0_6px_0_#1e1b4b] hover:shadow-[0_4px_0_#1e1b4b] hover:translate-y-0.5 active:translate-y-1.5 active:shadow-[0_1px_0_#1e1b4b] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Users className="w-6 h-6" />
              <span>MULTIPLAYER</span>
            </button>

            {onOpenCustomizer && (
              <button
                onClick={onOpenCustomizer}
                className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4 text-cyan-400" />
                Avatar & Skins anpassen
              </button>
            )}

            {/* Control hints */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-left text-xs text-slate-400 space-y-1.5 bg-slate-950/40 p-3 rounded-xl">
              <div className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" /> Steuerung:
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div><span className="text-white font-mono font-semibold bg-slate-800 px-1 rounded">W A S D</span> : Bewegen</div>
                <div><span className="text-white font-mono font-semibold bg-slate-800 px-1 rounded">LEERTASTE</span> : Sprung</div>
                <div><span className="text-white font-mono font-semibold bg-slate-800 px-1 rounded">SHIFT</span> : Shift-Lock (Fadenkreuz)</div>
                <div><span className="text-white font-mono font-semibold bg-slate-800 px-1 rounded">STRG</span> : Sprinten</div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Multiplayer Sub-Menu */}
        {view === 'multiplayer' && (
          <div className="w-full space-y-3.5">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Swords className="w-5 h-5 text-yellow-400" /> Multiplayer Modus
            </h2>

            {/* Host Server */}
            <button
              onClick={() => setView('host')}
              className="w-full py-3 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-base rounded-xl shadow-[0_4px_0_#0e7490] active:translate-y-1 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Server className="w-5 h-5" /> Host Server (Eigener Raum)
              </span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">1v1 Race</span>
            </button>

            {/* Join Server */}
            <button
              onClick={() => setView('join')}
              className="w-full py-3 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-base rounded-xl shadow-[0_4px_0_#581c87] active:translate-y-1 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-5 h-5" /> Join Server (Code eingeben)
              </span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">Beitreten</span>
            </button>

            {/* Quick 1v1 Race */}
            <button
              onClick={() => onStartMultiplayerRace('GLOBAL')}
              className="w-full py-3 px-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-base rounded-xl shadow-[0_4px_0_#9a3412] active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Swords className="w-5 h-5 text-slate-950" />
              <span>SOFORT-DUELL (2 BAHNEN RACE)</span>
            </button>

            {/* Back button */}
            <button
              onClick={() => setView('main')}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Zurück zum Hauptmenü
            </button>
          </div>
        )}

        {/* VIEW 3: Host Server */}
        {view === 'host' && (
          <div className="w-full space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" /> Server gehostet!
            </h2>
            <p className="text-xs text-slate-300">
              Dein privater 1v1-Rennraum ist bereit. Teile den Code mit deinem Freund!
            </p>

            <div className="p-4 bg-slate-950 border-2 border-cyan-500/50 rounded-2xl flex items-center justify-between">
              <span className="font-mono text-2xl font-black text-cyan-300 tracking-wider">
                {generatedRoom}
              </span>
              <button
                onClick={handleCopy}
                className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>

            <button
              onClick={() => onStartMultiplayerRace(generatedRoom)}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg rounded-2xl shadow-[0_5px_0_#065f46] active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>RENNEN STARTEN</span>
            </button>

            <button
              onClick={() => setView('multiplayer')}
              className="w-full py-2 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Auswahl
            </button>
          </div>
        )}

        {/* VIEW 4: Join Server */}
        {view === 'join' && (
          <div className="w-full space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-purple-400" /> Server beitreten
            </h2>
            <p className="text-xs text-slate-300">
              Gib den Raum-Code des Hosts ein, um dem 1v1-Rennen beizutreten:
            </p>

            <input
              type="text"
              value={joinRoomInput}
              onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
              placeholder="z.B. OBBY-831"
              maxLength={12}
              className="w-full px-4 py-3 bg-slate-950 border-2 border-purple-500/50 rounded-xl text-center font-mono text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-400"
            />

            <button
              disabled={!joinRoomInput.trim()}
              onClick={() => onStartMultiplayerRace(joinRoomInput.trim())}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-[0_5px_0_#4c1d95] active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>BEITRETEN & STARTEN</span>
            </button>

            <button
              onClick={() => setView('multiplayer')}
              className="w-full py-2 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Auswahl
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
