import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerPlayerState {
  uid: string;
  displayName: string;
  playerClass: string;
  hairColor: string;
  armorColor: string;
  weaponId: string;
  level: number;
  mapId: string;
  x: number;
  y: number;
  aimAngle: number;
  hp: number;
  maxHp: number;
}

interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  mapId: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  const clients = new Map<WebSocket, ServerPlayerState>();
  const chatHistory: ChatMessage[] = [];

  function pushChat(msg: ChatMessage) {
    chatHistory.push(msg);
    if (chatHistory.length > 40) chatHistory.shift();
    broadcastAll({ type: 'chat:message', message: msg });
  }

  function broadcastAll(payload: unknown, exclude?: WebSocket) {
    const raw = JSON.stringify(payload);
    for (const [sock] of clients) {
      if (sock !== exclude && sock.readyState === WebSocket.OPEN) {
        sock.send(raw);
      }
    }
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', onlinePlayers: clients.size });
  });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'auth:join' && data.player && typeof data.player.uid === 'string') {
          const player: ServerPlayerState = {
            uid: String(data.player.uid).slice(0, 128),
            displayName: String(data.player.displayName || '開拓者').slice(0, 24),
            playerClass: String(data.player.playerClass || 'blade_knight'),
            hairColor: String(data.player.hairColor || '#1E293B'),
            armorColor: String(data.player.armorColor || '#991B1B'),
            weaponId: String(data.player.weaponId || 'wp_common_01'),
            level: Number(data.player.level) || 1,
            mapId: String(data.player.mapId || 'emerald_meadow'),
            x: Number(data.player.x) || 1600,
            y: Number(data.player.y) || 1200,
            aimAngle: Number(data.player.aimAngle) || 0,
            hp: Number(data.player.hp) || 100,
            maxHp: Number(data.player.maxHp) || 100,
          };

          // Remove any stale socket for same UID
          for (const [otherSock, otherPlayer] of clients) {
            if (otherPlayer.uid === player.uid && otherSock !== ws) {
              clients.delete(otherSock);
              otherSock.close();
            }
          }

          clients.set(ws, player);

          ws.send(
            JSON.stringify({
              type: 'world:init',
              players: Array.from(clients.values()),
              chatHistory,
              onlineCount: clients.size,
            }),
          );

          broadcastAll(
            {
              type: 'player:joined',
              player,
              onlineCount: clients.size,
            },
            ws,
          );
        } else if (data.type === 'player:move' && data.state) {
          const current = clients.get(ws);
          if (!current) return;
          const updated: ServerPlayerState = {
            ...current,
            mapId: String(data.state.mapId || current.mapId),
            x: Number(data.state.x ?? current.x),
            y: Number(data.state.y ?? current.y),
            aimAngle: Number(data.state.aimAngle ?? current.aimAngle),
            hp: Number(data.state.hp ?? current.hp),
            maxHp: Number(data.state.maxHp ?? current.maxHp),
            level: Number(data.state.level ?? current.level),
            weaponId: String(data.state.weaponId || current.weaponId),
            playerClass: String(data.state.playerClass || current.playerClass),
            hairColor: String(data.state.hairColor || current.hairColor),
            armorColor: String(data.state.armorColor || current.armorColor),
            displayName: String(data.state.displayName || current.displayName).slice(0, 24),
          };
          clients.set(ws, updated);
          broadcastAll({ type: 'player:state', player: updated }, ws);
        } else if (data.type === 'player:action') {
          const current = clients.get(ws);
          if (!current) return;
          broadcastAll(
            {
              type: 'player:action',
              uid: current.uid,
              kind: data.kind === 'skill' ? 'skill' : 'attack',
              color: String(data.color || '#FDE047'),
              pattern: String(data.pattern || 'slash'),
              angle: Number(data.angle) || 0,
            },
            ws,
          );
        } else if (data.type === 'chat:send') {
          const current = clients.get(ws);
          if (!current) return;
          const text = String(data.text || '').trim().slice(0, 180);
          if (!text) return;
          pushChat({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            uid: current.uid,
            displayName: current.displayName,
            mapId: String(data.mapId || current.mapId),
            text,
            timestamp: Date.now(),
          });
        } else if (data.type === 'world:boss_defeated') {
          const current = clients.get(ws);
          if (!current) return;
          const bossName = String(data.bossName || '').slice(0, 40);
          const rarityLabel = String(data.rarityLabel || '').slice(0, 20);
          if (!bossName) return;
          pushChat({
            id: `${Date.now()}_sys`,
            uid: 'system',
            displayName: 'ワールド速報',
            mapId: String(data.mapId || current.mapId),
            text: `${current.displayName} が [${rarityLabel}] ${bossName} を討伐しました！`,
            timestamp: Date.now(),
            isSystem: true,
          });
        }
      } catch {
        // Ignore invalid JSON frames
      }
    });

    ws.on('close', () => {
      const removed = clients.get(ws);
      if (removed) {
        clients.delete(ws);
        broadcastAll({
          type: 'player:left',
          uid: removed.uid,
          onlineCount: clients.size,
        });
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    // HMR is disabled in preview; provide Vite client exports without opening an HMR WebSocket.
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheets = new Map();
export function updateStyle(id, content) {
  let style = sheets.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(style);
    sheets.set(id, style);
  }
  style.textContent = content;
}
export function removeStyle(id) {
  const style = sheets.get(id);
  if (style) {
    style.remove();
    sheets.delete(id);
  }
}
export function createHotContext() {
  return {
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
    data: {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Aetheria Chronicles server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
