import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface PlayerState {
  id: string;
  name: string;
  level: number;
  headColor: string;
  torsoColor: string;
  legsColor: string;
  hat: string;
  trail: string;
  position: [number, number, number];
  rotationY: number;
  walkCycle: number;
  isMoving: boolean;
  isJumping: boolean;
  stage: number;
  lastActive: number;
  roomId: string;
}

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // In-memory player registry
  const players = new Map<string, { ws: WebSocket; state: PlayerState }>();

  // REST API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      connectedPlayers: players.size,
      time: new Date().toISOString(),
    });
  });

  app.get('/api/players', (req, res) => {
    const list = Array.from(players.values()).map(p => ({
      id: p.state.id,
      name: p.state.name,
      level: p.state.level,
      stage: p.state.stage,
      hat: p.state.hat,
      trail: p.state.trail,
    }));
    res.json({ players: list });
  });

  // WebSocket Server setup
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcast(senderId: string | null, message: object, includeSender = false, targetRoomId?: string) {
    const payload = JSON.stringify(message);
    players.forEach((p, id) => {
      if (targetRoomId && p.state.roomId !== targetRoomId) {
        return;
      }
      if ((includeSender || id !== senderId) && p.ws.readyState === WebSocket.OPEN) {
        try {
          p.ws.send(payload);
        } catch (err) {
          console.error('Error sending ws packet to player:', id, err);
        }
      }
    });
  }

  wss.on('connection', (ws: WebSocket) => {
    const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    console.log(`[Multiplayer] Player connected: ${playerId}`);

    let isRegistered = false;

    ws.on('message', (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'join': {
            const playerRoom = (msg.roomId && String(msg.roomId).trim().toUpperCase()) || 'GLOBAL';
            const defaultState: PlayerState = {
              id: playerId,
              name: (msg.name && String(msg.name).slice(0, 16).trim()) || `Player_${playerId.slice(2, 6)}`,
              level: typeof msg.level === 'number' ? msg.level : 1,
              headColor: msg.headColor || '#f5cd30',
              torsoColor: msg.torsoColor || '#0d69ac',
              legsColor: msg.legsColor || '#278d2b',
              hat: msg.hat || 'none',
              trail: msg.trail || 'none',
              position: msg.position || [0, 2.5, 0],
              rotationY: msg.rotationY || 0,
              walkCycle: 0,
              isMoving: false,
              isJumping: false,
              stage: msg.stage || 1,
              lastActive: Date.now(),
              roomId: playerRoom,
            };

            players.set(playerId, { ws, state: defaultState });
            isRegistered = true;

            // Send welcome message with existing players in the same room
            const existingPlayers = Array.from(players.values())
              .filter(p => p.state.id !== playerId && p.state.roomId === playerRoom)
              .map(p => p.state);

            ws.send(
              JSON.stringify({
                type: 'welcome',
                id: playerId,
                player: defaultState,
                players: existingPlayers,
                roomId: playerRoom,
              })
            );

            // Announce new player to all others in same room
            broadcast(playerId, {
              type: 'player:joined',
              player: defaultState,
            }, false, playerRoom);

            // Broadcast join notification in chat
            broadcast(null, {
              type: 'chat',
              id: 'system',
              name: 'Server',
              text: `${defaultState.name} hat den Raum [${playerRoom}] betreten! 🎮`,
              timestamp: Date.now(),
              isSystem: true,
            }, true, playerRoom);
            break;
          }

          case 'player:update': {
            const playerEntry = players.get(playerId);
            if (!playerEntry) return;

            playerEntry.state.position = msg.position || playerEntry.state.position;
            playerEntry.state.rotationY = typeof msg.rotationY === 'number' ? msg.rotationY : playerEntry.state.rotationY;
            playerEntry.state.walkCycle = typeof msg.walkCycle === 'number' ? msg.walkCycle : playerEntry.state.walkCycle;
            playerEntry.state.isMoving = !!msg.isMoving;
            playerEntry.state.isJumping = !!msg.isJumping;
            if (typeof msg.stage === 'number') playerEntry.state.stage = msg.stage;
            playerEntry.state.lastActive = Date.now();

            // Broadcast position delta to others in same room
            broadcast(playerId, {
              type: 'player:update',
              id: playerId,
              position: playerEntry.state.position,
              rotationY: playerEntry.state.rotationY,
              walkCycle: playerEntry.state.walkCycle,
              isMoving: playerEntry.state.isMoving,
              isJumping: playerEntry.state.isJumping,
              stage: playerEntry.state.stage,
            }, false, playerEntry.state.roomId);
            break;
          }

          case 'room:switch': {
            const playerEntry = players.get(playerId);
            if (!playerEntry) return;
            const newRoom = (msg.roomId && String(msg.roomId).trim().toUpperCase()) || 'GLOBAL';
            const oldRoom = playerEntry.state.roomId;
            playerEntry.state.roomId = newRoom;

            // Notify old room
            broadcast(playerId, {
              type: 'player:left',
              id: playerId,
            }, false, oldRoom);

            // Notify player of room change
            const roomPlayers = Array.from(players.values())
              .filter(p => p.state.id !== playerId && p.state.roomId === newRoom)
              .map(p => p.state);

            ws.send(JSON.stringify({
              type: 'welcome',
              id: playerId,
              player: playerEntry.state,
              players: roomPlayers,
              roomId: newRoom,
            }));

            // Announce in new room
            broadcast(playerId, {
              type: 'player:joined',
              player: playerEntry.state,
            }, false, newRoom);
            break;
          }

          case 'player:customize': {
            const playerEntry = players.get(playerId);
            if (!playerEntry) return;

            if (msg.name) playerEntry.state.name = String(msg.name).slice(0, 16);
            if (typeof msg.level === 'number') playerEntry.state.level = msg.level;
            if (msg.headColor) playerEntry.state.headColor = msg.headColor;
            if (msg.torsoColor) playerEntry.state.torsoColor = msg.torsoColor;
            if (msg.legsColor) playerEntry.state.legsColor = msg.legsColor;
            if (msg.hat) playerEntry.state.hat = msg.hat;
            if (msg.trail) playerEntry.state.trail = msg.trail;

            broadcast(null, {
              type: 'player:customized',
              id: playerId,
              state: playerEntry.state,
            }, true, playerEntry.state.roomId);
            break;
          }

          case 'chat': {
            const playerEntry = players.get(playerId);
            const text = (msg.text && String(msg.text).slice(0, 140).trim()) || '';
            if (!text) return;

            broadcast(null, {
              type: 'chat',
              id: playerId,
              name: playerEntry ? playerEntry.state.name : 'Gast',
              text,
              timestamp: Date.now(),
            }, true, playerEntry?.state.roomId);
            break;
          }

          case 'emote': {
            const playerEntry = players.get(playerId);
            const emote = msg.emote; // 'wave' | 'cheer' | 'dance' | 'highfive'
            if (!emote) return;

            broadcast(null, {
              type: 'emote',
              id: playerId,
              name: playerEntry ? playerEntry.state.name : 'Spieler',
              emote,
            }, true, playerEntry?.state.roomId);
            break;
          }

          case 'highfive': {
            const targetId = msg.targetId;
            const sender = players.get(playerId);
            const target = players.get(targetId);

            if (sender && target) {
              // Send high-five celebration to both participants and others
              broadcast(null, {
                type: 'highfive:celebration',
                fromId: playerId,
                fromName: sender.state.name,
                targetId,
                targetName: target.state.name,
                xpBonus: 75,
              }, true);
            }
            break;
          }

          case 'teleport:friend': {
            const targetId = msg.targetId;
            const target = players.get(targetId);
            const sender = players.get(playerId);
            if (target && sender && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'teleport:to',
                targetName: target.state.name,
                position: target.state.position,
                stage: target.state.stage,
              }));
            }
            break;
          }

          case 'ping': {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
            }
            break;
          }
        }
      } catch (err) {
        console.error('[Multiplayer] Failed parsing packet:', err);
      }
    });

    ws.on('close', () => {
      console.log(`[Multiplayer] Player disconnected: ${playerId}`);
      const entry = players.get(playerId);
      const name = entry?.state.name || 'Ein Spieler';
      players.delete(playerId);

      if (isRegistered) {
        broadcast(null, {
          type: 'player:left',
          id: playerId,
        });

        broadcast(null, {
          type: 'chat',
          id: 'system',
          name: 'Server',
          text: `${name} hat das Spiel verlassen.`,
          timestamp: Date.now(),
          isSystem: true,
        }, true);
      }
    });
  });

  // Periodically clean up stale connections
  setInterval(() => {
    const now = Date.now();
    players.forEach((p, id) => {
      if (now - p.state.lastActive > 60000 && p.ws.readyState !== WebSocket.OPEN) {
        players.delete(id);
      }
    });
  }, 30000);

  // Vite middleware for development or Static server for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`Roblox Obby 3D Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
