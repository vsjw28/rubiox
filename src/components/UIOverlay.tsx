import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Volume2,
  VolumeX,
  RotateCcw,
  Code2,
  Download,
  Copy,
  Check,
  X,
  Play,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  Package,
  Award,
  Home,
  Swords,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PlayerStats,
  InventoryItem,
  ActiveBuff,
  ItemId,
  EmoteType,
  RemotePlayerData,
  ChatMessage,
  PlayerCustomization,
  StoreItem,
  DayNightState,
} from '../types';
import { soundManager } from '../utils/audio';
import { getSingleFileHtmlCode } from '../utils/singleFileHtml';
import { Hotbar } from './Hotbar';
import { MultiplayerChat } from './MultiplayerChat';
import { InventoryModal } from './InventoryModal';
import { PlayerListModal } from './PlayerListModal';
import { LevelUpCelebration } from './LevelUpCelebration';
import { ToastNotifications, ToastItem } from './ToastNotifications';
import { StoreModal } from './StoreModal';
import { RaceHUD } from './RaceHUD';
import { MainMenu } from './MainMenu';
import { RaceOpponentInfo } from '../game/engine';

interface UIOverlayProps {
  stats: PlayerStats;
  items: InventoryItem[];
  activeBuffs: ActiveBuff[];
  customization: PlayerCustomization;
  onlinePlayers: RemotePlayerData[];
  chatMessages: ChatMessage[];
  connected: boolean;
  ping: number;
  toasts: ToastItem[];
  levelUpLevel: number | null;
  shiftLock: boolean;
  dayNightState: DayNightState | null;
  // Mode and Race State
  gameMode: 'single' | 'race_dual';
  showMainMenu: boolean;
  raceOpponent: RaceOpponentInfo | null;
  raceWinner: 'player' | 'opponent' | null;
  onOpenMainMenu: () => void;
  onStartSinglePlayer: () => void;
  onStartMultiplayerRace: (roomId: string) => void;
  onRestartRace: () => void;
  // Handlers
  onReset: () => void;
  onVirtualInput: (x: number, y: number, jump: boolean) => void;
  onRespawn: () => void;
  onUseItem: (id: ItemId) => void;
  onTriggerEmote: (emote: EmoteType) => void;
  onSendMessage: (text: string) => void;
  onHighFive: (targetId: string) => void;
  onTeleportTo: (targetId: string) => void;
  onUpdateCustomization: (c: Partial<PlayerCustomization>) => void;
  onCloseLevelUp: () => void;
  onToggleShiftLock: () => void;
  onBuyStoreItem: (item: StoreItem) => boolean;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  stats,
  items,
  activeBuffs,
  customization,
  onlinePlayers,
  chatMessages,
  connected,
  ping,
  toasts,
  levelUpLevel,
  shiftLock,
  dayNightState,
  gameMode,
  showMainMenu,
  raceOpponent,
  raceWinner,
  onOpenMainMenu,
  onStartSinglePlayer,
  onStartMultiplayerRace,
  onRestartRace,
  onReset,
  onVirtualInput,
  onRespawn,
  onUseItem,
  onTriggerEmote,
  onSendMessage,
  onHighFive,
  onTeleportTo,
  onUpdateCustomization,
  onCloseLevelUp,
  onToggleShiftLock,
  onBuyStoreItem,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showPlayerListModal, setShowPlayerListModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Virtual buttons states
  const [upPressed, setUpPressed] = useState(false);
  const [downPressed, setDownPressed] = useState(false);
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);

  // Detect touch devices
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          window.innerWidth < 800
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Release pointer lock when any modal is opened so cursor is free for clicking
  useEffect(() => {
    if (showStoreModal || showInventoryModal || showPlayerListModal || showCodeModal) {
      try {
        if (document.exitPointerLock && document.pointerLockElement) {
          document.exitPointerLock();
        }
      } catch {
        // Ignored
      }
    }
  }, [showStoreModal, showInventoryModal, showPlayerListModal, showCodeModal]);

  // Keyboard shortcut for opening inventory (Key I) and Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowStoreModal(false);
        setShowInventoryModal(false);
        setShowCodeModal(false);
        setShowPlayerListModal(false);
        return;
      }
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (e.code === 'KeyI' || e.code === 'KeyB') {
        setShowInventoryModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update virtual input vector
  useEffect(() => {
    let vx = 0;
    let vy = 0;
    if (upPressed) vy += 1;
    if (downPressed) vy -= 1;
    if (leftPressed) vx -= 1;
    if (rightPressed) vx += 1;
    onVirtualInput(vx, vy, jumpPressed);
  }, [upPressed, downPressed, leftPressed, rightPressed, jumpPressed, onVirtualInput]);

  // Confetti when victory is reached
  useEffect(() => {
    if (stats.isFinished) {
      const duration = 3.5 * 1000;
      const animationEnd = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 6,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [stats.isFinished]);

  const toggleSound = () => {
    soundManager.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleCopyCode = async () => {
    const code = getSingleFileHtmlCode();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHtml = () => {
    const code = getSingleFileHtmlCode();
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'roblox-obby-3d.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format timer
  const minutes = Math.floor(stats.timeElapsed / 60);
  const seconds = Math.floor(stats.timeElapsed % 60)
    .toString()
    .padStart(2, '0');

  const totalItemsCount = items.reduce((acc, i) => acc + i.count, 0);

  return (
    <div id="game-ui-root" className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* Toast Notifications */}
      <ToastNotifications toasts={toasts} />

      {/* Level Up Celebration */}
      {levelUpLevel !== null && (
        <LevelUpCelebration
          newLevel={levelUpLevel}
          onClose={onCloseLevelUp}
          onOpenPerks={() => setShowInventoryModal(true)}
        />
      )}

      {/* Top Header & HUD */}
      <header className="flex w-full items-start justify-between gap-3">
        {/* Left Status Badges & XP Bar */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div
            id="stats-hud"
            className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-white/60 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-md"
          >
            {/* Stage badge */}
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                {stats.currentStage}
              </span>
              <span className="text-sm">Stage {stats.currentStage} / {stats.totalStages}</span>
            </div>

            <div className="h-4 w-px bg-slate-300" />

            {/* Coins badge */}
            <div className="flex items-center gap-1.5 font-bold text-amber-600">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm">{stats.coins} / {stats.totalCoins}</span>
            </div>

            <div className="h-4 w-px bg-slate-300" />

            {/* Deaths */}
            <div className="flex items-center gap-1 text-sm font-bold text-rose-600">
              <span>💀</span>
              <span>{stats.deaths}</span>
            </div>

            <div className="h-4 w-px bg-slate-300" />

            {/* Timer */}
            <div className="font-mono text-sm font-bold text-slate-700">
              ⏱️ {minutes}:{seconds}
            </div>

            {/* Dynamic 24h Day/Night Cycle indicator */}
            {dayNightState && (
              <>
                <div className="h-4 w-px bg-slate-300" />
                <div
                  className="flex items-center gap-1.5 font-bold text-slate-800"
                  title={`Live 24h Zeitzyklus: ${dayNightState.phaseLabel}`}
                >
                  <span className="text-base leading-none">{dayNightState.phaseIcon}</span>
                  <span className="font-mono text-xs text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300/60">
                    {dayNightState.formattedTime}
                  </span>
                  <span className="hidden md:inline text-[11px] text-slate-500 font-semibold">
                    {dayNightState.phaseLabel}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* XP Progress Bar Pill */}
          <div
            onClick={() => setShowInventoryModal(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-slate-700/80 backdrop-blur-md text-white shadow-md cursor-pointer hover:border-amber-400/50 transition-colors w-fit"
            title="Klicken, um Level-Belohnungen anzusehen"
          >
            <div className="flex items-center gap-1 text-xs font-black text-amber-300">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Lv. {stats.level || 1}</span>
            </div>

            <div className="w-24 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    ((stats.xpCurrentLevel || 0) / (stats.xpNextLevel || 100)) * 100
                  )}%`,
                }}
              />
            </div>

            <span className="text-[11px] font-bold text-slate-300">
              {stats.xpCurrentLevel || 0}/{stats.xpNextLevel || 100} XP
            </span>
          </div>
        </div>

        {/* Center: 1v1 Race HUD when in race_dual mode */}
        {gameMode === 'race_dual' && (
          <div className="pointer-events-auto hidden sm:flex justify-center flex-1 mx-2">
            <RaceHUD
              playerStage={stats.currentStage}
              totalStages={stats.totalStages}
              timeElapsed={stats.timeElapsed}
              opponent={raceOpponent}
              winner={raceWinner}
              onRestartRace={onRestartRace}
            />
          </div>
        )}

        {/* Right Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Main Menu Button */}
          <button
            id="btn-open-main-menu"
            type="button"
            onClick={onOpenMainMenu}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 px-3 py-2 text-xs font-black text-white shadow-md transition active:scale-95 cursor-pointer"
            title="Hauptmenü (Single Player / Multiplayer Modus)"
          >
            <Home className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">Menü</span>
          </button>

          {/* Shift Lock Indicator Button */}
          <button
            id="btn-toggle-shift-lock"
            type="button"
            onClick={onToggleShiftLock}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black shadow-md transition active:scale-95 cursor-pointer ${
              shiftLock
                ? 'border-cyan-400/90 bg-cyan-500/20 text-cyan-200 shadow-cyan-500/25'
                : 'border-white/70 bg-white/95 text-slate-700 hover:text-cyan-600'
            }`}
            title="Shift Lock (Kamera fixieren & Schulterblick) - Taste: Shift"
          >
            <span className="font-mono text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded">SHIFT</span>
            <span>LOCK: {shiftLock ? 'AN' : 'AUS'}</span>
          </button>

          {/* Inventory / Wardrobe button */}
          <button
            id="btn-open-inventory"
            type="button"
            onClick={() => setShowInventoryModal(true)}
            className="relative flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm font-bold text-slate-800 shadow-md transition hover:bg-white hover:text-blue-600 active:scale-95 cursor-pointer"
            title="Rucksack & Garderobe öffnen (Taste I)"
          >
            <Package className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline">Rucksack</span>
            {totalItemsCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                {totalItemsCount}
              </span>
            )}
          </button>

          {/* Friends & Player List button */}
          <button
            id="btn-open-players"
            type="button"
            onClick={() => setShowPlayerListModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm font-bold text-slate-800 shadow-md transition hover:bg-white hover:text-emerald-600 active:scale-95 cursor-pointer"
            title="Online Spieler ansehen"
          >
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">{onlinePlayers.length + 1} Spieler</span>
          </button>

          {/* Audio toggle */}
          <button
            id="btn-toggle-sound"
            type="button"
            onClick={toggleSound}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-blue-600 active:scale-95 cursor-pointer"
            title={soundEnabled ? 'Ton stummschalten' : 'Ton aktivieren'}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-rose-500" />}
          </button>

          {/* Single-file HTML view/download button */}
          <button
            id="btn-open-code-modal"
            type="button"
            onClick={() => setShowCodeModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-sm font-bold text-slate-800 shadow-md transition hover:bg-white hover:text-blue-600 active:scale-95 cursor-pointer"
            title="Einzelne HTML-Datei anzeigen & herunterladen"
          >
            <Code2 className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline">HTML-Code</span>
          </button>

          {/* Store button in header (quick access) */}
          <button
            id="btn-open-store-header"
            type="button"
            onClick={() => setShowStoreModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-400/80 bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-sm font-black text-slate-950 shadow-md transition hover:brightness-110 active:scale-95 cursor-pointer"
            title="Store öffnen"
          >
            <span>🛍️</span>
            <span className="hidden sm:inline">Store</span>
            <span className="bg-slate-950/20 px-1.5 py-0.2 rounded-md text-xs">{stats.coins}🪙</span>
          </button>

          {/* Restart button */}
          <button
            id="btn-restart-game"
            type="button"
            onClick={onReset}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-amber-600 active:scale-95 cursor-pointer"
            title="Von vorne beginnen"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Bottom Area: Chat (Left), Hotbar (Center), Controls / Touch (Right) */}
      <div className="flex w-full items-end justify-between gap-4 mt-auto">
        {/* Left: Multiplayer Chat */}
        <div className="pointer-events-auto">
          <MultiplayerChat
            messages={chatMessages}
            onlinePlayers={onlinePlayers}
            connected={connected}
            ping={ping}
            onSendMessage={onSendMessage}
            onTriggerEmote={onTriggerEmote}
            onOpenPlayerList={() => setShowPlayerListModal(true)}
          />
        </div>

        {/* Center: Inventory Hotbar */}
        <div className="pointer-events-auto hidden sm:flex justify-center">
          <Hotbar
            items={items}
            activeBuffs={activeBuffs}
            onUseItem={onUseItem}
            onOpenInventory={() => setShowInventoryModal(true)}
          />
        </div>

        {/* Right: Desktop Controls Guide / Touch D-Pad */}
        <div className="pointer-events-auto">
          {!isTouchDevice ? (
            <div
              id="desktop-controls-card"
              className="max-w-xs rounded-2xl border border-slate-700/40 bg-slate-900/85 p-3 text-xs text-white shadow-xl backdrop-blur-md"
            >
              <div className="mb-1.5 flex items-center gap-1.5 font-bold text-blue-400">
                <Zap className="h-3.5 w-3.5" />
                <span>Steuerung (Roblox Style)</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
                <div>
                  <span className="rounded bg-slate-700 px-1 py-0.5 font-mono font-bold text-white">W</span> Vorwärts
                </div>
                <div>
                  <span className="rounded bg-slate-700 px-1 py-0.5 font-mono font-bold text-white">A / D</span> Links / Rechts
                </div>
                <div>
                  <span className="rounded bg-slate-700 px-1 py-0.5 font-mono font-bold text-white">S</span> Zurück
                </div>
                <div>
                  <span className="rounded bg-slate-700 px-1 py-0.5 font-mono font-bold text-white">SPACE</span> Sprung
                </div>
                <div>
                  <span className="rounded bg-slate-700 px-1 py-0.5 font-mono font-bold text-cyan-300">SHIFT</span> Shift Lock
                </div>
                <div>
                  <span className="rounded bg-slate-700 px-1 py-0.5 font-mono font-bold text-amber-300">STRG</span> Sprinten
                </div>
                <div>
                  <span className="rounded bg-slate-700 px-1 py-0.5 font-mono font-bold text-white">1 - 5</span> Hotbar Items
                </div>
                <div>
                  <span className="rounded bg-slate-700 px-1 py-0.5 font-mono font-bold text-white">I / B</span> Inventar
                </div>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">
                Maus drehen: Kamera • Mausrad: Zoom • [R]: Checkpoint Respawn
              </div>
            </div>
          ) : (
            /* Mobile Touch Controls */
            <div id="mobile-touch-controls" className="flex items-end gap-3 pb-2">
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/20 p-1.5 backdrop-blur-md">
                <div />
                <button
                  type="button"
                  id="touch-up"
                  onTouchStart={(e) => { e.preventDefault(); setUpPressed(true); }}
                  onTouchEnd={() => setUpPressed(false)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold shadow-md transition ${
                    upPressed ? 'bg-blue-600 text-white' : 'bg-white/90 text-slate-800'
                  }`}
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
                <div />

                <button
                  type="button"
                  id="touch-left"
                  onTouchStart={(e) => { e.preventDefault(); setLeftPressed(true); }}
                  onTouchEnd={() => setLeftPressed(false)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold shadow-md transition ${
                    leftPressed ? 'bg-blue-600 text-white' : 'bg-white/90 text-slate-800'
                  }`}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  id="touch-down"
                  onTouchStart={(e) => { e.preventDefault(); setDownPressed(true); }}
                  onTouchEnd={() => setDownPressed(false)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold shadow-md transition ${
                    downPressed ? 'bg-blue-600 text-white' : 'bg-white/90 text-slate-800'
                  }`}
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  id="touch-right"
                  onTouchStart={(e) => { e.preventDefault(); setRightPressed(true); }}
                  onTouchEnd={() => setRightPressed(false)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold shadow-md transition ${
                    rightPressed ? 'bg-blue-600 text-white' : 'bg-white/90 text-slate-800'
                  }`}
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              {/* Jump Button */}
              <button
                type="button"
                id="touch-jump"
                onTouchStart={(e) => { e.preventDefault(); setJumpPressed(true); }}
                onTouchEnd={() => setJumpPressed(false)}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-500 font-black tracking-wide shadow-xl active:scale-95 text-white ${
                  jumpPressed ? 'bg-emerald-600' : 'bg-emerald-500'
                }`}
              >
                JUMP
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Store Button (Middle-Right of Screen) */}
      <div className="pointer-events-auto fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
        <button
          id="btn-open-store-mid-right"
          type="button"
          onClick={() => setShowStoreModal(true)}
          className="group relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-amber-400/90 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 p-2.5 sm:p-3 text-white shadow-2xl shadow-amber-500/40 transition-all hover:scale-110 hover:border-amber-300 hover:shadow-amber-500/60 active:scale-95 cursor-pointer animate-bounce"
          style={{ animationDuration: '3s' }}
          title="Roblox Store öffnen (Power-Ups & Kosmetika kaufen)"
        >
          <div className="relative">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl sm:text-3xl shadow-md group-hover:rotate-12 transition-transform">
              🛍️
            </div>
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow">
              ★
            </span>
          </div>

          <span className="text-[11px] font-black tracking-wider uppercase text-amber-100 drop-shadow">
            STORE
          </span>

          <div className="flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30">
            <span>{stats.coins}</span>
            <span>🪙</span>
          </div>
        </button>
      </div>

      {/* Shift Lock Center Crosshair (visible when shift lock is on and no modal is open) */}
      {shiftLock && !showStoreModal && !showInventoryModal && !showPlayerListModal && !showCodeModal && !levelUpLevel && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Outer subtle ring */}
            <div className="h-6 w-6 rounded-full border border-white/50 shadow-sm" />
            {/* White crosshairs */}
            <div className="h-4 w-0.5 bg-white shadow absolute" />
            <div className="h-0.5 w-4 bg-white shadow absolute" />
            {/* Center dot */}
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow absolute" />
          </div>
        </div>
      )}

      {/* Store Modal */}
      {showStoreModal && (
        <StoreModal
          coins={stats.coins}
          inventory={items}
          customization={customization}
          onClose={() => setShowStoreModal(false)}
          onBuyItem={onBuyStoreItem}
        />
      )}

      {/* Inventory & Wardrobe Modal */}
      {showInventoryModal && (
        <InventoryModal
          items={items}
          customization={customization}
          level={stats.level || 1}
          xpProgress={{
            currentLevel: stats.level || 1,
            xpInLevel: stats.xpCurrentLevel || 0,
            xpForLevel: stats.xpNextLevel || 100,
            totalXp: stats.xp || 0,
          }}
          onClose={() => setShowInventoryModal(false)}
          onUseItem={onUseItem}
          onUpdateCustomization={onUpdateCustomization}
        />
      )}

      {/* Player List Modal */}
      {showPlayerListModal && (
        <PlayerListModal
          players={onlinePlayers}
          myCustomizationName={customization.name}
          myLevel={stats.level || 1}
          myStage={stats.currentStage}
          onClose={() => setShowPlayerListModal(false)}
          onHighFive={(targetId) => {
            onHighFive(targetId);
            setShowPlayerListModal(false);
          }}
          onTeleportTo={(targetId) => {
            onTeleportTo(targetId);
            setShowPlayerListModal(false);
          }}
        />
      )}

      {/* Victory Modal */}
      {stats.isFinished && (
        <div id="victory-modal-overlay" className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-emerald-300 bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 shadow-inner">
              <Trophy className="h-12 w-12 text-amber-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">GEWONNEN! 🎉</h2>
            <p className="mt-1 text-sm text-slate-600">
              Du hast alle 6 Hindernis-Etappen gemeistert und die Sieger-Trophäe erreicht!
            </p>

            {/* Stats summary */}
            <div className="my-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4 text-center">
              <div>
                <div className="text-xs text-slate-500">Zeit</div>
                <div className="font-mono text-lg font-bold text-slate-800">{minutes}:{seconds}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Münzen</div>
                <div className="text-lg font-bold text-amber-600">{stats.coins} / {stats.totalCoins}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Level</div>
                <div className="text-lg font-bold text-blue-600">Lv. {stats.level || 1}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                id="btn-play-again"
                onClick={onReset}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 active:scale-98 cursor-pointer"
              >
                <Play className="h-5 w-5" />
                Nochmal spielen
              </button>
              <button
                type="button"
                id="btn-modal-code"
                onClick={() => setShowCodeModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-98 cursor-pointer"
              >
                <Code2 className="h-4 w-4" />
                HTML-Code ansehen / herunterladen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Modal (Single HTML File with Embedded JS) */}
      {showCodeModal && (
        <div id="code-modal-overlay" className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  Eigenständige Einzelne HTML-Datei (mit Three.js)
                </h3>
              </div>
              <button
                type="button"
                id="btn-close-code-modal"
                onClick={() => setShowCodeModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-800/80 bg-slate-950/50 px-6 py-3 text-xs text-slate-400">
              Diese Datei enthält alles: HTML, Styling, Three.js 3D-Engine, Block-Charakter, Animationen, Physik und Sound. Einfach als <span className="font-mono text-emerald-400">game.html</span> speichern und per Doppelklick direkt im Browser starten!
            </div>

            <div className="relative flex-1 overflow-auto bg-slate-950 p-4 font-mono text-xs text-slate-300">
              <pre className="whitespace-pre">{getSingleFileHtmlCode()}</pre>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
              <div className="text-xs text-slate-400">
                Größe: ~22 KB • Keine Installation notwendig
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="btn-copy-code"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Kopiert!' : 'Code kopieren'}
                </button>
                <button
                  type="button"
                  id="btn-download-html"
                  onClick={handleDownloadHtml}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Als HTML herunterladen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Menu Modal Overlay */}
      {showMainMenu && (
        <MainMenu
          onStartSinglePlayer={onStartSinglePlayer}
          onStartMultiplayerRace={onStartMultiplayerRace}
          onOpenCustomizer={() => setShowInventoryModal(true)}
        />
      )}
    </div>
  );
};
