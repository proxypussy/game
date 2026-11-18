import { STRUCTURE_BY_TYPE, STRUCTURE_GRID_SIZE } from './mapsCatalog';
import {
  EnemyDefinition,
  ItemDefinition,
  MapObstacle,
  PlacedStructure,
  PlayerClassId,
  RARITY_BY_ID,
  SkillPattern,
  WorldMapDefinition,
} from './types';

export function drawWorldBackground(
  ctx: CanvasRenderingContext2D,
  map: WorldMapDefinition,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  time: number,
  buildMode: boolean,
) {
  // Base ground fill
  ctx.fillStyle = map.groundBase;
  ctx.fillRect(0, 0, viewW, viewH);

  // Subtle terrain tile grid & biome patches
  const tileSize = 96;
  const startCol = Math.max(0, Math.floor(camX / tileSize));
  const endCol = Math.min(Math.ceil(map.width / tileSize), Math.ceil((camX + viewW) / tileSize));
  const startRow = Math.max(0, Math.floor(camY / tileSize));
  const endRow = Math.min(Math.ceil(map.height / tileSize), Math.ceil((camY + viewH) / tileSize));

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const hash = ((c * 73856093) ^ (r * 19349663)) & 0xff;
      const sx = c * tileSize - camX;
      const sy = r * tileSize - camY;
      if (hash % 3 === 0) {
        ctx.fillStyle = map.groundAccent;
        ctx.fillRect(sx, sy, tileSize, tileSize);
      }
      if (hash % 11 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.arc(sx + (hash % 60) + 18, sy + ((hash >> 2) % 60) + 18, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Flowing river / lava / astral stream across the map
  ctx.save();
  ctx.strokeStyle = map.riverColor;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 64;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let wx = 0; wx <= map.width; wx += 120) {
    const wy = map.height * 0.28 + Math.sin(wx * 0.0025 + 1.2) * 180;
    if (wx === 0) ctx.moveTo(wx - camX, wy - camY);
    else ctx.lineTo(wx - camX, wy - camY);
  }
  ctx.stroke();

  // Animated shimmer line inside river
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.setLineDash([28, 36]);
  ctx.lineDashOffset = -time * 0.05;
  ctx.stroke();
  ctx.restore();

  // Sanctuary Building Zone highlight
  if (map.hasSanctuaryZone && map.sanctuaryBounds) {
    const sb = map.sanctuaryBounds;
    const sx = sb.x - camX;
    const sy = sb.y - camY;

    ctx.save();
    ctx.fillStyle = buildMode ? 'rgba(16, 185, 129, 0.09)' : 'rgba(16, 185, 129, 0.035)';
    ctx.fillRect(sx, sy, sb.w, sb.h);

    ctx.strokeStyle = buildMode ? '#34D399' : 'rgba(52, 211, 153, 0.35)';
    ctx.lineWidth = buildMode ? 2.5 : 1.5;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(sx, sy, sb.w, sb.h);
    ctx.setLineDash([]);

    if (buildMode) {
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.16)';
      ctx.lineWidth = 1;
      for (let gx = sb.x; gx <= sb.x + sb.w; gx += STRUCTURE_GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(gx - camX, sy);
        ctx.lineTo(gx - camX, sy + sb.h);
        ctx.stroke();
      }
      for (let gy = sb.y; gy <= sb.y + sb.h; gy += STRUCTURE_GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(sx, gy - camY);
        ctx.lineTo(sx + sb.w, gy - camY);
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(167, 243, 208, 0.7)';
    ctx.font = '600 12px "Noto Sans JP", sans-serif';
    ctx.fillText('聖域拠点建築エリア（セーフゾーン）', sx + 12, sy + 22);
    ctx.restore();
  }

  // World Border
  ctx.strokeStyle = 'rgba(248, 113, 113, 0.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(-camX, -camY, map.width, map.height);
}

export function drawWarpGates(
  ctx: CanvasRenderingContext2D,
  map: WorldMapDefinition,
  camX: number,
  camY: number,
  time: number,
  playerX: number,
  playerY: number,
) {
  for (const wp of map.warpPoints) {
    const sx = wp.x - camX;
    const sy = wp.y - camY;
    const dist = Math.hypot(playerX - wp.x, playerY - wp.y);
    const near = dist < 95;

    ctx.save();
    ctx.translate(sx, sy);

    // Outer rune ring
    const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, 56);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.75)');
    grad.addColorStop(0.6, 'rgba(99, 102, 241, 0.25)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(time * 0.0012);
    ctx.strokeStyle = near ? '#FDE047' : '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-time * 0.0024);
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    // Label
    ctx.save();
    ctx.font = '700 12px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(sx - 92, sy - 64, 184, 22);
    ctx.fillStyle = near ? '#FDE047' : '#BAE6FD';
    ctx.fillText(near ? `[F] ${wp.label}` : wp.label, sx, sy - 49);
    ctx.restore();
  }
}

export function drawObstacle(ctx: CanvasRenderingContext2D, obs: MapObstacle, camX: number, camY: number) {
  const sx = obs.x - camX;
  const sy = obs.y - camY;
  const r = obs.radius;

  ctx.save();
  ctx.translate(sx, sy);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.65, r * 0.9, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  if (obs.kind === 'tree') {
    ctx.fillStyle = '#451A03';
    ctx.fillRect(-r * 0.22, -r * 0.1, r * 0.44, r * 0.75);
    ctx.fillStyle = '#14532D';
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.55, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
  } else if (obs.kind === 'crystal') {
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.25);
    ctx.lineTo(r * 0.65, 0);
    ctx.lineTo(0, r * 0.6);
    ctx.lineTo(-r * 0.65, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7DD3FC';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.25);
    ctx.lineTo(r * 0.22, 0);
    ctx.lineTo(0, r * 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (obs.kind === 'pillar' || obs.kind === 'ruin') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(-r * 0.55, -r * 0.9, r * 1.1, r * 1.4);
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.strokeRect(-r * 0.55, -r * 0.9, r * 1.1, r * 1.4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-r * 0.7, -r * 1.05, r * 1.4, r * 0.28);
  } else {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(-r * 0.22, -r * 0.22, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawStructure(
  ctx: CanvasRenderingContext2D,
  st: PlacedStructure,
  camX: number,
  camY: number,
  time: number,
) {
  const def = STRUCTURE_BY_TYPE[st.type];
  if (!def) return;
  const cx = st.gx * STRUCTURE_GRID_SIZE + STRUCTURE_GRID_SIZE / 2 - camX;
  const cy = st.gy * STRUCTURE_GRID_SIZE + STRUCTURE_GRID_SIZE / 2 - camY;
  const s = STRUCTURE_GRID_SIZE - 4;

  ctx.save();
  ctx.translate(cx, cy);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-s / 2 + 2, -s / 2 + 5, s, s);

  // Base block
  ctx.fillStyle = def.color;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = def.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(-s / 2, -s / 2, s, s);

  if (st.type === 'forge') {
    // Glowing anvil/furnace
    const pulse = 0.6 + Math.sin(time * 0.008) * 0.35;
    ctx.fillStyle = `rgba(245, 158, 11, ${pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(-6, -3, 12, 6);
  } else if (st.type === 'healing_fountain') {
    const r = 12 + Math.sin(time * 0.006) * 3;
    ctx.strokeStyle = '#6EE7B7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#34D399';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.type === 'turret_bolt' || st.type === 'turret_arcane') {
    ctx.rotate(time * 0.0018);
    ctx.fillStyle = def.accent;
    ctx.fillRect(-3, -18, 6, 22);
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.type === 'library') {
    ctx.fillStyle = '#C7D2FE';
    ctx.fillRect(-10, -8, 8, 16);
    ctx.fillRect(2, -8, 8, 16);
  } else if (st.type === 'warp_beacon') {
    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
  } else if (st.type === 'crystal_lamp') {
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
    glow.addColorStop(0, 'rgba(94, 234, 212, 0.7)');
    glow.addColorStop(1, 'rgba(94, 234, 212, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.type === 'banner') {
    ctx.fillStyle = def.accent;
    ctx.beginPath();
    ctx.moveTo(-7, -14);
    ctx.lineTo(7, -14);
    ctx.lineTo(7, 10);
    ctx.lineTo(0, 16);
    ctx.lineTo(-7, 10);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export interface CharacterRenderParams {
  x: number;
  y: number;
  aimAngle: number;
  isMoving: boolean;
  playerClass: PlayerClassId;
  hairColor: string;
  armorColor: string;
  weapon?: ItemDefinition;
  swingProgress: number; // 0 = idle, >0..1 = attacking
  displayName: string;
  level: number;
  hp: number;
  maxHp: number;
  isSelf: boolean;
  time: number;
  shieldActive?: boolean;
}

export function drawAuthenticCharacter(
  ctx: CanvasRenderingContext2D,
  p: CharacterRenderParams,
  camX: number,
  camY: number,
) {
  const sx = p.x - camX;
  const sy = p.y - camY;
  const stride = p.isMoving ? Math.sin(p.time * 0.015) * 6 : 0;
  const weaponRarityColor = p.weapon ? RARITY_BY_ID[p.weapon.rarity].color : '#94A3B8';

  ctx.save();
  ctx.translate(sx, sy);

  // Shield aura if active
  if (p.shieldActive) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -4, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flowing cloak / wings behind body
  const sway = Math.sin(p.time * 0.008) * (p.isMoving ? 5 : 2);
  if (p.playerClass === 'astral_valkyrie') {
    // Golden Valkyrie Wings
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 1.2;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * 6, -8);
      ctx.quadraticCurveTo(dir * 28, -22 + sway, dir * 32, -4);
      ctx.quadraticCurveTo(dir * 20, 4, dir * 6, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Flowing mantle/cape
    ctx.fillStyle = p.armorColor;
    ctx.beginPath();
    ctx.moveTo(-11, -6);
    ctx.lineTo(11, -6);
    ctx.lineTo(14 + sway * 0.5, 16);
    ctx.lineTo(-14 + sway * 0.5, 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Articulated boots / legs
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(-8, 7 + stride * 0.5, 6, 10);
  ctx.fillRect(2, 7 - stride * 0.5, 6, 10);

  // Armored torso + belt + class trim
  ctx.fillStyle = p.armorColor;
  ctx.beginPath();
  ctx.roundRect(-11, -10, 22, 20, 5);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Belt & gold clasp
  ctx.fillStyle = '#451A03';
  ctx.fillRect(-11, 3, 22, 4);
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(-3, 2.5, 6, 5);

  // Pauldrons (shoulders)
  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.arc(-12, -7, 5, 0, Math.PI * 2);
  ctx.arc(12, -7, 5, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#FDE68A'; // warm skin
  ctx.beginPath();
  ctx.arc(0, -18, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Eyes looking toward aim direction
  const lookX = Math.cos(p.aimAngle) * 3;
  const lookY = Math.sin(p.aimAngle) * 1.5;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-3.5 + lookX, -17.5 + lookY, 1.5, 0, Math.PI * 2);
  ctx.arc(3.5 + lookX, -17.5 + lookY, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Hair & Class Headgear
  ctx.fillStyle = p.hairColor;
  ctx.beginPath();
  ctx.arc(0, -20.5, 11, Math.PI, Math.PI * 2);
  ctx.lineTo(11, -15);
  ctx.lineTo(6, -18);
  ctx.lineTo(0, -16);
  ctx.lineTo(-6, -18);
  ctx.lineTo(-11, -15);
  ctx.closePath();
  ctx.fill();

  if (p.playerClass === 'shadow_ranger') {
    // Hood
    ctx.fillStyle = p.armorColor;
    ctx.beginPath();
    ctx.arc(0, -19.5, 12.2, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
  } else if (p.playerClass === 'arcane_mage') {
    // Glowing Sapphire Circlet
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -21, 9, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(0, -28, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.playerClass === 'blade_knight') {
    // Knight crest
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-2, -31, 4, 7);
  }

  // Equipped Weapon rendered dynamically along aimAngle!
  ctx.save();
  const swingOffset = p.swingProgress > 0 ? Math.sin(p.swingProgress * Math.PI) * 1.35 : 0;
  ctx.rotate(p.aimAngle + swingOffset - 0.35);

  const style = p.weapon?.visualStyle ?? 'sword';
  ctx.shadowColor = weaponRarityColor;
  ctx.shadowBlur = 10;

  if (style === 'staff') {
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(36, 0);
    ctx.stroke();
    ctx.fillStyle = weaponRarityColor;
    ctx.beginPath();
    ctx.arc(38, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'daggers') {
    ctx.fillStyle = weaponRarityColor;
    ctx.beginPath();
    ctx.moveTo(12, -5);
    ctx.lineTo(28, -7);
    ctx.lineTo(14, -2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 5);
    ctx.lineTo(28, 7);
    ctx.lineTo(14, 2);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'spear') {
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(42, 0);
    ctx.stroke();
    ctx.fillStyle = weaponRarityColor;
    ctx.beginPath();
    ctx.moveTo(48, 0);
    ctx.lineTo(36, -5);
    ctx.lineTo(36, 5);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'bow') {
    ctx.strokeStyle = weaponRarityColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(14, 0, 14, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
  } else {
    // Sword / Greatsword
    const len = style === 'greatsword' ? 38 : 30;
    const width = style === 'greatsword' ? 5.5 : 3.8;
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(10, -6, 4, 12); // crossguard
    ctx.fillStyle = weaponRarityColor;
    ctx.fillRect(14, -width / 2, len - 14, width);
    ctx.beginPath();
    ctx.moveTo(len, -width / 2);
    ctx.lineTo(len + 7, 0);
    ctx.lineTo(len, width / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Swing arc slash FX
  if (p.swingProgress > 0 && p.swingProgress < 0.7) {
    ctx.save();
    ctx.rotate(p.aimAngle);
    ctx.strokeStyle = weaponRarityColor;
    ctx.globalAlpha = 1 - p.swingProgress / 0.7;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 44, -0.9, 0.9);
    ctx.stroke();
    ctx.restore();
  }

  // Nameplate & HP bar
  ctx.font = '600 11px "Noto Sans JP", sans-serif';
  ctx.textAlign = 'center';
  const label = `Lv.${p.level} ${p.displayName}`;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  const tw = ctx.measureText(label).width + 12;
  ctx.fillRect(-tw / 2, -46, tw, 16);
  ctx.fillStyle = p.isSelf ? '#FDE047' : '#38BDF8';
  ctx.fillText(label, 0, -34);

  if (!p.isSelf) {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-18, -28, 36, 4);
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(-18, -28, Math.max(0, 36 * (p.hp / Math.max(1, p.maxHp))), 4);
  }

  ctx.restore();
}

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  def: EnemyDefinition,
  x: number,
  y: number,
  hp: number,
  hitFlash: number,
  camX: number,
  camY: number,
  time: number,
) {
  const sx = x - camX;
  const sy = y - camY;
  const r = def.size;
  const rarityMeta = RARITY_BY_ID[def.rarity];
  const rank = rarityMeta.rank;
  const bob = Math.sin(time * 0.006 + def.index) * 3;

  ctx.save();
  ctx.translate(sx, sy);

  // Rarity Aura for Rare+
  if (rank >= 2) {
    ctx.save();
    ctx.strokeStyle = rarityMeta.color;
    ctx.globalAlpha = 0.35 + Math.sin(time * 0.005) * 0.15;
    ctx.lineWidth = rank >= 6 ? 3 : 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, r + 8 + rank * 0.8, 0, Math.PI * 2);
    ctx.stroke();

    // Orbiting runes/stars for Astral, Infinity, Secret
    if (rank >= 7) {
      const orbs = rank === 9 ? 5 : rank === 8 ? 4 : 3;
      for (let i = 0; i < orbs; i++) {
        const ang = time * 0.0025 + (i * Math.PI * 2) / orbs;
        ctx.fillStyle = rank === 9 ? '#FDE047' : rarityMeta.color;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * (r + 14), Math.sin(ang) * (r + 14), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.78, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const fillMain = hitFlash > 0 ? '#FFFFFF' : def.primaryColor;
  const fillAccent = hitFlash > 0 ? '#FFFFFF' : def.accentColor;

  ctx.translate(0, bob);

  if (def.archetype === 'slime') {
    ctx.fillStyle = fillMain;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(r * 0.95, r * 0.65, 0, r * 0.65);
    ctx.quadraticCurveTo(-r * 0.95, r * 0.65, -r * 0.9, 0);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.1, 2.5, 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (def.archetype === 'dragon' || def.archetype === 'seraph') {
    // Wings
    ctx.fillStyle = fillAccent;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.2);
    ctx.lineTo(-r * 1.45, -r * 0.9);
    ctx.lineTo(-r * 1.1, r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.2);
    ctx.lineTo(r * 1.45, -r * 0.9);
    ctx.lineTo(r * 1.1, r * 0.3);
    ctx.closePath();
    ctx.fill();

    // Core body + horns
    ctx.fillStyle = fillMain;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.6);
    ctx.lineTo(-r * 0.65, -r * 1.25);
    ctx.lineTo(-r * 0.15, -r * 0.75);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.6);
    ctx.lineTo(r * 0.65, -r * 1.25);
    ctx.lineTo(r * 0.15, -r * 0.75);
    ctx.fill();
  } else if (def.archetype === 'golem') {
    ctx.fillStyle = fillMain;
    ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.65);
    ctx.strokeStyle = fillAccent;
    ctx.lineWidth = 3;
    ctx.strokeRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.65);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-r * 0.4, -r * 0.35, r * 0.8, 5);
  } else if (def.archetype === 'mage' || def.archetype === 'wraith') {
    ctx.fillStyle = fillMain;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.85, r * 0.75);
    ctx.lineTo(0, r * 0.5);
    ctx.lineTo(-r * 0.85, r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.2, 2.5, 0, Math.PI * 2);
    ctx.arc(r * 0.25, -r * 0.2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Beast / Warrior
    ctx.fillStyle = fillMain;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = fillAccent;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Ears / Horns
    ctx.fillStyle = fillAccent;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.45);
    ctx.lineTo(-r * 0.8, -r * 1.05);
    ctx.lineTo(-r * 0.2, -r * 0.7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 0.45);
    ctx.lineTo(r * 0.8, -r * 1.05);
    ctx.lineTo(r * 0.2, -r * 0.7);
    ctx.fill();
    // Glowing eyes
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.1, 2.8, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.1, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boss crown
  if (def.isBoss) {
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.moveTo(-10, -r - 4);
    ctx.lineTo(-12, -r - 15);
    ctx.lineTo(-4, -r - 9);
    ctx.lineTo(0, -r - 18);
    ctx.lineTo(4, -r - 9);
    ctx.lineTo(12, -r - 15);
    ctx.lineTo(10, -r - 4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  // Enemy HP Bar + Rarity Text
  ctx.save();
  const barW = Math.max(42, r * 2.1);
  const hpPct = Math.max(0, Math.min(1, hp / def.maxHp));
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.fillRect(sx - barW / 2 - 1, sy - r - 24, barW + 2, 7);
  ctx.fillStyle = rarityMeta.color;
  ctx.fillRect(sx - barW / 2, sy - r - 23, barW * hpPct, 5);

  ctx.font = '600 11px "Noto Sans JP", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = rarityMeta.color;
  ctx.fillText(`[${rarityMeta.label}] ${def.name}`, sx, sy - r - 30);
  ctx.restore();
}

export interface ActiveSkillVisual {
  id: string;
  pattern: SkillPattern;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  radius: number;
  createdAt: number;
  durationMs: number;
}

export function drawSkillEffect(
  ctx: CanvasRenderingContext2D,
  fx: ActiveSkillVisual,
  camX: number,
  camY: number,
  now: number,
) {
  const t = Math.min(1, (now - fx.createdAt) / fx.durationMs);
  const alpha = 1 - t;
  const sx = fx.x - camX;
  const sy = fx.y - camY;
  const tx = fx.targetX - camX;
  const ty = fx.targetY - camY;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = fx.color;
  ctx.fillStyle = fx.color;

  if (fx.pattern === 'nova' || fx.pattern === 'shield' || fx.pattern === 'heal') {
    const r = fx.radius * (0.35 + t * 0.75);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.22;
    ctx.fill();
  } else if (fx.pattern === 'slash' || fx.pattern === 'dash') {
    ctx.translate(sx, sy);
    ctx.rotate(fx.angle);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, fx.radius * 0.85, -1.05, 1.05);
    ctx.stroke();
  } else if (fx.pattern === 'beam') {
    ctx.lineWidth = 14 * (1 - t * 0.6);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4 * (1 - t * 0.6);
    ctx.stroke();
  } else if (fx.pattern === 'meteor') {
    const r = fx.radius * (0.2 + t * 0.9);
    ctx.globalAlpha = alpha * 0.35;
    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    // projectile trail
    const cx = sx + (tx - sx) * t;
    const cy = sy + (ty - sy) * t;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
