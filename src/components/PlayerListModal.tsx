import React from 'react';
import { X, Users, MapPin, Sparkles, Navigation } from 'lucide-react';
import { RemotePlayerData } from '../types';

interface PlayerListModalProps {
  players: RemotePlayerData[];
  myCustomizationName: string;
  myLevel: number;
  myStage: number;
  onClose: () => void;
  onHighFive: (targetId: string) => void;
  onTeleportTo: (targetId: string) => void;
}

export const PlayerListModal: React.FC<PlayerListModalProps> = ({
  players,
  myCustomizationName,
  myLevel,
  myStage,
  onClose,
  onHighFive,
  onTeleportTo,
}) => {
  return (
    <div
      id="player-list-modal-overlay"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">Online Spieler & Freunde</h2>
              <p className="text-xs text-slate-400">{players.length + 1} Abenteurer auf dem Server</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Players List */}
        <div className="p-4 flex flex-col gap-2.5 max-h-96 overflow-y-auto">
          {/* Local player entry */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl">
                🤠
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{myCustomizationName}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    DU
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="text-amber-300 font-bold">Lv. {myLevel}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">Stage {myStage}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Remote players */}
          {players.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <p className="font-medium">Keine anderen Spieler gerade online.</p>
              <p className="text-xs text-slate-500 mt-1">Lade Freunde ein, um gemeinsam durch das Obby zu springen!</p>
            </div>
          ) : (
            players.map(player => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center text-xl">
                    {player.hat === 'crown' ? '👑' : player.hat === 'viking' ? '⚔️' : player.hat === 'ninja' ? '🥷' : '🧢'}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-100">{player.name}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="text-amber-300 font-bold">Lv. {player.level}</span>
                      <span>•</span>
                      <span className="text-blue-400 font-medium">Stage {player.stage}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onHighFive(player.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-bold transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                    title="High-Five geben für +75 XP!"
                  >
                    <span>✋</span>
                    <span>High-Five</span>
                  </button>

                  <button
                    onClick={() => onTeleportTo(player.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
                    title="Zu diesem Spieler teleportieren"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Teleport</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
