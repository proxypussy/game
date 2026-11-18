import { MapId, PlayerClassId, RemotePlayerState, SkillPattern } from '../game/types';

export interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  mapId: MapId;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

type ServerMessage =
  | { type: 'world:init'; players: RemotePlayerState[]; chatHistory: ChatMessage[]; onlineCount: number }
  | { type: 'player:joined'; player: RemotePlayerState; onlineCount: number }
  | { type: 'player:left'; uid: string; onlineCount: number }
  | { type: 'player:state'; player: RemotePlayerState }
  | { type: 'player:action'; uid: string; kind: 'attack' | 'skill'; color: string; pattern: SkillPattern; angle: number }
  | { type: 'chat:message'; message: ChatMessage };

export interface MultiplayerCallbacks {
  onPlayersChange: (players: Map<string, RemotePlayerState>, onlineCount: number) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onChatHistory: (msgs: ChatMessage[]) => void;
  onConnectionChange: (connected: boolean) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private remotePlayers = new Map<string, RemotePlayerState>();
  private onlineCount = 1;
  private selfUid = '';
  private latestJoinPayload: Omit<RemotePlayerState, 'lastAction'> | null = null;
  private callbacks: MultiplayerCallbacks;
  private reconnectTimer: number | null = null;
  private disposed = false;
  private lastMoveSentAt = 0;

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  connect(initialState: Omit<RemotePlayerState, 'lastAction'>) {
    this.selfUid = initialState.uid;
    this.latestJoinPayload = initialState;
    this.disposed = false;
    this.openSocket();
  }

  private openSocket() {
    if (this.disposed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.callbacks.onConnectionChange(true);
      if (this.latestJoinPayload) {
        this.send({ type: 'auth:join', player: this.latestJoinPayload });
      }
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as ServerMessage;
        this.handleServerMessage(data);
      } catch {
        // Ignore malformed packets
      }
    };

    ws.onclose = () => {
      this.callbacks.onConnectionChange(false);
      if (!this.disposed) {
        this.reconnectTimer = window.setTimeout(() => this.openSocket(), 2500);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private handleServerMessage(msg: ServerMessage) {
    if (msg.type === 'world:init') {
      this.remotePlayers.clear();
      for (const p of msg.players) {
        if (p.uid !== this.selfUid) {
          this.remotePlayers.set(p.uid, p);
        }
      }
      this.onlineCount = msg.onlineCount;
      this.callbacks.onChatHistory(msg.chatHistory);
      this.callbacks.onPlayersChange(new Map(this.remotePlayers), this.onlineCount);
    } else if (msg.type === 'player:joined') {
      if (msg.player.uid !== this.selfUid) {
        this.remotePlayers.set(msg.player.uid, msg.player);
      }
      this.onlineCount = msg.onlineCount;
      this.callbacks.onPlayersChange(new Map(this.remotePlayers), this.onlineCount);
    } else if (msg.type === 'player:left') {
      this.remotePlayers.delete(msg.uid);
      this.onlineCount = msg.onlineCount;
      this.callbacks.onPlayersChange(new Map(this.remotePlayers), this.onlineCount);
    } else if (msg.type === 'player:state') {
      if (msg.player.uid !== this.selfUid) {
        const prev = this.remotePlayers.get(msg.player.uid);
        this.remotePlayers.set(msg.player.uid, {
          ...msg.player,
          lastAction: prev?.lastAction,
        });
        this.callbacks.onPlayersChange(new Map(this.remotePlayers), this.onlineCount);
      }
    } else if (msg.type === 'player:action') {
      if (msg.uid !== this.selfUid) {
        const existing = this.remotePlayers.get(msg.uid);
        if (existing) {
          this.remotePlayers.set(msg.uid, {
            ...existing,
            lastAction: {
              kind: msg.kind,
              color: msg.color,
              pattern: msg.pattern,
              angle: msg.angle,
              at: performance.now(),
            },
          });
          this.callbacks.onPlayersChange(new Map(this.remotePlayers), this.onlineCount);
        }
      }
    } else if (msg.type === 'chat:message') {
      this.callbacks.onChatMessage(msg.message);
    }
  }

  private send(payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  sendStateUpdate(state: {
    mapId: MapId;
    x: number;
    y: number;
    aimAngle: number;
    hp: number;
    maxHp: number;
    level: number;
    weaponId: string;
    playerClass: PlayerClassId;
    hairColor: string;
    armorColor: string;
    displayName: string;
  }) {
    const now = performance.now();
    if (now - this.lastMoveSentAt < 65) return; // ~15Hz throttle
    this.lastMoveSentAt = now;

    if (this.latestJoinPayload) {
      this.latestJoinPayload = {
        ...this.latestJoinPayload,
        ...state,
      };
    }
    this.send({ type: 'player:move', state });
  }

  sendAction(kind: 'attack' | 'skill', color: string, pattern: SkillPattern, angle: number) {
    this.send({ type: 'player:action', kind, color, pattern, angle });
  }

  sendChat(text: string, mapId: MapId) {
    const clean = text.trim().slice(0, 180);
    if (!clean) return;
    this.send({ type: 'chat:send', text: clean, mapId });
  }

  sendBossDefeatAnnouncement(bossName: string, rarityLabel: string, mapId: MapId) {
    this.send({
      type: 'world:boss_defeated',
      bossName,
      rarityLabel,
      mapId,
    });
  }

  disconnect() {
    this.disposed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
