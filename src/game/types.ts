export type RarityId =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'arcane'
  | 'astral'
  | 'infinity'
  | 'secret';

export interface RarityMeta {
  id: RarityId;
  rank: number;
  label: string;
  enLabel: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  glowColor: string;
  powerMultiplier: number;
  scoreValue: number;
  synthesisRateToNext: number; // % chance (0..100) to upgrade 3 of this tier -> next tier
}

export const RARITIES: RarityMeta[] = [
  {
    id: 'common',
    rank: 0,
    label: 'コモン',
    enLabel: 'Common',
    color: '#94A3B8',
    bgClass: 'bg-slate-800/70',
    textClass: 'text-slate-300',
    borderClass: 'border-slate-600/70',
    glowColor: 'rgba(148,163,184,0.35)',
    powerMultiplier: 1.0,
    scoreValue: 1,
    synthesisRateToNext: 95,
  },
  {
    id: 'uncommon',
    rank: 1,
    label: 'アンコモン',
    enLabel: 'Uncommon',
    color: '#22C55E',
    bgClass: 'bg-emerald-950/60',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-600/60',
    glowColor: 'rgba(34,197,94,0.4)',
    powerMultiplier: 1.45,
    scoreValue: 3,
    synthesisRateToNext: 85,
  },
  {
    id: 'rare',
    rank: 2,
    label: 'レア',
    enLabel: 'Rare',
    color: '#3B82F6',
    bgClass: 'bg-blue-950/60',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/60',
    glowColor: 'rgba(59,130,246,0.45)',
    powerMultiplier: 2.1,
    scoreValue: 8,
    synthesisRateToNext: 72,
  },
  {
    id: 'epic',
    rank: 3,
    label: 'エピック',
    enLabel: 'Epic',
    color: '#A855F7',
    bgClass: 'bg-purple-950/60',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/60',
    glowColor: 'rgba(168,85,247,0.5)',
    powerMultiplier: 3.1,
    scoreValue: 20,
    synthesisRateToNext: 58,
  },
  {
    id: 'legendary',
    rank: 4,
    label: 'レジェンダリー',
    enLabel: 'Legendary',
    color: '#F59E0B',
    bgClass: 'bg-amber-950/60',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/60',
    glowColor: 'rgba(245,158,11,0.55)',
    powerMultiplier: 4.8,
    scoreValue: 50,
    synthesisRateToNext: 45,
  },
  {
    id: 'mythic',
    rank: 5,
    label: 'ミシック',
    enLabel: 'Mythic',
    color: '#EF4444',
    bgClass: 'bg-rose-950/60',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/60',
    glowColor: 'rgba(239,68,68,0.6)',
    powerMultiplier: 7.4,
    scoreValue: 120,
    synthesisRateToNext: 33,
  },
  {
    id: 'arcane',
    rank: 6,
    label: 'アーケイン',
    enLabel: 'Arcane',
    color: '#06B6D4',
    bgClass: 'bg-cyan-950/60',
    textClass: 'text-cyan-300',
    borderClass: 'border-cyan-400/60',
    glowColor: 'rgba(6,182,212,0.65)',
    powerMultiplier: 11.5,
    scoreValue: 300,
    synthesisRateToNext: 22,
  },
  {
    id: 'astral',
    rank: 7,
    label: 'アストラル',
    enLabel: 'Astral',
    color: '#818CF8',
    bgClass: 'bg-indigo-950/60',
    textClass: 'text-indigo-300',
    borderClass: 'border-indigo-400/70',
    glowColor: 'rgba(129,140,248,0.7)',
    powerMultiplier: 18.0,
    scoreValue: 750,
    synthesisRateToNext: 14,
  },
  {
    id: 'infinity',
    rank: 8,
    label: 'インフィニティ',
    enLabel: 'Infinity',
    color: '#F472B6',
    bgClass: 'bg-fuchsia-950/60',
    textClass: 'text-pink-300',
    borderClass: 'border-pink-400/70',
    glowColor: 'rgba(244,114,182,0.75)',
    powerMultiplier: 28.0,
    scoreValue: 1800,
    synthesisRateToNext: 7,
  },
  {
    id: 'secret',
    rank: 9,
    label: 'シークレット',
    enLabel: 'Secret',
    color: '#FDE047',
    bgClass: 'bg-yellow-950/60',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-400/80',
    glowColor: 'rgba(253,224,71,0.85)',
    powerMultiplier: 45.0,
    scoreValue: 5000,
    synthesisRateToNext: 0,
  },
];

export const RARITY_BY_ID: Record<RarityId, RarityMeta> = RARITIES.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<RarityId, RarityMeta>,
);

export type PlayerClassId = 'blade_knight' | 'arcane_mage' | 'shadow_ranger' | 'astral_valkyrie';

export interface PlayerClassMeta {
  id: PlayerClassId;
  name: string;
  role: string;
  description: string;
  portraitUrl: string;
  defaultHairColor: string;
  defaultArmorColor: string;
  baseHp: number;
  baseMp: number;
  baseAtk: number;
  baseDef: number;
  baseSpeed: number;
  starterWeaponId: string;
  starterSkillIds: string[];
}

