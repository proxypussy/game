import { MapId, MapObstacle, StructureDefinition, StructureType, WorldMapDefinition } from './types';

function seededObstacles(seed: number, count: number, width: number, height: number, kindPool: MapObstacle['kind'][], sanctuary?: { x: number; y: number; w: number; h: number }): MapObstacle[] {
  const obs: MapObstacle[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const x = Math.round(160 + rand() * (width - 320));
    const y = Math.round(160 + rand() * (height - 320));
    // Keep away from sanctuary center and map corners
    if (sanctuary && x > sanctuary.x - 100 && x < sanctuary.x + sanctuary.w + 100 && y > sanctuary.y - 100 && y < sanctuary.y + sanctuary.h + 100) {
      continue;
    }
    if (Math.hypot(x - width / 2, y - height / 2) < 220) continue;

    obs.push({
      id: `obs_${seed}_${i}`,
      x,
      y,
      radius: Math.round(22 + rand() * 24),
      kind: kindPool[i % kindPool.length],
    });
  }
  return obs;
}

export const WORLD_MAPS: Record<MapId, WorldMapDefinition> = {
  emerald_meadow: {
    id: 'emerald_meadow',
    name: 'エメラルド始原平原',
    subtitle: '開拓者の拠点と穏やかな草原が広がる始まりの地',
    width: 3200,
    height: 2400,
    groundBase: '#132A20',
    groundAccent: '#1B3B2B',
    riverColor: '#1D4ED8',
    recommendedLevel: 1,
    minRarity: 'common',
    maxRarity: 'rare',
    hasSanctuaryZone: true,
    sanctuaryBounds: { x: 1200, y: 880, w: 800, h: 640 },
    spawnX: 1600,
    spawnY: 1200,
    warpPoints: [
      {
        id: 'wp_em_east',
        x: 2780,
        y: 1200,
        label: '蒼炎の古樹林・東門',
        destinations: [
          { mapId: 'azure_whisperwood', spawnX: 420, spawnY: 1200, label: '蒼炎の古樹林へワープ' },
          { mapId: 'crimson_caldera', spawnX: 460, spawnY: 1200, label: '紅蓮の溶岩渓谷へワープ' },
        ],
      },
      {
        id: 'wp_em_north',
        x: 1600,
        y: 340,
        label: '北天のワープ祭壇',
        destinations: [
          { mapId: 'frostpeak_tundra', spawnX: 1600, spawnY: 2000, label: '凍てつく星霜雪原へワープ' },
          { mapId: 'arcane_sanctum', spawnX: 1600, spawnY: 1960, label: '虚無のアルカナ聖域へワープ' },
        ],
      },
      {
        id: 'wp_em_south',
        x: 1600,
        y: 2060,
        label: '深淵への古代転移門',
        destinations: [
          { mapId: 'infinity_abyss', spawnX: 1600, spawnY: 1950, label: '終焉のインフィニティ深淵へワープ' },
          { mapId: 'azure_whisperwood', spawnX: 1600, spawnY: 420, label: '蒼炎の古樹林（北）へワープ' },
        ],
      },
    ],
    obstacles: seededObstacles(101, 55, 3200, 2400, ['tree', 'rock', 'ruin'], { x: 1200, y: 880, w: 800, h: 640 }),
  },
  azure_whisperwood: {
    id: 'azure_whisperwood',
    name: '蒼炎の古樹林',
    subtitle: '霊木と蒼い霧が立ち込める魔力の森',
    width: 3200,
    height: 2400,
    groundBase: '#0F222D',
    groundAccent: '#163344',
    riverColor: '#0284C7',
    recommendedLevel: 8,
    minRarity: 'uncommon',
    maxRarity: 'epic',
    hasSanctuaryZone: false,
    spawnX: 420,
    spawnY: 1200,
    warpPoints: [
      {
        id: 'wp_az_west',
        x: 340,
        y: 1200,
        label: '草原への帰還門',
        destinations: [
          { mapId: 'emerald_meadow', spawnX: 2680, spawnY: 1200, label: 'エメラルド始原平原へ帰還' },
        ],
      },
      {
        id: 'wp_az_east',
        x: 2820,
        y: 1180,
        label: '灼熱回廊ワープゲート',
        destinations: [
          { mapId: 'crimson_caldera', spawnX: 420, spawnY: 1200, label: '紅蓮の溶岩渓谷へワープ' },
          { mapId: 'frostpeak_tundra', spawnX: 420, spawnY: 1200, label: '凍てつく星霜雪原へワープ' },
        ],
      },
      {
        id: 'wp_az_north',
        x: 1600,
        y: 360,
        label: '星樹の祭壇',
        destinations: [
          { mapId: 'arcane_sanctum', spawnX: 420, spawnY: 1200, label: '虚無のアルカナ聖域へワープ' },
        ],
      },
    ],
    obstacles: seededObstacles(202, 72, 3200, 2400, ['tree', 'crystal', 'ruin']),
  },
  crimson_caldera: {
    id: 'crimson_caldera',
    name: '紅蓮の溶岩渓谷',
    subtitle: '業火の竜と魔神が棲まう灼熱の火山地帯',
    width: 3200,
    height: 2400,
    groundBase: '#281314',
    groundAccent: '#3B1B1B',
    riverColor: '#EA580C',
    recommendedLevel: 18,
    minRarity: 'rare',
    maxRarity: 'mythic',
    hasSanctuaryZone: false,
    spawnX: 460,
    spawnY: 1200,
    warpPoints: [
      {
        id: 'wp_cr_west',
        x: 360,
        y: 1200,
        label: '西側転移門',
        destinations: [
          { mapId: 'azure_whisperwood', spawnX: 2700, spawnY: 1180, label: '蒼炎の古樹林へワープ' },
          { mapId: 'emerald_meadow', spawnX: 1600, spawnY: 1200, label: 'エメラルド始原平原（拠点）へ帰還' },
        ],
      },
      {
        id: 'wp_cr_north',
        x: 1640,
        y: 360,
        label: '氷火の境界門',
        destinations: [
          { mapId: 'frostpeak_tundra', spawnX: 1600, spawnY: 1960, label: '凍てつく星霜雪原へワープ' },
          { mapId: 'arcane_sanctum', spawnX: 1600, spawnY: 1200, label: '虚無のアルカナ聖域へワープ' },
        ],
      },
    ],
    obstacles: seededObstacles(303, 62, 3200, 2400, ['rock', 'pillar', 'ruin']),
  },
  frostpeak_tundra: {
    id: 'frostpeak_tundra',
    name: '凍てつく星霜雪原',
    subtitle: 'オーロラと氷晶のモノリスが輝く極寒の領域',
    width: 3200,
    height: 2400,
    groundBase: '#132238',
    groundAccent: '#1D3352',
    riverColor: '#38BDF8',
    recommendedLevel: 30,
    minRarity: 'epic',
    maxRarity: 'arcane',
    hasSanctuaryZone: false,
    spawnX: 1600,
    spawnY: 1960,
    warpPoints: [
      {
        id: 'wp_fr_south',
        x: 1600,
        y: 2040,
        label: '雪原南口ゲート',
        destinations: [
          { mapId: 'crimson_caldera', spawnX: 1640, spawnY: 460, label: '紅蓮の溶岩渓谷へワープ' },
          { mapId: 'emerald_meadow', spawnX: 1600, spawnY: 1200, label: 'エメラルド始原平原（拠点）へ帰還' },
        ],
      },
      {
        id: 'wp_fr_center',
        x: 1600,
        y: 420,
        label: 'オーロラ星門',
        destinations: [
          { mapId: 'arcane_sanctum', spawnX: 1600, spawnY: 1920, label: '虚無のアルカナ聖域へワープ' },
          { mapId: 'infinity_abyss', spawnX: 460, spawnY: 1200, label: '終焉のインフィニティ深淵へワープ' },
        ],
      },
    ],
    obstacles: seededObstacles(404, 58, 3200, 2400, ['crystal', 'rock', 'pillar']),
  },
  arcane_sanctum: {
    id: 'arcane_sanctum',
    name: '虚無のアルカナ聖域',
    subtitle: '浮遊する魔法陣と星界の守護者が巡回する天空遺跡',
    width: 3200,
    height: 2400,
    groundBase: '#181430',
    groundAccent: '#251E4A',
    riverColor: '#6366F1',
    recommendedLevel: 45,
    minRarity: 'legendary',
    maxRarity: 'infinity',
    hasSanctuaryZone: false,
    spawnX: 1600,
    spawnY: 1920,
    warpPoints: [
      {
        id: 'wp_ar_south',
        x: 1600,
        y: 2040,
        label: '聖域降下ゲート',
        destinations: [
          { mapId: 'frostpeak_tundra', spawnX: 1600, spawnY: 500, label: '凍てつく星霜雪原へワープ' },
          { mapId: 'emerald_meadow', spawnX: 1600, spawnY: 1200, label: 'エメラルド始原平原（拠点）へ帰還' },
        ],
      },
      {
        id: 'wp_ar_north',
        x: 1600,
        y: 360,
        label: '終焉深淵への星門',
        destinations: [
          { mapId: 'infinity_abyss', spawnX: 1600, spawnY: 1950, label: '終焉のインフィニティ深淵へワープ' },
        ],
      },
    ],
    obstacles: seededObstacles(505, 52, 3200, 2400, ['pillar', 'crystal', 'ruin']),
  },
  infinity_abyss: {
    id: 'infinity_abyss',
    name: '終焉のインフィニティ深淵',
    subtitle: 'インフィニティ・シークレット級の超越存在が降臨する最果て',
    width: 3200,
    height: 2400,
    groundBase: '#190C24',
    groundAccent: '#2A123B',
    riverColor: '#EC4899',
    recommendedLevel: 65,
    minRarity: 'arcane',
    maxRarity: 'secret',
    hasSanctuaryZone: false,
    spawnX: 1600,
    spawnY: 1950,
    warpPoints: [
      {
        id: 'wp_inf_south',
        x: 1600,
        y: 2060,
        label: '帰還の星門',
        destinations: [
          { mapId: 'arcane_sanctum', spawnX: 1600, spawnY: 460, label: '虚無のアルカナ聖域へ戻る' },
          { mapId: 'emerald_meadow', spawnX: 1600, spawnY: 1200, label: 'エメラルド始原平原（拠点）へ帰還' },
        ],
      },
      {
        id: 'wp_inf_west',
        x: 380,
        y: 1200,
        label: '西側次元ゲート',
        destinations: [
          { mapId: 'frostpeak_tundra', spawnX: 1600, spawnY: 500, label: '凍てつく星霜雪原へワープ' },
        ],
      },
    ],
    obstacles: seededObstacles(606, 48, 3200, 2400, ['crystal', 'pillar', 'ruin']),
  },
};

