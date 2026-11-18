import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../game/audio';
import { getEnemiesForMap, ENEMIES } from '../game/enemiesCatalog';
import { ITEM_BY_ID } from '../game/itemsCatalog';
import {
  STRUCTURE_BY_TYPE,
  STRUCTURE_GRID_SIZE,
  STRUCTURES_CATALOG,
  WORLD_MAP_LIST,
  WORLD_MAPS,
} from '../game/mapsCatalog';
import { ComputedStats, EnemyDropResult, rollEnemyDrops } from '../game/mechanics';
import {
  ActiveSkillVisual,
  drawAuthenticCharacter,
  drawEnemySprite,
  drawObstacle,
  drawSkillEffect,
  drawStructure,
  drawWarpGates,
  drawWorldBackground,
} from '../game/renderer';
import { SKILL_BY_ID } from '../game/skillsCatalog';
import {
  EnemyDefinition,
  ItemDefinition,
  MapId,
  PlacedStructure,
  PlayerBase,
  PlayerSave,
  PublicProfile,
  RARITY_BY_ID,
  RarityId,
  RemotePlayerState,
  StructureType,
  WarpPoint,
} from '../game/types';
import { ChatMessage, MultiplayerClient } from '../services/multiplayer';
import {
  CalendarCheck,
  Compass,
  Hammer,
  Home,
  MessageSquare,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface ActiveEnemy {
  uid: string;
  def: EnemyDefinition;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  hitFlash: number;
  attackCooldown: number;
  aiPhase: number;
  isDefenseRaider?: boolean;
}

interface Projectile {
  id: string;
  fromPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  lifeMs: number;
  pierce: boolean;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
}

export interface GameCanvasProps {
  profile: PublicProfile;
  save: PlayerSave;
  stats: ComputedStats;
  playerBase: PlayerBase;
  visitingBase: PlayerBase | null;
  remotePlayers: Map<string, RemotePlayerState>;
  onlineCount: number;
  wsConnected: boolean;
  chatMessages: ChatMessage[];
  quickItemIds: string[];
  multiplayer: MultiplayerClient | null;
  buildMode: boolean;
  canClaimDaily: boolean;
  onOpenDailyBonus: () => void;
  onDefenseCleared: (
    waveCount: number,
    goldReward: number,
    dustReward: number,
    itemRarity: RarityId,
    skillRarity: RarityId,
  ) => void;
  onToggleBuildMode: (val: boolean) => void;
  onExitVisitBase: () => void;
  onMoveUpdate: (mapId: MapId, x: number, y: number) => void;
  onEnemyDefeated: (enemy: EnemyDefinition, drops: EnemyDropResult) => void;
  onPlaceStructure: (st: PlacedStructure, costGold: number, costDust: number) => void;
  onRemoveStructure: (id: string) => void;
  onWarpToMap: (mapId: MapId, spawnX: number, spawnY: number) => void;
  onConsumeQuickItem: (item: ItemDefinition) => void;
  externalSkillTriggerRef: React.MutableRefObject<((slotIdx: number) => void) | null>;
  externalItemTriggerRef: React.MutableRefObject<((item: ItemDefinition) => void) | null>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  profile,
  save,
  stats,
  playerBase,
  visitingBase,
  remotePlayers,
  onlineCount,
  wsConnected,
  chatMessages,
  quickItemIds,
  multiplayer,
  buildMode,
  canClaimDaily,
  onOpenDailyBonus,
  onDefenseCleared,
  onToggleBuildMode,
  onExitVisitBase,
  onMoveUpdate,
  onEnemyDefeated,
  onPlaceStructure,
  onRemoveStructure,
  onWarpToMap,
  onConsumeQuickItem,
  externalSkillTriggerRef,
  externalItemTriggerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live mutable engine refs for 60fps loop without React re-render overhead
  const posRef = useRef({ x: save.posX, y: save.posY });
  const aimAngleRef = useRef(0);
  const hpRef = useRef(stats.maxHp);
  const mpRef = useRef(stats.maxMp);
  const swingRef = useRef(0);
  const shieldUntilRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());
  const skillCooldownsRef = useRef<Record<string, number>>({});
  const itemCooldownsRef = useRef<Record<string, number>>({});
  const attackCooldownRef = useRef(0);
  const enemiesRef = useRef<ActiveEnemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const skillFxRef = useRef<ActiveSkillVisual[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const turretCooldownRef = useRef<Record<string, number>>({});
  const defenseRef = useRef({
    active: false,
    wave: 0,
    maxWaves: 3,
    coreHp: 1000,
    coreMaxHp: 1000,
  });

  // Latest props mirrored to refs for RAF loop
  const saveRef = useRef(save);
  const statsRef = useRef(stats);
  const profileRef = useRef(profile);
  const baseRef = useRef(visitingBase || playerBase);
  const remoteRef = useRef(remotePlayers);
  const buildModeRef = useRef(buildMode);
  const visitingRef = useRef(visitingBase);
  const onDefenseClearedRef = useRef(onDefenseCleared);
  saveRef.current = save;
  statsRef.current = stats;
  profileRef.current = profile;
  baseRef.current = visitingBase || playerBase;
  remoteRef.current = remotePlayers;
  buildModeRef.current = buildMode;
  visitingRef.current = visitingBase;
  onDefenseClearedRef.current = onDefenseCleared;

  // React HUD states
  const [hudHp, setHudHp] = useState(stats.maxHp);
  const [hudMp, setHudMp] = useState(stats.maxMp);
  const [cooldownPct, setCooldownPct] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [nearWarp, setNearWarp] = useState<WarpPoint | null>(null);
  const [warpModalPoint, setWarpModalPoint] = useState<WarpPoint | null>(null);
  const [bossTarget, setBossTarget] = useState<ActiveEnemy | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<StructureType | 'demolish'>('stone_wall');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [muted, setMuted] = useState(false);
  const [defenseHud, setDefenseHud] = useState({
    active: false,
    wave: 0,
    maxWaves: 3,
    coreHp: 1000,
    coreMaxHp: 1000,
    remaining: 0,
  });
  const [defenseNotice, setDefenseNotice] = useState<{ title: string; detail: string; isVictory: boolean } | null>(
    null,
  );

  const selectedStructureRef = useRef(selectedStructure);
  selectedStructureRef.current = selectedStructure;

  // Sync position when map changes externally
  useEffect(() => {
    posRef.current = { x: save.posX, y: save.posY };
    hpRef.current = statsRef.current.maxHp;
    mpRef.current = statsRef.current.maxMp;
    projectilesRef.current = [];
    skillFxRef.current = [];
    defenseRef.current.active = false;
    setDefenseHud((prev) => ({ ...prev, active: false }));

    // Populate enemies for current map
    const mapDef = WORLD_MAPS[save.currentMapId];
    const pool = getEnemiesForMap(save.currentMapId);
    const spawned: ActiveEnemy[] = [];
    const targetCount = 24;

    for (let i = 0; i < targetCount; i++) {
      const def = pool[i % pool.length];
      let ex = 200 + Math.random() * (mapDef.width - 400);
      let ey = 200 + Math.random() * (mapDef.height - 400);
      if (mapDef.hasSanctuaryZone && mapDef.sanctuaryBounds) {
        const sb = mapDef.sanctuaryBounds;
        if (ex > sb.x - 140 && ex < sb.x + sb.w + 140 && ey > sb.y - 140 && ey < sb.y + sb.h + 140) {
          ex = ex < mapDef.width / 2 ? sb.x - 240 : sb.x + sb.w + 240;
        }
      }
      spawned.push({
        uid: `mob_${save.currentMapId}_${i}_${Date.now()}`,
        def,
        x: Math.max(120, Math.min(mapDef.width - 120, ex)),
        y: Math.max(120, Math.min(mapDef.height - 120, ey)),
        vx: 0,
        vy: 0,
        hp: def.maxHp,
        hitFlash: 0,
        attackCooldown: 600 + Math.random() * 800,
        aiPhase: Math.random() * Math.PI * 2,
      });
    }
    enemiesRef.current = spawned;
    setBossTarget(null);
  }, [save.currentMapId]);

  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: `${Date.now()}_${Math.random()}`,
      x,
      y,
      text,
      color,
      createdAt: performance.now(),
    });
  };

  const spawnDefenseWave = (waveNum: number) => {
    const lv = saveRef.current.level;
    let mobRarity: RarityId = 'common';
    let bossRarity: RarityId = 'rare';

    if (lv >= 20) {
      mobRarity = waveNum === 1 ? 'rare' : 'epic';
      bossRarity = 'legendary';
    } else if (lv >= 8) {
      mobRarity = waveNum === 1 ? 'uncommon' : 'rare';
      bossRarity = 'epic';
    } else {
      mobRarity = waveNum === 1 ? 'common' : 'uncommon';
      bossRarity = 'rare';
    }

    const mobPool = ENEMIES.filter((e) => e.rarity === mobRarity && !e.isBoss);
    const fallbackPool = mobPool.length > 0 ? mobPool : ENEMIES.filter((e) => e.rarity === mobRarity);
    const bossPool = ENEMIES.filter((e) => e.rarity === bossRarity && e.isBoss);
    const count = waveNum === 1 ? 8 : 11;

    const raiders: ActiveEnemy[] = [];
    for (let i = 0; i < count; i++) {
      const def = fallbackPool[i % fallbackPool.length];
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const dist = 460 + Math.random() * 75;
      raiders.push({
        uid: `raid_${waveNum}_${i}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        def,
        x: Math.round(1600 + Math.cos(ang) * dist),
        y: Math.round(1200 + Math.sin(ang) * dist),
        vx: 0,
        vy: 0,
        hp: def.maxHp,
        hitFlash: 0,
        attackCooldown: 700 + Math.random() * 500,
        aiPhase: Math.random() * Math.PI * 2,
        isDefenseRaider: true,
      });
    }

    if (waveNum === 3 && bossPool.length > 0) {
      const bossDef = bossPool[Math.floor(Math.random() * bossPool.length)];
      const ang = Math.random() * Math.PI * 2;
      raiders.push({
        uid: `raid_boss_${waveNum}_${Date.now()}`,
        def: bossDef,
        x: Math.round(1600 + Math.cos(ang) * 510),
        y: Math.round(1200 + Math.sin(ang) * 510),
        vx: 0,
        vy: 0,
        hp: bossDef.maxHp,
        hitFlash: 0,
        attackCooldown: 900,
        aiPhase: 0,
        isDefenseRaider: true,
      });
    }

    enemiesRef.current = [...enemiesRef.current.filter((e) => !e.isDefenseRaider), ...raiders];
    defenseRef.current.wave = waveNum;
  };

  const startDefenseEvent = () => {
    if (saveRef.current.currentMapId !== 'emerald_meadow' || visitingRef.current) return;
    if (defenseRef.current.active) return;

    const wallCount = baseRef.current.structures.filter(
      (s) => s.type === 'wood_wall' || s.type === 'stone_wall' || s.type === 'arcane_barrier',
    ).length;
    const coreMaxHp = 1000 + wallCount * 150;

    defenseRef.current = {
      active: true,
      wave: 1,
      maxWaves: 3,
      coreHp: coreMaxHp,
      coreMaxHp,
    };
    setDefenseNotice(null);
    onToggleBuildMode(false);
    spawnDefenseWave(1);
    soundEngine.playWarp();
    spawnFloatingText(1600, 1140, '拠点防衛戦 ウェーブ 1/3 開始！', '#FBBF24');
    setDefenseHud({
      active: true,
      wave: 1,
      maxWaves: 3,
      coreHp: coreMaxHp,
      coreMaxHp,
      remaining: enemiesRef.current.filter((e) => e.isDefenseRaider).length,
    });
  };

  const cancelDefenseEvent = () => {
    defenseRef.current.active = false;
    enemiesRef.current = enemiesRef.current.filter((e) => !e.isDefenseRaider);
    setDefenseHud((prev) => ({ ...prev, active: false }));
  };

  const damageEnemy = (enemy: ActiveEnemy, rawDamage: number, isSkill: boolean) => {
    if (enemy.hp <= 0) return;
    const isCrit = Math.random() * 100 < statsRef.current.critChance;
    const dmg = Math.max(
      1,
      Math.round((rawDamage * (isCrit ? 1.75 : 1) - enemy.def.def * 0.35) * (0.92 + Math.random() * 0.16)),
    );
    enemy.hp -= dmg;
    enemy.hitFlash = 130;
    soundEngine.playHit(isCrit);
    spawnFloatingText(
      enemy.x + (Math.random() - 0.5) * 18,
      enemy.y - enemy.def.size - 8,
      isCrit ? `CRIT ${dmg}!` : `${dmg}`,
      isCrit ? '#FDE047' : isSkill ? '#38BDF8' : '#FFFFFF',
    );

    if (enemy.hp <= 0) {
      const drops = rollEnemyDrops(enemy.def, statsRef.current.libraryBonusPct);
      onEnemyDefeated(enemy.def, drops);

      const dropSummary = [
        drops.exp > 0 ? `+${drops.exp} EXP` : '',
        drops.gold > 0 ? `+${drops.gold}G` : '',
        ...drops.droppedItems.map((it) => `[${RARITY_BY_ID[it.rarity].label}] ${it.name}`),
        ...drops.droppedSkills.map((sk) => `スキル:${sk.name}`),
      ]
        .filter(Boolean)
        .slice(0, 3)
        .join(' · ');

      if (dropSummary) {
        spawnFloatingText(enemy.x, enemy.y - enemy.def.size - 28, dropSummary, '#34D399');
      }

      if (enemy.def.isBoss) {
        multiplayer?.sendBossDefeatAnnouncement(
          enemy.def.name,
          RARITY_BY_ID[enemy.def.rarity].label,
          saveRef.current.currentMapId,
        );
      }

      if (enemy.isDefenseRaider) {
        enemiesRef.current = enemiesRef.current.filter((e) => e.uid !== enemy.uid);
        if (defenseRef.current.active) {
          const remaining = enemiesRef.current.filter((e) => e.isDefenseRaider).length;
          if (remaining === 0) {
            if (defenseRef.current.wave < defenseRef.current.maxWaves) {
              const nextWave = defenseRef.current.wave + 1;
              spawnDefenseWave(nextWave);
              soundEngine.playWarp();
              spawnFloatingText(1600, 1135, `ウェーブ ${nextWave}/${defenseRef.current.maxWaves} 襲来！`, '#FBBF24');
            } else {
              defenseRef.current.active = false;
              const lv = saveRef.current.level;
              const goldReward = 650 + lv * 45;
              const dustReward = 14 + Math.floor(lv * 0.8);
              const itemRarity: RarityId = lv >= 22 ? 'mythic' : lv >= 10 ? 'legendary' : 'epic';
              const skillRarity: RarityId = lv >= 22 ? 'legendary' : lv >= 10 ? 'epic' : 'rare';
              onDefenseClearedRef.current(3, goldReward, dustReward, itemRarity, skillRarity);
              soundEngine.playLevelUp();
              setDefenseNotice({
                title: '拠点防衛成功！',
                detail: `全3ウェーブを撃退！ +${goldReward.toLocaleString()}G · 魔導粉塵+${dustReward} · ${RARITY_BY_ID[itemRarity].label}装備＆${RARITY_BY_ID[skillRarity].label}スキルを獲得`,
                isVictory: true,
              });
            }
          }
        }
        return;
      }

      // Respawn new enemy elsewhere on map
      const mapDef = WORLD_MAPS[saveRef.current.currentMapId];
      const pool = getEnemiesForMap(saveRef.current.currentMapId);
      const nextDef = pool[Math.floor(Math.random() * pool.length)];
      let nx = 220 + Math.random() * (mapDef.width - 440);
      let ny = 220 + Math.random() * (mapDef.height - 440);
      if (mapDef.hasSanctuaryZone && mapDef.sanctuaryBounds) {
        const sb = mapDef.sanctuaryBounds;
        if (nx > sb.x - 140 && nx < sb.x + sb.w + 140 && ny > sb.y - 140 && ny < sb.y + sb.h + 140) {
          nx = nx < mapDef.width / 2 ? sb.x - 260 : sb.x + sb.w + 260;
        }
      }
      enemy.def = nextDef;
      enemy.x = Math.max(120, Math.min(mapDef.width - 120, nx));
      enemy.y = Math.max(120, Math.min(mapDef.height - 120, ny));
      enemy.hp = nextDef.maxHp;
      enemy.hitFlash = 0;
    }
  };

  const performPrimaryAttack = () => {
    const now = performance.now();
    if (now < attackCooldownRef.current || visitingRef.current) return;
    attackCooldownRef.current = now + 300;
    swingRef.current = 1;
    soundEngine.playSlash();

    const px = posRef.current.x;
    const py = posRef.current.y;
    const ang = aimAngleRef.current;
    const weapon = ITEM_BY_ID[saveRef.current.equippedWeaponId];
    const isRanged = weapon?.visualStyle === 'staff' || weapon?.visualStyle === 'bow';

    multiplayer?.sendAction('attack', weapon ? RARITY_BY_ID[weapon.rarity].color : '#E2E8F0', 'slash', ang);

    if (isRanged) {
      projectilesRef.current.push({
        id: `prj_${now}_${Math.random()}`,
        fromPlayer: true,
        x: px + Math.cos(ang) * 20,
        y: py + Math.sin(ang) * 20,
        vx: Math.cos(ang) * 560,
        vy: Math.sin(ang) * 560,
        damage: statsRef.current.atk * 1.15,
        radius: 8,
        color: weapon ? RARITY_BY_ID[weapon.rarity].color : '#38BDF8',
        lifeMs: 850,
        pierce: false,
      });
    } else {
      const reach = weapon?.visualStyle === 'spear' || weapon?.visualStyle === 'greatsword' ? 115 : 90;
      for (const en of enemiesRef.current) {
        const dx = en.x - px;
        const dy = en.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist <= reach + en.def.size) {
          const diff = Math.atan2(Math.sin(Math.atan2(dy, dx) - ang), Math.cos(Math.atan2(dy, dx) - ang));
          if (Math.abs(diff) <= 1.25 || dist < 44) {
            damageEnemy(en, statsRef.current.atk * 1.2, false);
          }
        }
      }
    }
  };

  const triggerSkill = (slotIdx: number) => {
    if (visitingRef.current) return;
    const skId = saveRef.current.equippedSkills[slotIdx];
    const sk = skId ? SKILL_BY_ID[skId] : null;
    if (!sk) return;

    const now = performance.now();
    const readyAt = skillCooldownsRef.current[sk.id] || 0;
    if (now < readyAt) return;
    if (mpRef.current < sk.mpCost) {
      spawnFloatingText(posRef.current.x, posRef.current.y - 35, 'MP不足', '#F87171');
      return;
    }

    mpRef.current -= sk.mpCost;
    skillCooldownsRef.current[sk.id] = now + sk.cooldownMs;
    soundEngine.playSkill();

    const px = posRef.current.x;
    const py = posRef.current.y;
    const ang = aimAngleRef.current;
    const tx = px + Math.cos(ang) * sk.range;
    const ty = py + Math.sin(ang) * sk.range;

    multiplayer?.sendAction('skill', sk.color, sk.pattern, ang);

    skillFxRef.current.push({
      id: `fx_${now}_${Math.random()}`,
      pattern: sk.pattern,
      color: sk.color,
      x: px,
      y: py,
      targetX: tx,
      targetY: ty,
      angle: ang,
      radius: sk.aoeRadius,
      createdAt: now,
      durationMs: sk.pattern === 'beam' ? 320 : 380,
    });

    const dmg = statsRef.current.atk * sk.powerMult;

    if (sk.pattern === 'heal') {
      const healAmt = Math.round(statsRef.current.maxHp * (0.22 + sk.powerMult * 0.04));
      hpRef.current = Math.min(statsRef.current.maxHp, hpRef.current + healAmt);
      spawnFloatingText(px, py - 38, `+${healAmt} HP`, '#34D399');
    } else if (sk.pattern === 'shield') {
      shieldUntilRef.current = now + 5000;
      spawnFloatingText(px, py - 38, '結界展開！', '#38BDF8');
      for (const en of enemiesRef.current) {
        if (Math.hypot(en.x - px, en.y - py) <= sk.aoeRadius) {
          damageEnemy(en, dmg * 0.75, true);
        }
      }
    } else if (sk.pattern === 'dash') {
      const mapDef = WORLD_MAPS[saveRef.current.currentMapId];
      const nextX = Math.max(40, Math.min(mapDef.width - 40, px + Math.cos(ang) * 160));
      const nextY = Math.max(40, Math.min(mapDef.height - 40, py + Math.sin(ang) * 160));
      posRef.current = { x: nextX, y: nextY };
      for (const en of enemiesRef.current) {
        if (Math.hypot(en.x - nextX, en.y - nextY) <= sk.aoeRadius + 40) {
          damageEnemy(en, dmg, true);
        }
      }
    } else if (sk.pattern === 'projectile') {
      projectilesRef.current.push({
        id: `skp_${now}_${Math.random()}`,
        fromPlayer: true,
        x: px + Math.cos(ang) * 18,
        y: py + Math.sin(ang) * 18,
        vx: Math.cos(ang) * 640,
        vy: Math.sin(ang) * 640,
        damage: dmg,
        radius: 14,
        color: sk.color,
        lifeMs: 950,
        pierce: true,
      });
    } else if (sk.pattern === 'beam') {
      for (const en of enemiesRef.current) {
        const dx = en.x - px;
        const dy = en.y - py;
        const proj = dx * Math.cos(ang) + dy * Math.sin(ang);
        const perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
        if (proj >= 0 && proj <= sk.range && perp <= 38 + en.def.size) {
          damageEnemy(en, dmg, true);
        }
      }
    } else if (sk.pattern === 'meteor') {
      for (const en of enemiesRef.current) {
        if (Math.hypot(en.x - tx, en.y - ty) <= sk.aoeRadius + en.def.size) {
          damageEnemy(en, dmg, true);
        }
      }
    } else {
      // slash / nova
      for (const en of enemiesRef.current) {
        const dist = Math.hypot(en.x - px, en.y - py);
        if (dist <= sk.aoeRadius + en.def.size) {
          damageEnemy(en, dmg, true);
        }
      }
    }
  };

  const triggerCombatItem = (item: ItemDefinition) => {
    const now = performance.now();
    const readyAt = itemCooldownsRef.current[item.id] || 0;
    if (now < readyAt) return;
    itemCooldownsRef.current[item.id] = now + item.cooldownMs;

    soundEngine.playSkill();

    if (item.healHp > 0) {
      hpRef.current = Math.min(statsRef.current.maxHp, hpRef.current + item.healHp);
      spawnFloatingText(posRef.current.x, posRef.current.y - 38, `+${item.healHp} HP`, '#34D399');
    }
    if (item.healMp > 0) {
      mpRef.current = Math.min(statsRef.current.maxMp, mpRef.current + item.healMp);
      spawnFloatingText(posRef.current.x, posRef.current.y - 54, `+${item.healMp} MP`, '#38BDF8');
    }
    if (item.combatDamage > 0) {
      const rColor = RARITY_BY_ID[item.rarity].color;
      skillFxRef.current.push({
        id: `itfx_${now}`,
        pattern: 'nova',
        color: rColor,
        x: posRef.current.x,
        y: posRef.current.y,
        targetX: posRef.current.x,
        targetY: posRef.current.y,
        angle: 0,
        radius: item.combatRadius,
        createdAt: now,
        durationMs: 360,
      });
      for (const en of enemiesRef.current) {
        if (Math.hypot(en.x - posRef.current.x, en.y - posRef.current.y) <= item.combatRadius + en.def.size) {
          damageEnemy(en, item.combatDamage + statsRef.current.atk * 0.5, true);
        }
      }
    }

    if (item.category === 'consumable') {
      onConsumeQuickItem(item);
    }
  };

  externalSkillTriggerRef.current = triggerSkill;
  externalItemTriggerRef.current = triggerCombatItem;

  // Input listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      const k = e.key.toLowerCase();
      keysRef.current.add(k);

      if (k === ' ') {
        e.preventDefault();
        performPrimaryAttack();
      } else if (['1', '2', '3', '4', '5', '6'].includes(k)) {
        triggerSkill(Number(k) - 1);
      } else if (k === 'z' && quickItemIds[0]) {
        const it = ITEM_BY_ID[quickItemIds[0]];
        if (it) triggerCombatItem(it);
      } else if (k === 'x' && quickItemIds[1]) {
        const it = ITEM_BY_ID[quickItemIds[1]];
        if (it) triggerCombatItem(it);
      } else if (k === 'c' && quickItemIds[2]) {
        const it = ITEM_BY_ID[quickItemIds[2]];
        if (it) triggerCombatItem(it);
      } else if (k === 'b' && saveRef.current.currentMapId === 'emerald_meadow' && !visitingRef.current) {
        onToggleBuildMode(!buildModeRef.current);
      } else if (k === 'f') {
        const mapDef = WORLD_MAPS[saveRef.current.currentMapId];
        const near = mapDef.warpPoints.find(
          (wp) => Math.hypot(wp.x - posRef.current.x, wp.y - posRef.current.y) < 95,
        );
        if (near) {
          setWarpModalPoint(near);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [quickItemIds]);

  // Main 60fps Game Loop
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;
    let savePosAccum = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(tick);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
        canvas.width = Math.max(320, Math.floor(rect.width));
        canvas.height = Math.max(240, Math.floor(rect.height));
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(tick);
        return;
      }

      const mapDef = WORLD_MAPS[visitingRef.current ? 'emerald_meadow' : saveRef.current.currentMapId];
      const viewW = canvas.width;
      const viewH = canvas.height;

      // 1. Movement
      let mx = 0;
      let my = 0;
      if (keysRef.current.has('w') || keysRef.current.has('arrowup')) my -= 1;
      if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) my += 1;
      if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) mx -= 1;
      if (keysRef.current.has('d') || keysRef.current.has('arrowright')) mx += 1;
      const isMoving = mx !== 0 || my !== 0;

      if (isMoving) {
        const len = Math.hypot(mx, my);
        mx /= len;
        my /= len;
        let nx = posRef.current.x + mx * statsRef.current.speed * dt;
        let ny = posRef.current.y + my * statsRef.current.speed * dt;

        // Clamp world bounds
        nx = Math.max(28, Math.min(mapDef.width - 28, nx));
        ny = Math.max(28, Math.min(mapDef.height - 28, ny));

        // Obstacle collision
        for (const obs of mapDef.obstacles) {
          const dx = nx - obs.x;
          const dy = ny - obs.y;
          const dist = Math.hypot(dx, dy);
          const minDist = obs.radius + 16;
          if (dist < minDist && dist > 0.001) {
            nx = obs.x + (dx / dist) * minDist;
            ny = obs.y + (dy / dist) * minDist;
          }
        }

        posRef.current = { x: nx, y: ny };
      }

      // Passive HP/MP regen & Healing Fountains
      const libraryRegen = statsRef.current.libraryBonusPct * 0.25;
      mpRef.current = Math.min(statsRef.current.maxMp, mpRef.current + (5 + libraryRegen) * dt);
      hpRef.current = Math.min(statsRef.current.maxHp, hpRef.current + 2.5 * dt);

      if (mapDef.id === 'emerald_meadow') {
        for (const st of baseRef.current.structures) {
          if (st.type === 'healing_fountain') {
            const fx = st.gx * STRUCTURE_GRID_SIZE + STRUCTURE_GRID_SIZE / 2;
            const fy = st.gy * STRUCTURE_GRID_SIZE + STRUCTURE_GRID_SIZE / 2;
            if (Math.hypot(posRef.current.x - fx, posRef.current.y - fy) < 160) {
              hpRef.current = Math.min(statsRef.current.maxHp, hpRef.current + 28 * dt);
              mpRef.current = Math.min(statsRef.current.maxMp, mpRef.current + 18 * dt);
            }
          }
        }
      }

      if (swingRef.current > 0) {
        swingRef.current = Math.max(0, swingRef.current - dt * 4.5);
      }

      // 2. Base Defense Turrets AI (on emerald_meadow)
      if (mapDef.id === 'emerald_meadow' && !visitingRef.current) {
        for (const st of baseRef.current.structures) {
          if (st.type === 'turret_bolt' || st.type === 'turret_arcane') {
            const ready = turretCooldownRef.current[st.id] || 0;
            if (now >= ready) {
              const tx = st.gx * STRUCTURE_GRID_SIZE + STRUCTURE_GRID_SIZE / 2;
              const ty = st.gy * STRUCTURE_GRID_SIZE + STRUCTURE_GRID_SIZE / 2;
              const range = st.type === 'turret_arcane' ? 420 : 320;
              const target = enemiesRef.current.find((e) => Math.hypot(e.x - tx, e.y - ty) <= range);
              if (target) {
                const ang = Math.atan2(target.y - ty, target.x - tx);
                turretCooldownRef.current[st.id] = now + (st.type === 'turret_arcane' ? 850 : 650);
                projectilesRef.current.push({
                  id: `tr_${st.id}_${now}`,
                  fromPlayer: true,
                  x: tx,
                  y: ty,
                  vx: Math.cos(ang) * 580,
                  vy: Math.sin(ang) * 580,
                  damage: st.type === 'turret_arcane' ? 55 + statsRef.current.atk * 0.8 : 28 + statsRef.current.atk * 0.5,
                  radius: st.type === 'turret_arcane' ? 9 : 6,
                  color: st.type === 'turret_arcane' ? '#E879F9' : '#FBBF24',
                  lifeMs: 800,
                  pierce: false,
                });
              }
            }
          }
        }
      }

      // 3. Enemies AI & Projectiles (skip combat inside Sanctuary unless Base Defense is active)
      let engagedBoss: ActiveEnemy | null = null;
      const inSanctuary =
        mapDef.hasSanctuaryZone &&
        mapDef.sanctuaryBounds &&
        posRef.current.x > mapDef.sanctuaryBounds.x &&
        posRef.current.x < mapDef.sanctuaryBounds.x + mapDef.sanctuaryBounds.w &&
        posRef.current.y > mapDef.sanctuaryBounds.y &&
        posRef.current.y < mapDef.sanctuaryBounds.y + mapDef.sanctuaryBounds.h;
      const combatProtected = inSanctuary && !defenseRef.current.active;

      if (defenseRef.current.active && mapDef.id === 'emerald_meadow' && !visitingRef.current) {
        const fountains = baseRef.current.structures.filter((s) => s.type === 'healing_fountain').length;
        if (fountains > 0) {
          defenseRef.current.coreHp = Math.min(
            defenseRef.current.coreMaxHp,
            defenseRef.current.coreHp + fountains * 8 * dt,
          );
        }
      }

      const defenseWalls =
        defenseRef.current.active && mapDef.id === 'emerald_meadow'
          ? baseRef.current.structures.filter(
              (s) => s.type === 'wood_wall' || s.type === 'stone_wall' || s.type === 'arcane_barrier',
            )
          : [];

      if (!visitingRef.current) {
        for (const en of enemiesRef.current) {
          if (en.hitFlash > 0) en.hitFlash = Math.max(0, en.hitFlash - dt * 1000);
          en.attackCooldown -= dt * 1000;
          en.aiPhase += dt;

          if (en.isDefenseRaider && defenseRef.current.active) {
            if (en.def.isBoss) engagedBoss = en;
            const distToPlayer = Math.hypot(posRef.current.x - en.x, posRef.current.y - en.y);
            const distToCore = Math.hypot(1600 - en.x, 1200 - en.y);
            const targetPlayer = distToPlayer < 170 && distToPlayer < distToCore;
            const tx = targetPlayer ? posRef.current.x : 1600;
            const ty = targetPlayer ? posRef.current.y : 1200;
            const dx = tx - en.x;
            const dy = ty - en.y;
            const dist = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);

            let wallSlow = 1;
            for (const wall of defenseWalls) {
              const wx = wall.gx * STRUCTURE_GRID_SIZE + STRUCTURE_GRID_SIZE / 2;
              const wy = wall.gy * STRUCTURE_GRID_SIZE + STRUCTURE_GRID_SIZE / 2;
              const wdx = en.x - wx;
              const wdy = en.y - wy;
              const wDist = Math.hypot(wdx, wdy);
              const minWDist = 24 + en.def.size * 0.5;
              if (wDist < minWDist && wDist > 0.001) {
                en.x = wx + (wdx / wDist) * minWDist;
                en.y = wy + (wdy / wDist) * minWDist;
                wallSlow = wall.type === 'arcane_barrier' ? 0.25 : wall.type === 'stone_wall' ? 0.4 : 0.55;
              }
            }

            if (dist > (targetPlayer ? en.def.size + 18 : 42)) {
              en.x += Math.cos(ang) * en.def.speed * wallSlow * dt;
              en.y += Math.sin(ang) * en.def.speed * wallSlow * dt;
            }

            if (en.attackCooldown <= 0) {
              if (!targetPlayer && distToCore <= 54 + en.def.size) {
                en.attackCooldown = 1250;
                const coreDmg = Math.max(8, Math.round(en.def.atk * 0.9));
                defenseRef.current.coreHp = Math.max(0, defenseRef.current.coreHp - coreDmg);
                spawnFloatingText(1600, 1175, `コア -${coreDmg}`, '#FB7185');
              } else if (targetPlayer && distToPlayer <= en.def.size + 34) {
                en.attackCooldown = 1100;
                const shieldMult = now < shieldUntilRef.current ? 0.45 : 1;
                const dmg = Math.max(1, Math.round((en.def.atk - statsRef.current.def * 0.5) * shieldMult));
                hpRef.current -= dmg;
                spawnFloatingText(posRef.current.x, posRef.current.y - 26, `-${dmg}`, '#FB7185');
              }
            }
          } else {
            const dx = posRef.current.x - en.x;
            const dy = posRef.current.y - en.y;
            const dist = Math.hypot(dx, dy);

            if (dist < en.def.aggroRange && !combatProtected) {
              if (en.def.isBoss) engagedBoss = en;
              const ang = Math.atan2(dy, dx);
              const desiredDist = en.def.attackPattern === 'ranged' ? 175 : en.def.size + 18;
              if (dist > desiredDist) {
                en.x += Math.cos(ang) * en.def.speed * dt;
                en.y += Math.sin(ang) * en.def.speed * dt;
              }

              if (en.attackCooldown <= 0) {
                if (en.def.attackPattern === 'ranged' || (en.def.attackPattern === 'boss_multi' && dist > 110)) {
                  en.attackCooldown = en.def.isBoss ? 1200 : 1750;
                  projectilesRef.current.push({
                    id: `ep_${en.uid}_${now}`,
                    fromPlayer: false,
                    x: en.x,
                    y: en.y,
                    vx: Math.cos(ang) * 320,
                    vy: Math.sin(ang) * 320,
                    damage: en.def.atk,
                    radius: en.def.isBoss ? 10 : 7,
                    color: en.def.primaryColor,
                    lifeMs: 1600,
                    pierce: false,
                  });
                } else if (dist <= en.def.size + 34) {
                  en.attackCooldown = 1100;
                  const shieldMult = now < shieldUntilRef.current ? 0.45 : 1;
                  const dmg = Math.max(1, Math.round((en.def.atk - statsRef.current.def * 0.5) * shieldMult));
                  hpRef.current -= dmg;
                  spawnFloatingText(posRef.current.x, posRef.current.y - 26, `-${dmg}`, '#FB7185');
                }
              }
            } else {
              // Wander gently & stay out of Sanctuary walls
              en.x += Math.cos(en.aiPhase * 0.7) * 22 * dt;
              en.y += Math.sin(en.aiPhase * 0.5) * 22 * dt;
              if (mapDef.hasSanctuaryZone && mapDef.sanctuaryBounds) {
                const sb = mapDef.sanctuaryBounds;
                if (en.x > sb.x - 20 && en.x < sb.x + sb.w + 20 && en.y > sb.y - 20 && en.y < sb.y + sb.h + 20) {
                  en.x += en.x < sb.x + sb.w / 2 ? -90 * dt : 90 * dt;
                }
              }
            }
          }
          en.x = Math.max(60, Math.min(mapDef.width - 60, en.x));
          en.y = Math.max(60, Math.min(mapDef.height - 60, en.y));
        }

        if (defenseRef.current.active && defenseRef.current.coreHp <= 0) {
          defenseRef.current.active = false;
          enemiesRef.current = enemiesRef.current.filter((e) => !e.isDefenseRaider);
          setDefenseNotice({
            title: '拠点防衛失敗…',
            detail: '聖域クリスタルコアが破壊されました。防壁や砲台を増設して再挑戦しましょう。',
            isVictory: false,
          });
        }
      }

      // 4. Projectiles update
      const remainingProjectiles: Projectile[] = [];
      for (const pr of projectilesRef.current) {
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
        pr.lifeMs -= dt * 1000;
        if (pr.lifeMs <= 0) continue;

        let consumed = false;
        if (pr.fromPlayer) {
          for (const en of enemiesRef.current) {
            if (Math.hypot(en.x - pr.x, en.y - pr.y) <= en.def.size + pr.radius) {
              damageEnemy(en, pr.damage, pr.pierce);
              if (!pr.pierce) {
                consumed = true;
                break;
              }
            }
          }
        } else if (!combatProtected) {
          if (Math.hypot(posRef.current.x - pr.x, posRef.current.y - pr.y) <= 18 + pr.radius) {
            const shieldMult = now < shieldUntilRef.current ? 0.45 : 1;
            const dmg = Math.max(1, Math.round((pr.damage - statsRef.current.def * 0.5) * shieldMult));
            hpRef.current -= dmg;
            spawnFloatingText(posRef.current.x, posRef.current.y - 26, `-${dmg}`, '#FB7185');
            consumed = true;
          }
        }
        if (!consumed) remainingProjectiles.push(pr);
      }
      projectilesRef.current = remainingProjectiles;

      // Respawn at Sanctuary if HP reaches 0
      if (hpRef.current <= 0) {
        hpRef.current = statsRef.current.maxHp;
        mpRef.current = statsRef.current.maxMp;
        posRef.current = { x: 1600, y: 1200 };
        if (saveRef.current.currentMapId !== 'emerald_meadow') {
          onWarpToMap('emerald_meadow', 1600, 1200);
        }
        spawnFloatingText(1600, 1160, '聖域へ緊急帰還', '#FDE047');
      }

      // 5. Camera
      const camX = Math.max(0, Math.min(mapDef.width - viewW, posRef.current.x - viewW / 2));
      const camY = Math.max(0, Math.min(mapDef.height - viewH, posRef.current.y - viewH / 2));

      // 6. Render World
      drawWorldBackground(ctx, mapDef, camX, camY, viewW, viewH, now, buildModeRef.current);
      drawWarpGates(ctx, mapDef, camX, camY, now, posRef.current.x, posRef.current.y);

      if (mapDef.id === 'emerald_meadow') {
        // Sanctuary Crystal Core landmark
        const cx = 1600 - camX;
        const cy = 1200 - camY;
        const pulse = 1 + Math.sin(now * 0.005) * 0.12;
        ctx.save();
        if (defenseRef.current.active) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, 46 * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = defenseRef.current.active ? '#10B981' : '#38BDF8';
        ctx.shadowColor = defenseRef.current.active ? '#34D399' : '#38BDF8';
        ctx.shadowBlur = defenseRef.current.active ? 20 : 12;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22 * pulse);
        ctx.lineTo(cx + 15 * pulse, cy);
        ctx.lineTo(cx, cy + 22 * pulse);
        ctx.lineTo(cx - 15 * pulse, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = '700 11px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText('聖域コア', cx, cy - 28);
        ctx.restore();

        for (const st of baseRef.current.structures) {
          drawStructure(ctx, st, camX, camY, now);
        }
      }

      for (const obs of mapDef.obstacles) {
        if (obs.x + 80 >= camX && obs.x - 80 <= camX + viewW && obs.y + 80 >= camY && obs.y - 80 <= camY + viewH) {
          drawObstacle(ctx, obs, camX, camY);
        }
      }

      if (!visitingRef.current) {
        for (const en of enemiesRef.current) {
          if (en.x + 80 >= camX && en.x - 80 <= camX + viewW && en.y + 80 >= camY && en.y - 80 <= camY + viewH) {
            drawEnemySprite(ctx, en.def, en.x, en.y, en.hp, en.hitFlash, camX, camY, now);
          }
        }
      }

      // Remote multiplayer players on same map
      for (const rp of remoteRef.current.values()) {
        if (rp.mapId !== mapDef.id) continue;
        const swingProg = rp.lastAction && now - rp.lastAction.at < 260 ? 1 - (now - rp.lastAction.at) / 260 : 0;
        drawAuthenticCharacter(
          ctx,
          {
            x: rp.x,
            y: rp.y,
            aimAngle: rp.aimAngle,
            isMoving: false,
            playerClass: rp.playerClass,
            hairColor: rp.hairColor,
            armorColor: rp.armorColor,
            weapon: ITEM_BY_ID[rp.weaponId],
            swingProgress: swingProg,
            displayName: rp.displayName,
            level: rp.level,
            hp: rp.hp,
            maxHp: rp.maxHp,
            isSelf: false,
            time: now,
          },
          camX,
          camY,
        );
      }

      // Self Character
      drawAuthenticCharacter(
        ctx,
        {
          x: posRef.current.x,
          y: posRef.current.y,
          aimAngle: aimAngleRef.current,
          isMoving,
          playerClass: profileRef.current.playerClass,
          hairColor: profileRef.current.hairColor,
          armorColor: profileRef.current.armorColor,
          weapon: ITEM_BY_ID[saveRef.current.equippedWeaponId],
          swingProgress: swingRef.current,
          displayName: profileRef.current.displayName,
          level: saveRef.current.level,
          hp: hpRef.current,
          maxHp: statsRef.current.maxHp,
          isSelf: true,
          time: now,
          shieldActive: now < shieldUntilRef.current,
        },
        camX,
        camY,
      );

      // Projectiles & Skill FX
      for (const pr of projectilesRef.current) {
        ctx.save();
        ctx.fillStyle = pr.color;
        ctx.shadowColor = pr.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pr.x - camX, pr.y - camY, pr.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      skillFxRef.current = skillFxRef.current.filter((fx) => now - fx.createdAt < fx.durationMs);
      for (const fx of skillFxRef.current) {
        drawSkillEffect(ctx, fx, camX, camY, now);
      }

      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => now - ft.createdAt < 900);
      for (const ft of floatingTextsRef.current) {
        const age = (now - ft.createdAt) / 900;
        ctx.save();
        ctx.globalAlpha = 1 - age;
        ctx.font = '700 13px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillText(ft.text, ft.x - camX + 1, ft.y - camY - age * 26 + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x - camX, ft.y - camY - age * 26);
        ctx.restore();
      }

      // 7. Throttled HUD & Multiplayer Sync
      hudSyncAccum += dt;
      savePosAccum += dt;
      if (hudSyncAccum >= 0.1) {
        hudSyncAccum = 0;
        setHudHp(Math.round(hpRef.current));
        setHudMp(Math.round(mpRef.current));
        setBossTarget(engagedBoss ? { ...engagedBoss } : null);

        const near =
          mapDef.warpPoints.find((wp) => Math.hypot(wp.x - posRef.current.x, wp.y - posRef.current.y) < 95) || null;
        setNearWarp(near);

        const cds = [0, 1, 2, 3, 4, 5].map((idx) => {
          const skId = saveRef.current.equippedSkills[idx];
          const sk = skId ? SKILL_BY_ID[skId] : null;
          if (!sk) return 0;
          const rem = Math.max(0, (skillCooldownsRef.current[sk.id] || 0) - now);
          return rem / sk.cooldownMs;
        });
        setCooldownPct(cds);

        const defState = defenseRef.current;
        const remainingRaiders = defState.active ? enemiesRef.current.filter((e) => e.isDefenseRaider).length : 0;
        setDefenseHud({
          active: defState.active,
          wave: defState.wave,
          maxWaves: defState.maxWaves,
          coreHp: Math.round(defState.coreHp),
          coreMaxHp: defState.coreMaxHp,
          remaining: remainingRaiders,
        });

        multiplayer?.sendStateUpdate({
          mapId: saveRef.current.currentMapId,
          x: Math.round(posRef.current.x),
          y: Math.round(posRef.current.y),
          aimAngle: Number(aimAngleRef.current.toFixed(2)),
          hp: Math.round(hpRef.current),
          maxHp: statsRef.current.maxHp,
          level: saveRef.current.level,
          weaponId: saveRef.current.equippedWeaponId,
          playerClass: profileRef.current.playerClass,
          hairColor: profileRef.current.hairColor,
          armorColor: profileRef.current.armorColor,
          displayName: profileRef.current.displayName,
        });
      }

      if (savePosAccum >= 4.0) {
        savePosAccum = 0;
        onMoveUpdate(saveRef.current.currentMapId, posRef.current.x, posRef.current.y);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const mapDef = WORLD_MAPS[visitingBase ? 'emerald_meadow' : save.currentMapId];
    const camX = Math.max(0, Math.min(mapDef.width - canvas.width, posRef.current.x - canvas.width / 2));
    const camY = Math.max(0, Math.min(mapDef.height - canvas.height, posRef.current.y - canvas.height / 2));
    aimAngleRef.current = Math.atan2(my + camY - posRef.current.y, mx + camX - posRef.current.x);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (buildMode && !visitingBase && save.currentMapId === 'emerald_meadow') {
      const mapDef = WORLD_MAPS.emerald_meadow;
      const sb = mapDef.sanctuaryBounds!;
      const rect = canvas.getBoundingClientRect();
      const camX = Math.max(0, Math.min(mapDef.width - canvas.width, posRef.current.x - canvas.width / 2));
      const camY = Math.max(0, Math.min(mapDef.height - canvas.height, posRef.current.y - canvas.height / 2));
      const wx = e.clientX - rect.left + camX;
      const wy = e.clientY - rect.top + camY;

      if (wx < sb.x || wx > sb.x + sb.w || wy < sb.y || wy > sb.y + sb.h) {
        spawnFloatingText(wx, wy, '聖域建築エリア外です', '#F87171');
        return;
      }

      const gx = Math.floor(wx / STRUCTURE_GRID_SIZE);
      const gy = Math.floor(wy / STRUCTURE_GRID_SIZE);
      const existing = playerBase.structures.find((s) => s.gx === gx && s.gy === gy);

      if (selectedStructure === 'demolish') {
        if (existing) {
          onRemoveStructure(existing.id);
          soundEngine.playBuild();
        }
        return;
      }

      if (existing) {
        spawnFloatingText(wx, wy, 'すでに建造物があります', '#FBBF24');
        return;
      }

      const def = STRUCTURE_BY_TYPE[selectedStructure];
      const currentCount = playerBase.structures.filter((s) => s.type === selectedStructure).length;
      if (currentCount >= def.maxCount) {
        spawnFloatingText(wx, wy, `上限(${def.maxCount})に達しています`, '#F87171');
        return;
      }
      if (save.gold < def.costGold || save.arcaneDust < def.costDust) {
        spawnFloatingText(wx, wy, 'ゴールドまたは魔導粉塵が不足', '#F87171');
        return;
      }

      onPlaceStructure(
        {
          id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: selectedStructure,
          gx,
          gy,
          level: 1,
        },
        def.costGold,
        def.costDust,
      );
      soundEngine.playBuild();
      return;
    }

    // Check if clicking on a nearby Warp Beacon or Warp Gate
    const mapDef = WORLD_MAPS[visitingBase ? 'emerald_meadow' : save.currentMapId];
    if (nearWarp) {
      setWarpModalPoint(nearWarp);
      return;
    }

    performPrimaryAttack();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    multiplayer?.sendChat(chatInput, save.currentMapId);
    setChatInput('');
  };

  const currentMap = WORLD_MAPS[visitingBase ? 'emerald_meadow' : save.currentMapId];
  const canBuildHere = !visitingBase && save.currentMapId === 'emerald_meadow';

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseMove={handleCanvasMouseMove}
        onClick={handleCanvasClick}
        className={`w-full h-full block ${buildMode ? 'cursor-crosshair' : 'cursor-crosshair'}`}
      />

      {/* Visiting Friend Base Banner */}
      {visitingBase && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-emerald-500/70 rounded-xl px-5 py-2.5 flex items-center gap-4 shadow-xl z-20">
          <div className="text-xs">
            <span className="text-emerald-400 font-bold">{visitingBase.ownerName}</span> の拠点「{visitingBase.baseName}」を訪問中
          </div>
          <button
            type="button"
            onClick={onExitVisitBase}
            className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            自分の冒険へ戻る
          </button>
        </div>
      )}

      {/* Defense Event Active HUD */}
      {defenseHud.active && !visitingBase && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[380px] max-w-[92vw] bg-slate-950/95 border border-emerald-500/70 rounded-xl px-4 py-2.5 z-20 shadow-xl">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              拠点防衛ウェーブ {defenseHud.wave}/{defenseHud.maxWaves} · 残り {defenseHud.remaining}体
            </span>
            <span className="font-mono-num text-slate-200">
              コア {defenseHud.coreHp.toLocaleString()} / {defenseHud.coreMaxHp.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, (defenseHud.coreHp / defenseHud.coreMaxHp) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Defense Result Notice */}
      {defenseNotice && (
        <div
          className={`absolute top-20 left-1/2 -translate-x-1/2 max-w-md w-[92vw] rounded-xl px-4 py-3 border shadow-2xl z-30 flex items-start justify-between gap-3 ${
            defenseNotice.isVictory
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
              : 'bg-rose-950/95 border-rose-500 text-rose-100'
          }`}
        >
          <div className="text-xs space-y-1">
            <div className="font-bold text-sm">{defenseNotice.title}</div>
            <div>{defenseNotice.detail}</div>
          </div>
          <button
            type="button"
            onClick={() => setDefenseNotice(null)}
            className="text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Boss HP Banner */}
      {bossTarget && !visitingBase && (
        <div
          className={`absolute ${
            defenseHud.active ? 'top-20' : 'top-3'
          } left-1/2 -translate-x-1/2 w-[360px] max-w-[90vw] bg-slate-950/90 border border-slate-700 rounded-xl px-4 py-2.5 z-10`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold" style={{ color: RARITY_BY_ID[bossTarget.def.rarity].color }}>
              [{RARITY_BY_ID[bossTarget.def.rarity].label}] {bossTarget.def.name}
            </span>
            <span className="font-mono-num text-slate-300">
              {Math.max(0, bossTarget.hp).toLocaleString()} / {bossTarget.def.maxHp.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, (bossTarget.hp / bossTarget.def.maxHp) * 100))}%`,
                backgroundColor: RARITY_BY_ID[bossTarget.def.rarity].color,
              }}
            />
          </div>
        </div>
      )}

      {/* Top-Left Map Info & Controls Hint */}
      <div className="absolute top-3 left-3 bg-slate-950/85 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs space-y-1.5 pointer-events-auto z-10">
        <div className="flex items-center gap-2 font-bold text-white">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span>{currentMap.name}</span>
          <span className="text-slate-400 font-mono-num">Lv.{currentMap.recommendedLevel}+</span>
        </div>
        <div className="text-slate-400">
          移動: WASD · 攻撃: クリック/Space · スキル: 1-6 · 道具: Z/X/C · ワープ: F
        </div>
        <div className="flex items-center flex-wrap gap-2 pt-0.5">
          <span className="text-emerald-400 font-mono-num">
            {wsConnected ? `オンライン ${onlineCount}人` : 'サーバー接続中...'}
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.muted = !muted;
              setMuted(!muted);
            }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            aria-label="効果音切替"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onOpenDailyBonus}
            className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer ${
              canClaimDaily
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            {canClaimDaily ? 'ログボ受取可' : '日替わりログボ'}
          </button>
          {!visitingBase && canBuildHere && (
            <button
              type="button"
              onClick={defenseHud.active ? cancelDefenseEvent : startDefenseEvent}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer ${
                defenseHud.active
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {defenseHud.active ? '防衛中止' : '拠点防衛開始'}
            </button>
          )}
        </div>
      </div>

      {/* Top-Right Minimap */}
      <div className="absolute top-3 right-3 bg-slate-950/90 border border-slate-800 rounded-xl p-2 z-10 space-y-1.5">
        <div className="relative w-40 h-28 bg-slate-900 rounded border border-slate-800 overflow-hidden">
          {currentMap.hasSanctuaryZone && currentMap.sanctuaryBounds && (
            <div
              className="absolute border border-emerald-500/60 bg-emerald-500/15"
              style={{
                left: `${(currentMap.sanctuaryBounds.x / currentMap.width) * 100}%`,
                top: `${(currentMap.sanctuaryBounds.y / currentMap.height) * 100}%`,
                width: `${(currentMap.sanctuaryBounds.w / currentMap.width) * 100}%`,
                height: `${(currentMap.sanctuaryBounds.h / currentMap.height) * 100}%`,
              }}
            />
          )}
          {currentMap.warpPoints.map((wp) => (
            <div
              key={wp.id}
              title={wp.label}
              className="absolute w-2.5 h-2.5 -ml-1 -mt-1 rounded-full bg-sky-400 border border-white"
              style={{
                left: `${(wp.x / currentMap.width) * 100}%`,
                top: `${(wp.y / currentMap.height) * 100}%`,
              }}
            />
          ))}
          {Array.from(remotePlayers.values())
            .filter((rp) => rp.mapId === currentMap.id)
            .map((rp) => (
              <div
                key={rp.uid}
                className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full bg-cyan-300"
                style={{
                  left: `${(rp.x / currentMap.width) * 100}%`,
                  top: `${(rp.y / currentMap.height) * 100}%`,
                }}
              />
            ))}
          <div
            className="absolute w-2.5 h-2.5 -ml-1 -mt-1 rounded-full bg-amber-400 border border-slate-950"
            style={{
              left: `${(posRef.current.x / currentMap.width) * 100}%`,
              top: `${(posRef.current.y / currentMap.height) * 100}%`,
            }}
          />
        </div>

        <button
          type="button"
          onClick={() =>
            setWarpModalPoint({
              id: 'quick_map_select',
              x: posRef.current.x,
              y: posRef.current.y,
              label: '大陸ワープマップ',
              destinations: WORLD_MAP_LIST.filter((m) => m.id !== save.currentMapId).map((m) => ({
                mapId: m.id,
                spawnX: m.spawnX,
                spawnY: m.spawnY,
                label: `${m.name}（推奨Lv.${m.recommendedLevel}）`,
              })),
            })
          }
          className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 font-semibold cursor-pointer"
        >
          ワープ一覧を開く
        </button>
      </div>

      {/* Near Warp Gate Prompt */}
      {nearWarp && !warpModalPoint && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={() => setWarpModalPoint(nearWarp)}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-lg cursor-pointer"
          >
            [F] {nearWarp.label} を起動して別マップへ移動
          </button>
        </div>
      )}

      {/* Build Mode Toolbar */}
      {buildMode && canBuildHere && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-[94vw] bg-slate-900/95 border border-emerald-500/60 rounded-xl p-3 z-20 space-y-2 shadow-2xl">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Hammer className="w-4 h-4" />
              拠点建築モード — 緑の聖域エリア内のグリッドをクリックして配置（設置数 {playerBase.structures.length}/150）
            </span>
            <div className="flex items-center gap-3 font-mono-num text-slate-300">
              <span>{save.gold.toLocaleString()} G</span>
              <span>粉塵 {save.arcaneDust}</span>
              <button
                type="button"
                onClick={() => onToggleBuildMode(false)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                建築終了 [B]
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {STRUCTURES_CATALOG.map((st) => {
              const active = selectedStructure === st.type;
              return (
                <button
                  key={st.type}
                  type="button"
                  onClick={() => setSelectedStructure(st.type)}
                  title={st.description}
                  className={`px-2.5 py-1.5 rounded-lg border text-left shrink-0 cursor-pointer ${
                    active ? 'border-emerald-400 bg-emerald-950/60' : 'border-slate-700 bg-slate-950/80 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold text-white whitespace-nowrap">{st.name}</div>
                  <div className="text-xs font-mono-num text-amber-300 whitespace-nowrap">
                    {st.costGold}G{st.costDust > 0 ? ` · 粉塵${st.costDust}` : ''}
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedStructure('demolish')}
              className={`px-3 py-2 rounded-lg border text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer ${
                selectedStructure === 'demolish'
                  ? 'border-rose-400 bg-rose-950/70 text-rose-200'
                  : 'border-slate-700 bg-slate-950 text-rose-400'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              撤去
            </button>
          </div>
        </div>
      )}

      {/* Multiplayer Chat Drawer */}
      <div className="absolute bottom-24 left-3 z-20">
        {!chatOpen ? (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-slate-500 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-sky-400" />
            マルチチャット ({chatMessages.length})
          </button>
        ) : (
          <div className="w-80 bg-slate-900/95 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-white">ワールドマルチチャット</span>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-44 overflow-y-auto p-3 space-y-2 text-xs">
              {chatMessages.length === 0 ? (
                <p className="text-slate-500">まだチャットがありません。冒険者に話しかけてみましょう。</p>
              ) : (
                chatMessages.map((m) => (
                  <div key={m.id} className={m.isSystem ? 'text-amber-300' : 'text-slate-200'}>
                    <span className="font-bold text-sky-300">{m.displayName}: </span>
                    <span>{m.text}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendChat} className="p-2 border-t border-slate-800 flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="メッセージを入力..."
                maxLength={180}
                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Tactical Combat HUD */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[96vw] max-w-5xl bg-slate-950/92 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 z-10">
        {/* HP / MP / EXP */}
        <div className="w-56 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono-num">
            <span className="text-emerald-400 font-bold">HP {hudHp}/{stats.maxHp}</span>
            <span className="text-sky-400 font-bold">MP {hudMp}/{stats.maxMp}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, (hudHp / stats.maxHp) * 100))}%` }}
              />
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, (hudMp / stats.maxMp) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* 6 Skill Hotbar */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const skId = save.equippedSkills[idx];
            const sk = skId ? SKILL_BY_ID[skId] : null;
            const cd = cooldownPct[idx] || 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => triggerSkill(idx)}
                title={sk ? `${sk.name} (MP ${sk.mpCost})` : '空きスロット'}
                className="relative w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 flex flex-col items-center justify-center p-1 overflow-hidden cursor-pointer"
              >
                <span className="absolute top-0.5 left-1 text-[10px] font-mono-num text-slate-400">{idx + 1}</span>
                {sk ? (
                  <>
                    <Sparkles className="w-4 h-4" style={{ color: sk.color }} />
                    <span className="text-[9px] text-slate-200 truncate w-full text-center mt-0.5">{sk.name}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-600">空</span>
                )}
                {cd > 0 && (
                  <div
                    className="absolute inset-0 bg-slate-950/75"
                    style={{ transform: `translateY(${(1 - cd) * 100}%)` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 3 Combat Item Slots + Base Build Toggle */}
        <div className="flex items-center gap-1.5">
          {['Z', 'X', 'C'].map((kLabel, idx) => {
            const qId = quickItemIds[idx];
            const it = qId ? ITEM_BY_ID[qId] : null;
            const invQty = save.inventory.find((s) => s.itemId === qId)?.qty || 0;
            return (
              <button
                key={kLabel}
                type="button"
                disabled={!it || invQty <= 0}
                onClick={() => it && invQty > 0 && triggerCombatItem(it)}
                title={it ? it.name : 'アイテム未セット'}
                className="relative w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 disabled:opacity-45 flex flex-col items-center justify-center p-1 cursor-pointer"
              >
                <span className="absolute top-0.5 left-1 text-[10px] font-mono-num text-amber-300">{kLabel}</span>
                {it ? (
                  <>
                    <Shield className="w-4 h-4" style={{ color: RARITY_BY_ID[it.rarity].color }} />
                    <span className="text-[9px] font-mono-num text-slate-200">x{invQty}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-600">-</span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              if (!canBuildHere) {
                onWarpToMap('emerald_meadow', 1600, 1200);
                onToggleBuildMode(true);
              } else {
                onToggleBuildMode(!buildMode);
              }
            }}
            className={`h-12 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              buildMode
                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                : 'bg-slate-900 border-slate-700 hover:border-emerald-400 text-emerald-300'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="whitespace-nowrap">{canBuildHere ? '拠点建築 [B]' : '拠点へ帰還'}</span>
          </button>
        </div>
      </div>

      {/* Warp Destination Modal */}
      {warpModalPoint && (
        <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-30">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{warpModalPoint.label}</h3>
              <button
                type="button"
                onClick={() => setWarpModalPoint(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              転移先のマップを選択してください。高難度マップほど高レアリティの敵が出現します。
            </p>
            <div className="space-y-2">
              {warpModalPoint.destinations.map((dest) => {
                const m = WORLD_MAPS[dest.mapId];
                return (
                  <button
                    key={`${dest.mapId}_${dest.label}`}
                    type="button"
                    onClick={() => {
                      soundEngine.playWarp();
                      onWarpToMap(dest.mapId, dest.spawnX, dest.spawnY);
                      setWarpModalPoint(null);
                    }}
                    className="w-full p-3.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-400 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-sky-300">{dest.label}</span>
                      <span className="text-xs font-mono-num text-amber-300">
                        {RARITY_BY_ID[m.minRarity].label} 〜 {RARITY_BY_ID[m.maxRarity].label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{m.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
