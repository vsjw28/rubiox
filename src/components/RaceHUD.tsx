import React from 'react';
import { Trophy, Timer, Zap, Flag, RotateCcw } from 'lucide-react';
import { RaceOpponentInfo } from '../game/engine';

interface RaceHUDProps {
  playerStage: number;
  totalStages: number;
  timeElapsed: number;
  opponent: RaceOpponentInfo | null;
  winner: 'player' | 'opponent' | null;
  onRestartRace: () => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  playerStage,
  totalStages,
  timeElapsed,
  opponent,
  winner,
  onRestartRace,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  const playerProgress = Math.min(100, (playerStage / totalStages) * 100);
  const opponentProgress = opponent ? opponent.progressPercent : 0;
  const isAhead = !opponent || playerStage > opponent.stage;
  const isTied = opponent && playerStage === opponent.stage;

  return (
    <div className="flex flex-col items-center pointer-events-auto select-none">
      {/* Top Main Stopwatch */}
      <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 px-6 py-2.5 rounded-2xl shadow-2xl shadow-cyan-950/40 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Timer className="w-6 h-6 text-cyan-400 animate-pulse" />
          <span className="font-mono text-2xl md:text-3xl font-black text-white tracking-widest drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
            {formatTime(timeElapsed)}
          </span>
        </div>

        <div className="h-6 w-[1px] bg-slate-700" />

        {/* Lead indicator */}
        <div className="text-xs md:text-sm font-bold flex items-center gap-1.5">
          {winner === 'player' ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-400" /> DU HAST GEWONNEN!
            </span>
          ) : winner === 'opponent' ? (
            <span className="text-rose-400 flex items-center gap-1">
              <Flag className="w-4 h-4 text-rose-400" /> GEGNER GEWINNT!
            </span>
          ) : isAhead ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <Zap className="w-4 h-4" /> DU FÜHRST!
            </span>
          ) : isTied ? (
            <span className="text-amber-400">GLEICHSTAND</span>
          ) : (
            <span className="text-rose-400 animate-pulse">GEGNER FÜHRT!</span>
          )}
        </div>
      </div>

      {/* Dual Lane Progress Tracker */}
      <div className="mt-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 p-3 rounded-xl w-80 md:w-96 shadow-xl space-y-2">
        {/* Lane 1 (Player) */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              DU (Bahn 1)
            </span>
            <span className="text-slate-200">
              Stufe {playerStage} / {totalStages}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]"
              style={{ width: `${playerProgress}%` }}
            />
          </div>
        </div>

        {/* Lane 2 (Opponent / Rival) */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              {opponent?.name || 'Gegner'} (Bahn 2) {opponent?.isAi ? '🤖' : '👤'}
            </span>
            <span className="text-slate-200">
              Stufe {opponent ? opponent.stage : 1} / {totalStages}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.7)]"
              style={{ width: `${opponentProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Victory / Rematch Banner */}
      {winner && (
        <div className="mt-3 bg-slate-950/95 border-2 border-yellow-500/80 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce">
          <div>
            <div className="text-yellow-400 font-black text-lg flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-300" />
              {winner === 'player' ? 'GLÜCKWUNSCH! RENNEN GEWONNEN!' : 'KNAPP VERLOREN! REVANCHE?'}
            </div>
            <div className="text-xs text-slate-300">
              Abschlusszeit: <span className="text-white font-mono font-bold">{formatTime(timeElapsed)}</span>
            </div>
          </div>
          <button
            onClick={onRestartRace}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Noch mal
          </button>
        </div>
      )}
    </div>
  );
};
