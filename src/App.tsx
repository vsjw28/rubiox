/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, RaceOpponentInfo } from './game/engine';
import { UIOverlay } from './components/UIOverlay';
import { ToastItem } from './components/ToastNotifications';
import {
  PlayerStats,
  PlayerCustomization,
  InventoryItem,
  ActiveBuff,
  ItemId,
  EmoteType,
  RemotePlayerData,
  ChatMessage,
  DayNightState,
  StoreItem,
} from './types';
import { progressionManager } from './game/progression';
import { inventoryManager } from './game/inventory';
import { MultiplayerClient } from './game/multiplayer';
import { soundManager } from './utils/audio';

const STORAGE_CUSTOMIZATION_KEY = 'roblox_obby_customization_v2';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const multiplayerRef = useRef<MultiplayerClient | null>(null);

  // Game Mode and Start Menu
  const [gameMode, setGameMode] = useState<'single' | 'race_dual'>('single');
  const [showMainMenu, setShowMainMenu] = useState(true);
  const [raceOpponent, setRaceOpponent] = useState<RaceOpponentInfo | null>(null);
  const [raceWinner, setRaceWinner] = useState<'player' | 'opponent' | null>(null);

  // Customization state
  const [customization, setCustomization] = useState<PlayerCustomization>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOMIZATION_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    const randNum = Math.floor(10 + Math.random() * 89);
    return {
      name: `Robloxer_${randNum}`,
      headColor: '#f5cd30',
      torsoColor: '#0d69ac',
      legsColor: '#278d2b',
      hat: 'cap',
      trail: 'none',
    };
  });

  // Gameplay stats
  const [stats, setStats] = useState<PlayerStats>(() => {
    const progress = progressionManager.getXpProgress();
    return {
      currentStage: 1,
      totalStages: 50,
      coins: 0,
      totalCoins: 100,
      deaths: 0,
      timeElapsed: 0,
      isFinished: false,
      level: progress.currentLevel,
      xp: progress.totalXp,
      xpCurrentLevel: progress.xpInLevel,
      xpNextLevel: progress.xpForLevel,
    };
  });

  // Shift lock & 24h Day/Night cycle
  const [shiftLock, setShiftLock] = useState(false);
  const [dayNightState, setDayNightState] = useState<DayNightState | null>(null);

  // Inventory state
  const [items, setItems] = useState<InventoryItem[]>(() => inventoryManager.getItems());
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>(() => inventoryManager.getActiveBuffs());

  // Multiplayer state
  const [connected, setConnected] = useState(false);
  const [ping, setPing] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState<RemotePlayerData[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Notifications & Level up
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toast, id };
    setToasts(prev => [...prev.slice(-3), newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // Update buffs and inventory periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setItems([...inventoryManager.getItems()]);
      setActiveBuffs([...inventoryManager.getActiveBuffs()]);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  // Game engine lifecycle
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Create Game Engine
    const engine = new GameEngine(
      containerRef.current,
      {
        onStatsUpdate: (newStats) => {
          setStats({ ...newStats });
        },
        onVictory: () => {
          addToast({
            type: 'checkpoint',
            text: 'Ziel erreicht! +1000 XP!',
            subtext: 'Glückwunsch zum Sieg!',
            icon: '🏆',
          });
        },
        onCheckpoint: (stage) => {
          addToast({
            type: 'checkpoint',
            text: `Checkpoint Stage ${stage}!`,
            subtext: '+150 XP verdient!',
            icon: '🚩',
          });
        },
        onXpGained: (amount, levelUp, newLevel) => {
          if (levelUp) {
            setLevelUpLevel(newLevel);
            addToast({
              type: 'xp',
              text: `LEVEL AUFSTIEG: Lv. ${newLevel}!`,
              subtext: 'Neuer Perk freigeschaltet!',
              icon: '⭐',
            });
          }
        },
        onItemCollected: (item) => {
          setItems([...inventoryManager.getItems()]);
          addToast({
            type: 'item',
            text: `Gefunden: ${item.name}`,
            subtext: `Im Rucksack abgelegt (+40 XP)`,
            icon: item.icon,
          });
        },
        onShieldUsed: () => {
          setItems([...inventoryManager.getItems()]);
          addToast({
            type: 'shield',
            text: 'Sicherheitsschild ausgelöst!',
            subtext: 'Sturz abgewehrt & gerettet!',
            icon: '🛡️',
          });
        },
        onShiftLockToggle: (active) => {
          setShiftLock(active);
        },
        onDayNightUpdate: (info) => {
          setDayNightState(info);
        },
        onRaceUpdate: (opp, playerTime, winner) => {
          setRaceOpponent(opp ? { ...opp } : null);
          if (winner) {
            setRaceWinner(winner);
          }
        },
      },
      customization
    );
    engineRef.current = engine;

    // 2. Initialize Multiplayer Client
    const mpClient = new MultiplayerClient(engine.scene, customization, {
      onConnectionChange: (isConnected, currentPing) => {
        setConnected(isConnected);
        setPing(currentPing);
      },
      onChatMessage: (msg) => {
        setChatMessages(prev => [...prev.slice(-30), msg]);
      },
      onPlayersChange: (players) => {
        setOnlinePlayers(players);
      },
      onPlayerJoined: (player) => {
        addToast({
          type: 'highfive',
          text: `${player.name} ist beigetreten!`,
          subtext: `Level ${player.level} Obby-Jumper`,
          icon: '👋',
        });
      },
      onPlayerLeft: (player) => {
        addToast({
          type: 'highfive',
          text: `${player.name} hat den Server verlassen`,
          icon: '🚪',
        });
      },
      onHighFiveCelebration: (data) => {
        if (data.isMe) {
          engine.addXpReward(data.xpBonus);
          soundManager.playVictory();
          addToast({
            type: 'highfive',
            text: `High-Five mit ${data.fromName}! ✋`,
            subtext: `+${data.xpBonus} Bonus XP verdient!`,
            icon: '✋',
          });
        }
      },
      onTeleportTo: (targetName, position, stage) => {
        engine.teleportTo(position, stage);
        addToast({
          type: 'checkpoint',
          text: `Zu ${targetName} teleportiert!`,
          icon: '🚀',
        });
      },
    });

    engine.initMultiplayer(mpClient);
    multiplayerRef.current = mpClient;

    return () => {
      engine.destroy();
      engineRef.current = null;
      mpClient.destroy();
      multiplayerRef.current = null;
    };
  }, []);

  const handleReset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resetGame();
    }
  }, []);

  const handleStartSinglePlayer = useCallback(() => {
    setShowMainMenu(false);
    setGameMode('single');
    setRaceWinner(null);
    setRaceOpponent(null);
    if (engineRef.current) {
      engineRef.current.switchGameMode('single');
    }
    if (multiplayerRef.current) {
      multiplayerRef.current.switchRoom('GLOBAL');
    }
  }, []);

  const handleStartMultiplayerRace = useCallback((roomId: string) => {
    setShowMainMenu(false);
    setGameMode('race_dual');
    setRaceWinner(null);
    setRaceOpponent(null);
    if (engineRef.current) {
      engineRef.current.switchGameMode('race_dual');
    }
    if (multiplayerRef.current) {
      multiplayerRef.current.switchRoom(roomId);
    }
    addToast({
      type: 'checkpoint',
      text: `Rennen gestartet in Raum "${roomId}"!`,
      subtext: 'Erreiche als Erster das Ziel!',
      icon: '🏁',
    });
  }, [addToast]);

  const handleRestartRace = useCallback(() => {
    setRaceWinner(null);
    setRaceOpponent(null);
    if (engineRef.current) {
      engineRef.current.switchGameMode('race_dual');
    }
  }, []);

  const handleOpenMainMenu = useCallback(() => {
    setShowMainMenu(true);
  }, []);

  const handleVirtualInput = useCallback((x: number, y: number, jump: boolean) => {
    if (engineRef.current) {
      engineRef.current.virtualInput.x = x;
      engineRef.current.virtualInput.y = y;
      engineRef.current.virtualInput.jump = jump;
    }
  }, []);

  const handleRespawn = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.respawnAtCheckpoint();
    }
  }, []);

  const handleUseItem = useCallback((id: ItemId) => {
    if (engineRef.current) {
      engineRef.current.useItem(id);
      setItems([...inventoryManager.getItems()]);
      setActiveBuffs([...inventoryManager.getActiveBuffs()]);
    }
  }, []);

  const handleTriggerEmote = useCallback((emote: EmoteType) => {
    if (engineRef.current) {
      engineRef.current.triggerEmote(emote);
    }
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    if (multiplayerRef.current) {
      multiplayerRef.current.sendChatMessage(text);
    }
  }, []);

  const handleHighFive = useCallback((targetId: string) => {
    if (multiplayerRef.current && engineRef.current) {
      multiplayerRef.current.sendHighFive(targetId);
      engineRef.current.triggerEmote('highfive');
      engineRef.current.addXpReward(75);
      addToast({
        type: 'highfive',
        text: 'High-Five gesendet! ✋',
        subtext: '+75 XP erhalten!',
        icon: '✋',
      });
    }
  }, [addToast]);

  const handleTeleportTo = useCallback((targetId: string) => {
    if (!multiplayerRef.current || !engineRef.current) return;
    const targetPlayer = multiplayerRef.current.remotePlayers.get(targetId);
    if (targetPlayer) {
      const pos = targetPlayer.data.position;
      engineRef.current.teleportTo(pos, targetPlayer.data.stage);
      addToast({
        type: 'checkpoint',
        text: `Zu ${targetPlayer.data.name} teleportiert!`,
        icon: '🚀',
      });
    }
  }, [addToast]);

  const handleUpdateCustomization = useCallback((partial: Partial<PlayerCustomization>) => {
    setCustomization(prev => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_CUSTOMIZATION_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (engineRef.current) {
        engineRef.current.setCustomization(updated);
      }
      return updated;
    });
  }, []);

  const handleToggleShiftLock = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.toggleShiftLock();
    }
  }, []);

  const handleBuyStoreItem = useCallback((item: StoreItem): boolean => {
    if (!engineRef.current) return false;
    const success = engineRef.current.spendCoins(item.price);
    if (success) {
      if (item.itemId) {
        inventoryManager.addItem(item.itemId, 1);
        setItems([...inventoryManager.getItems()]);
        addToast({
          type: 'item',
          text: `Gekauft: ${item.name}`,
          subtext: 'Im Rucksack abgelegt!',
          icon: item.icon,
        });
      } else if (item.hatType) {
        handleUpdateCustomization({ hat: item.hatType });
        addToast({
          type: 'item',
          text: `Hut ausgerüstet: ${item.name}`,
          subtext: 'Dein Roblox-Charakter sieht toll aus!',
          icon: item.icon,
        });
      } else if (item.trailType) {
        handleUpdateCustomization({ trail: item.trailType });
        addToast({
          type: 'item',
          text: `Trail ausgerüstet: ${item.name}`,
          subtext: 'Partikel-Effekt aktiviert!',
          icon: item.icon,
        });
      }
      return true;
    }
    return false;
  }, [addToast, handleUpdateCustomization]);

  return (
    <main id="roblox-obby-app" className="relative h-screen w-screen overflow-hidden bg-[#82ccdd]">
      {/* 3D WebGL Canvas host */}
      <div
        id="three-canvas-container"
        ref={containerRef}
        className={`absolute inset-0 h-full w-full ${
          shiftLock ? 'cursor-none' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Interactive HUD and Overlays */}
      <UIOverlay
        stats={stats}
        items={items}
        activeBuffs={activeBuffs}
        customization={customization}
        onlinePlayers={onlinePlayers}
        chatMessages={chatMessages}
        connected={connected}
        ping={ping}
        toasts={toasts}
        levelUpLevel={levelUpLevel}
        shiftLock={shiftLock}
        dayNightState={dayNightState}
        gameMode={gameMode}
        showMainMenu={showMainMenu}
        raceOpponent={raceOpponent}
        raceWinner={raceWinner}
        onOpenMainMenu={handleOpenMainMenu}
        onStartSinglePlayer={handleStartSinglePlayer}
        onStartMultiplayerRace={handleStartMultiplayerRace}
        onRestartRace={handleRestartRace}
        onReset={handleReset}
        onVirtualInput={handleVirtualInput}
        onRespawn={handleRespawn}
        onUseItem={handleUseItem}
        onTriggerEmote={handleTriggerEmote}
        onSendMessage={handleSendMessage}
        onHighFive={handleHighFive}
        onTeleportTo={handleTeleportTo}
        onUpdateCustomization={handleUpdateCustomization}
        onCloseLevelUp={() => setLevelUpLevel(null)}
        onToggleShiftLock={handleToggleShiftLock}
        onBuyStoreItem={handleBuyStoreItem}
      />
    </main>
  );
}