export const PLAYER_CLASSES: Record<PlayerClassId, PlayerClassMeta> = {
  blade_knight: {
    id: 'blade_knight',
    name: 'ブレイドナイト',
    role: '前衛剣士・重装突破',
    description: '強靭な装甲とルーン大剣による斬撃で敵陣を切り裂く正統派の騎士。',
    portraitUrl: '/src/assets/images/class_blade_knight_1794995265534.jpg',
    defaultHairColor: '#1E293B',
    defaultArmorColor: '#991B1B',
    baseHp: 220,
    baseMp: 90,
    baseAtk: 24,
    baseDef: 14,
    baseSpeed: 215,
    starterWeaponId: 'wp_common_01',
    starterSkillIds: ['sk_common_01', 'sk_common_02', 'sk_common_21'],
  },
  arcane_mage: {
    id: 'arcane_mage',
    name: 'アークメイジ',
    role: '遠距離魔導・広範囲殲滅',
    description: '星晶の杖を操り、炎・氷・雷・星辰の広範囲魔術を解き放つ賢者。',
    portraitUrl: '/src/assets/images/class_arcane_mage_1794995265790.jpg',
    defaultHairColor: '#E2E8F0',
    defaultArmorColor: '#312E81',
    baseHp: 165,
    baseMp: 160,
    baseAtk: 28,
    baseDef: 8,
    baseSpeed: 210,
    starterWeaponId: 'wp_common_02',
    starterSkillIds: ['sk_common_06', 'sk_common_11', 'sk_common_26'],
  },
  shadow_ranger: {
    id: 'shadow_ranger',
    name: 'シャドウレンジャー',
    role: '高機動・会心連撃',
    description: '漆黒のフードと双剣を纏い、疾風のような移動速度と高会心率で戦う狩人。',
    portraitUrl: '/src/assets/images/class_shadow_ranger_1794995266811.jpg',
    defaultHairColor: '#451A03',
    defaultArmorColor: '#065F46',
    baseHp: 185,
    baseMp: 115,
    baseAtk: 26,
    baseDef: 10,
    baseSpeed: 250,
    starterWeaponId: 'wp_common_03',
    starterSkillIds: ['sk_common_03', 'sk_common_16', 'sk_common_31'],
  },
  astral_valkyrie: {
    id: 'astral_valkyrie',
    name: 'アストラルヴァルキリー',
    role: '万能型・聖域守護',
    description: '光翼の鎧と聖槍を携え、攻撃・回復・結界支援を自在にこなす戦乙女。',
    portraitUrl: '/src/assets/images/class_astral_valkyrie_1794995266851.jpg',
    defaultHairColor: '#DDD6FE',
    defaultArmorColor: '#6D28D9',
    baseHp: 205,
    baseMp: 130,
    baseAtk: 25,
    baseDef: 12,
    baseSpeed: 230,
    starterWeaponId: 'wp_common_04',
    starterSkillIds: ['sk_common_04', 'sk_common_21', 'sk_common_36'],
  },
};

export type SkillElement = 'slash' | 'fire' | 'ice' | 'lightning' | 'holy' | 'shadow' | 'astral' | 'nature';
export type SkillPattern = 'slash' | 'projectile' | 'nova' | 'beam' | 'heal' | 'shield' | 'dash' | 'meteor';

export interface SkillDefinition {
  id: string;
  name: string;
  rarity: RarityId;
  element: SkillElement;
  pattern: SkillPattern;
  mpCost: number;
  cooldownMs: number;
  powerMult: number;
  range: number;
  aoeRadius: number;
  color: string;
  description: string;
}

export type ItemCategory = 'weapon' | 'armor' | 'helm' | 'accessory' | 'consumable';

export interface ItemDefinition {
  id: string;
  name: string;
  rarity: RarityId;
  category: ItemCategory;
  atkBonus: number;
  defBonus: number;
  hpBonus: number;
  mpBonus: number;
  spdBonus: number;
  critBonus: number;
  // Usable in combat (consumables AND special active relics/weapons):
  usableInCombat: boolean;
  healHp: number;
  healMp: number;
  combatDamage: number;
  combatRadius: number;
  cooldownMs: number;
  visualStyle: 'sword' | 'greatsword' | 'staff' | 'daggers' | 'spear' | 'bow' | 'plate' | 'helm' | 'ring' | 'potion' | 'bomb' | 'scroll';
  description: string;
}

export type EnemyArchetype = 'slime' | 'beast' | 'warrior' | 'mage' | 'dragon' | 'golem' | 'wraith' | 'seraph';
export type EnemyAttackPattern = 'melee' | 'ranged' | 'charge' | 'aoe' | 'boss_multi';

