import * as THREE from 'three';
import { RemotePlayerData, PlayerCustomization, ChatMessage, EmoteType, HatType, TrailType } from '../types';
import { RemotePlayer } from './remotePlayer';

export interface MultiplayerCallbacks {
  onConnectionChange: (connected: boolean, ping: number) => void;
  onChatMessage: (message: ChatMessage) => void;
  onPlayersChange: (players: RemotePlayerData[]) => void;
  onPlayerJoined?: (player: RemotePlayerData) => void;
  onPlayerLeft?: (player: RemotePlayerData) => void;
  onHighFiveCelebration: (data: { fromName: string; targetName: string; xpBonus: number; isMe: boolean }) => void;
  onTeleportTo: (targetName: string, position: [number, number, number], stage: number) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private scene: THREE.Scene;
  private callbacks: MultiplayerCallbacks;
  public myId: string | null = null;
  private isConnected = false;
  private ping = 0;
  private lastPingSent = 0;
  private reconnectTimeout: number | null = null;
  public remotePlayers: Map<string, RemotePlayer> = new Map();
  private localCustomization: PlayerCustomization;
  private localLevel = 1;

  constructor(
    scene: THREE.Scene,
    customization: PlayerCustomization,
    levelOrCallbacks: number | MultiplayerCallbacks,
    maybeCallbacks?: MultiplayerCallbacks
  ) {
    this.scene = scene;
    this.customization = customization;
    if (typeof levelOrCallbacks === 'number') {
      this.localLevel = levelOrCallbacks;
      this.callbacks = maybeCallbacks!;
    } else {
      this.localLevel = 1;
      this.callbacks = levelOrCallbacks;
    }
    this.connect();
  }

  public set customization(c: PlayerCustomization) {
    this.localCustomization = { ...c };
  }

  public get customization(): PlayerCustomization {
    return this.localCustomization;
  }