export const WORLD_MAP_LIST: WorldMapDefinition[] = Object.values(WORLD_MAPS);

export const STRUCTURE_GRID_SIZE = 48;

export const STRUCTURES_CATALOG: StructureDefinition[] = [
  {
    type: 'wood_wall',
    name: '木製の防衛柵',
    costGold: 30,
    costDust: 0,
    color: '#92400E',
    accent: '#D97706',
    description: '敵の侵入を阻む基本的な防衛壁。',
    maxCount: 60,
  },
  {
    type: 'stone_wall',
    name: '重厚な石城壁',
    costGold: 80,
    costDust: 1,
    color: '#475569',
    accent: '#94A3B8',
    description: '堅固な石造りの城壁。要塞形成に最適。',
    maxCount: 60,
  },
  {
    type: 'arcane_barrier',
    name: 'アルカナ結界壁',
    costGold: 180,
    costDust: 4,
    color: '#0E7490',
    accent: '#22D3EE',
    description: '魔力で輝く高耐久の結界壁。',
    maxCount: 40,
  },
  {
    type: 'forge',
    name: '神域の鍛冶工房',
    costGold: 220,
    costDust: 3,
    color: '#991B1B',
    accent: '#F59E0B',
    description: '設置数に応じて合成成功率を+2%上昇させる（最大+10%）。',
    maxCount: 5,
  },
  {
    type: 'library',
    name: '古代魔導書庫',
    costGold: 200,
    costDust: 3,
    color: '#312E81',
    accent: '#818CF8',
    description: '設置数に応じて獲得EXP・MP自然回復量を上昇させる。',
    maxCount: 5,
  },
  {
    type: 'healing_fountain',
    name: '聖域の回復泉',
    costGold: 160,
    costDust: 2,
    color: '#065F46',
    accent: '#34D399',
    description: '近くにいるプレイヤーのHPとMPを持続的に回復する。',
    maxCount: 6,
  },
  {
    type: 'turret_bolt',
    name: '自動防衛弩砲',
    costGold: 240,
    costDust: 4,
    color: '#334155',
    accent: '#FBBF24',
    description: '接近した敵を自動捕捉して連射攻撃を行う拠点防衛兵器。',
    maxCount: 10,
  },
  {
    type: 'turret_arcane',
    name: '星晶魔導砲台',
    costGold: 520,
    costDust: 10,
    color: '#4C1D95',
    accent: '#E879F9',
    description: '超高威力の星晶レーザーで周囲の敵を撃滅する上級防衛塔。',
    maxCount: 6,
  },
  {
    type: 'storage_chest',
    name: '宝物保管庫',
    costGold: 120,
    costDust: 1,
    color: '#78350F',
    accent: '#FBBF24',
    description: '拠点のシンボルとなる装飾保管庫。',
    maxCount: 10,
  },
  {
    type: 'warp_beacon',
    name: '拠点転移ビーコン',
    costGold: 300,
    costDust: 5,
    color: '#1E3A8A',
    accent: '#38BDF8',
    description: '拠点から直接他マップへのワープ機能を開く便利な祭壇。',
    maxCount: 4,
  },
  {
    type: 'banner',
    name: '栄光のギルド旗',
    costGold: 60,
    costDust: 0,
    color: '#9F1239',
    accent: '#FDE047',
    description: '拠点を彩る荘厳な紋章旗。',
    maxCount: 20,
  },
  {
    type: 'crystal_lamp',
    name: '星輝の結晶灯',
    costGold: 50,
    costDust: 0,
    color: '#0F766E',
    accent: '#5EEAD4',
    description: '聖域周辺を美しく照らす魔導ランタン。',
    maxCount: 30,
  },
];

export const STRUCTURE_BY_TYPE: Record<StructureType, StructureDefinition> = STRUCTURES_CATALOG.reduce(
  (acc, s) => {
    acc[s.type] = s;
    return acc;
  },
  {} as Record<StructureType, StructureDefinition>,
);