export interface EnemyDefinition {
  id: string;
  index: number; // 1..150
  name: string;
  rarity: RarityId;
  mapId: MapId;
  archetype: EnemyArchetype;
  element: SkillElement;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  size: number;
  aggroRange: number;
  attackPattern: EnemyAttackPattern;
  expReward: number;
  goldReward: number;
  primaryColor: string;
  accentColor: string;
  isBoss: boolean;
  lore: string;
}

export type MapId =
  | 'emerald_meadow'
  | 'azure_whisperwood'
  | 'crimson_caldera'
  | 'frostpeak_tundra'
  | 'arcane_sanctum'
  | 'infinity_abyss';

export interface WarpPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  destinations: {
    mapId: MapId;
    spawnX: number;
    spawnY: number;
    label: string;
  }[];
}

export interface MapObstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: 'tree' | 'rock' | 'pillar' | 'crystal' | 'ruin';
}

export interface WorldMapDefinition {
  id: MapId;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  groundBase: string;
  groundAccent: string;
  riverColor: string;
  recommendedLevel: number;
  minRarity: RarityId;
  maxRarity: RarityId;
  hasSanctuaryZone: boolean;
  sanctuaryBounds?: { x: number; y: number; w: number; h: number };
  spawnX: number;
  spawnY: number;
  warpPoints: WarpPoint[];
  obstacles: MapObstacle[];
}

export type StructureType =
  | 'wood_wall'
  | 'stone_wall'
  | 'arcane_barrier'
  | 'forge'
  | 'library'
  | 'healing_fountain'
  | 'turret_bolt'
  | 'turret_arcane'
  | 'storage_chest'
  | 'warp_beacon'
  | 'banner'
  | 'crystal_lamp';

export interface StructureDefinition {
  type: StructureType;
  name: string;
  costGold: number;
  costDust: number;
  color: string;
  accent: string;
  description: string;
  maxCount: number;
}

export interface PlacedStructure {
  id: string;
  type: StructureType;
  gx: number; // grid col
  gy: number; // grid row
  level: number;
}

export interface InventoryStack {
  itemId: string;
  qty: number;
}

export interface OwnedSkillStack {
  skillId: string;
  qty: number;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  friendCode: string;
  playerClass: PlayerClassId;
  hairColor: string;
  armorColor: string;
  bio?: string;
  level: number;
  combatPower: number;
  enemiesDefeated: number;
  bestiaryCount: number;
  rarityScore: number;
  currentMapId: MapId;
  isPublic: boolean;
}

export interface PlayerSave {
  uid: string;
  level: number;
  exp: number;
  gold: number;
  arcaneDust: number;
  currentMapId: MapId;
  posX: number;
  posY: number;
  equippedWeaponId: string;
  equippedArmorId: string;
  equippedHelmId: string;
  equippedAccessoryId: string;
  equippedSkills: string[];
  inventory: InventoryStack[];
  ownedSkills: OwnedSkillStack[];
  discoveredEnemies: string[];
  enemiesDefeated: number;
  bossesDefeated: number;
  synthesesAttempted: number;
  synthesesSucceeded: number;
  lastDailyBonusDate?: string;
  loginStreak?: number;
  defenseWavesCleared?: number;
}

export interface DailyBonusReward {
  day: number;
  label: string;
  gold: number;
  arcaneDust: number;
  itemRarity?: RarityId;
  skillRarity?: RarityId;
  bonusPotionQty?: number;
}

export const DAILY_BONUS_REWARDS: DailyBonusReward[] = [
  { day: 1, label: '1日目', gold: 350, arcaneDust: 6, bonusPotionQty: 3 },
  { day: 2, label: '2日目', gold: 550, arcaneDust: 10, itemRarity: 'uncommon' },
  { day: 3, label: '3日目', gold: 850, arcaneDust: 14, skillRarity: 'rare' },
  { day: 4, label: '4日目', gold: 1200, arcaneDust: 20, itemRarity: 'rare' },
  { day: 5, label: '5日目', gold: 1800, arcaneDust: 28, skillRarity: 'epic' },
  { day: 6, label: '6日目', gold: 2600, arcaneDust: 40, itemRarity: 'epic' },
  { day: 7, label: '7日目（特別報酬）', gold: 5000, arcaneDust: 65, itemRarity: 'legendary', skillRarity: 'legendary' },
];

export interface PlayerBase {
  ownerId: string;
  ownerName: string;
  baseName: string;
  isPublic: boolean;
  structures: PlacedStructure[];
  forgeLevel: number;
  libraryLevel: number;
}

export interface FriendshipRecord {
  id: string;
  requesterId: string;
  recipientId: string;
  requesterName: string;
  recipientName: string;
  participants: string[];
  status: 'pending' | 'accepted';
}

export interface RemotePlayerState {
  uid: string;
  displayName: string;
  playerClass: PlayerClassId;
  hairColor: string;
  armorColor: string;
  weaponId: string;
  level: number;
  mapId: MapId;
  x: number;
  y: number;
  aimAngle: number;
  hp: number;
  maxHp: number;
  lastAction?: {
    kind: 'attack' | 'skill';
    color: string;
    pattern: SkillPattern;
    angle: number;
    at: number;
  };
}