  public setLevel(lvl: number) {
    this.localLevel = lvl;
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'player:customize',
        level: lvl,
      });
    }
  }

  public currentRoomId = 'GLOBAL';

  public switchRoom(roomId: string) {
    this.currentRoomId = roomId.trim().toUpperCase() || 'GLOBAL';
    this.cleanupRemotePlayers();
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'room:switch',
        roomId: this.currentRoomId,
      });
    }
  }

  public updateCustomization(c: Partial<PlayerCustomization>) {
    Object.assign(this.localCustomization, c);
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'player:customize',
        ...c,
      });
    }
  }

  private connect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.callbacks.onConnectionChange(true, this.ping);

        // Send join packet with initial details & roomId
        this.send({
          type: 'join',
          name: this.localCustomization.name,
          level: this.localLevel,
          headColor: this.localCustomization.headColor,
          torsoColor: this.localCustomization.torsoColor,
          legsColor: this.localCustomization.legsColor,
          hat: this.localCustomization.hat,
          trail: this.localCustomization.trail,
          roomId: this.currentRoomId,
        });

        this.startPingInterval();
      };

      this.ws.onmessage = (e) => {
        this.handleMessage(e.data);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.callbacks.onConnectionChange(false, 0);
        this.cleanupRemotePlayers();
        // Attempt reconnection after 3 seconds
        this.reconnectTimeout = window.setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('[Multiplayer WS] Connection error:', err);
      };
    } catch (err) {
      console.warn('[Multiplayer WS] Failed creating WebSocket:', err);
      this.reconnectTimeout = window.setTimeout(() => this.connect(), 4000);
    }
  }

  private startPingInterval() {
    const interval = window.setInterval(() => {
      if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN) {
        clearInterval(interval);
        return;
      }
      this.lastPingSent = Date.now();
      this.send({ type: 'ping' });
    }, 10000);
  }

  private send(obj: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(obj));
      } catch (err) {
        console.warn('Error sending WS message:', err);
      }
    }
  }

  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case 'welcome': {
          this.myId = msg.id;
          if (Array.isArray(msg.players)) {
            msg.players.forEach((p: RemotePlayerData) => {
              this.addOrUpdateRemotePlayer(p);
            });
            this.emitPlayersChange();
          }
          break;
        }

        case 'pong': {
          if (this.lastPingSent > 0) {
            this.ping = Date.now() - this.lastPingSent;
            this.callbacks.onConnectionChange(true, this.ping);
          }
          break;
        }

        case 'player:joined': {
          if (msg.player && msg.player.id !== this.myId) {
            this.addOrUpdateRemotePlayer(msg.player);
            this.emitPlayersChange();
            this.callbacks.onPlayerJoined?.(msg.player);
          }
          break;
        }

        case 'player:update': {
          const rp = this.remotePlayers.get(msg.id);
          if (rp) {
            rp.updateData({
              position: msg.position,
              rotationY: msg.rotationY,
              walkCycle: msg.walkCycle,
              isMoving: msg.isMoving,
              isJumping: msg.isJumping,
              stage: msg.stage,
            });
          }
          break;
        }

        case 'player:customized': {
          if (msg.id !== this.myId) {
            const rp = this.remotePlayers.get(msg.id);
            if (rp && msg.state) {
              rp.updateData(msg.state);
              this.emitPlayersChange();
            }
          }
          break;
        }

        case 'player:left': {
          const rp = this.remotePlayers.get(msg.id);
          if (rp) {
            this.callbacks.onPlayerLeft?.(rp.data);
            rp.destroy(this.scene);
            this.remotePlayers.delete(msg.id);
            this.emitPlayersChange();
          }
          break;
        }

        case 'chat': {
          this.callbacks.onChatMessage({
            id: 'msg_' + Math.random().toString(36).substring(2, 9),
            senderId: msg.id,
            senderName: msg.name,
            text: msg.text,
            timestamp: msg.timestamp,
            isSystem: msg.isSystem,
          });

          // Also show speech bubble above remote player if in world
          const rp = this.remotePlayers.get(msg.id);
          if (rp) {
            rp.showChat(msg.text);
          }
          break;
        }

        case 'emote': {
          const rp = this.remotePlayers.get(msg.id);
          if (rp) {
            rp.triggerEmote(msg.emote);
          }
          break;
        }

        case 'highfive:celebration': {
          const isMe = msg.fromId === this.myId || msg.targetId === this.myId;
          this.callbacks.onHighFiveCelebration({
            fromName: msg.fromName,
            targetName: msg.targetName,
            xpBonus: msg.xpBonus,
            isMe,
          });

          // Trigger high-five emote on actors
          const rp1 = this.remotePlayers.get(msg.fromId);
          if (rp1) rp1.triggerEmote('highfive');
          const rp2 = this.remotePlayers.get(msg.targetId);
          if (rp2) rp2.triggerEmote('highfive');
          break;
        }

        case 'teleport:to': {
          this.callbacks.onTeleportTo(msg.targetName, msg.position, msg.stage);
          break;
        }
      }
    } catch (err) {
      console.warn('Failed parsing WS message:', err);
    }
  }

  private addOrUpdateRemotePlayer(data: RemotePlayerData) {
    if (this.remotePlayers.has(data.id)) {
      this.remotePlayers.get(data.id)!.updateData(data);
    } else {
      const rp = new RemotePlayer(data, this.scene);
      this.remotePlayers.set(data.id, rp);
    }
  }

  private emitPlayersChange() {
    const list: RemotePlayerData[] = [];
    this.remotePlayers.forEach(rp => list.push(rp.data));
    this.callbacks.onPlayersChange(list);
  }

  public sendUpdate(data: {
    position: [number, number, number];
    rotationY: number;
    walkCycle: number;
    isMoving: boolean;
    isJumping: boolean;
    stage: number;
  }) {
    if (!this.isConnected) return;
    this.send({
      type: 'player:update',
      ...data,
    });
  }

  public sendPositionUpdate(pos: THREE.Vector3, rotY: number, walkCycle: number, isMoving: boolean, isJumping: boolean, stage: number) {
    if (!this.isConnected) return;
    this.send({
      type: 'player:update',
      position: [pos.x, pos.y, pos.z],
      rotationY: rotY,
      walkCycle,
      isMoving,
      isJumping,
      stage,
    });
  }

  public sendChat(text: string) {
    if (!this.isConnected) return;
    this.send({
      type: 'chat',
      text,
    });
  }

  public sendEmote(emote: EmoteType) {
    if (!this.isConnected) return;
    this.send({
      type: 'emote',
      emote,
    });
  }

  public sendHighFive(targetId: string) {
    if (!this.isConnected) return;
    this.send({
      type: 'highfive',
      targetId,
    });
  }

  public requestTeleportToFriend(targetId: string) {
    if (!this.isConnected) return;
    this.send({
      type: 'teleport:friend',
      targetId,
    });
  }

  public findNearbyPlayer(myPos: THREE.Vector3, radius = 4.0): RemotePlayer | null {
    let closest: RemotePlayer | null = null;
    let minDist = radius;

    this.remotePlayers.forEach(rp => {
      const dist = myPos.distanceTo(rp.group.position);
      if (dist < minDist) {
        minDist = dist;
        closest = rp;
      }
    });

    return closest;
  }

  public update(delta: number) {
    this.remotePlayers.forEach(rp => rp.update(delta));
  }

  private cleanupRemotePlayers() {
    this.remotePlayers.forEach(rp => rp.destroy(this.scene));
    this.remotePlayers.clear();
    this.emitPlayersChange();
  }

  public destroy() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.cleanupRemotePlayers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
