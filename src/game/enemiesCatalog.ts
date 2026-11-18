import {
  EnemyArchetype,
  EnemyAttackPattern,
  EnemyDefinition,
  MapId,
  RARITIES,
  RarityId,
  SkillElement,
} from './types';

// Exact 150 distinct enemy species across the 10 rarities and 6 maps!
// Distribution per rarity (total = 150):
// Common: 20, Uncommon: 20, Rare: 18, Epic: 18, Legendary: 16,
// Mythic: 15, Arcane: 14, Astral: 12, Infinity: 10, Secret: 7 => Total = 150.

const RARITY_COUNTS: { rarity: RarityId; count: number; maps: MapId[] }[] = [
  { rarity: 'common', count: 20, maps: ['emerald_meadow', 'azure_whisperwood'] },
  { rarity: 'uncommon', count: 20, maps: ['emerald_meadow', 'azure_whisperwood', 'crimson_caldera'] },
  { rarity: 'rare', count: 18, maps: ['emerald_meadow', 'azure_whisperwood', 'crimson_caldera'] },
  { rarity: 'epic', count: 18, maps: ['azure_whisperwood', 'crimson_caldera', 'frostpeak_tundra'] },
  { rarity: 'legendary', count: 16, maps: ['crimson_caldera', 'frostpeak_tundra', 'arcane_sanctum'] },
  { rarity: 'mythic', count: 15, maps: ['crimson_caldera', 'frostpeak_tundra', 'arcane_sanctum'] },
  { rarity: 'arcane', count: 14, maps: ['frostpeak_tundra', 'arcane_sanctum', 'infinity_abyss'] },
  { rarity: 'astral', count: 12, maps: ['arcane_sanctum', 'infinity_abyss'] },
  { rarity: 'infinity', count: 10, maps: ['arcane_sanctum', 'infinity_abyss'] },
  { rarity: 'secret', count: 7, maps: ['emerald_meadow', 'azure_whisperwood', 'crimson_caldera', 'frostpeak_tundra', 'arcane_sanctum', 'infinity_abyss'] },
];

const CURATED_NAMES: Record<RarityId, string[]> = {
  common: [
    'リーフスライム', 'フォレストウルフ', 'コボルト斥候', '草原ゴブリン', '苔むしカメ',
    'ワイルドボア', 'キノコ胞子虫', 'ストーンバット', '迷いの小鬼', '泥沼トカゲ',
    '野良スケルトン', '角うさぎ', '草影の蛇', '木霊の精', '鉄くずゴーレム',
    '見習い盗賊', '羽虫スウォーム', '川辺のカニ', '灰毛ハイエナ', '朽木トレント',
  ],
  uncommon: [
    '青牙ウルフ', 'ゴブリン戦士長', '毒胞子マッシュ', '銅鎧スケルトン', '疾風ホーク',
    '沼地のヒドラ幼体', '蒼炎ウィスプ', '樹皮の番人', '大顎アント', '砂塵サソリ',
    '暗闇のコウモリ騎士', 'オーク突撃兵', '氷結スライム', '岩窟トロール', '古代の偵察機',
    '妖精のいたずら師', '沼蛇バジリスク', '鉄甲カブト', '闇森の狩人', '霊草マンドラ',
  ],
  rare: [
    '紅蓮リザードマン', '蒼氷の精霊', '黒鉄の重騎士', '雷鳴グリフォン', '森の守護大樹',
    '呪われし魔導師', '灼熱のサラマンダー', '深森のワイバーン', '鋼鉄ゴーレム', '血霧のヴァンパイア',
    '氷原のダイアウルフ', '砂漠のミイラ王', '幽霊船の剣士', '水晶の甲殻獣', '蒼炎のケルベロス',
    '嵐を呼ぶハーピー', '深淵の触手塊', '古戦場の亡霊将',
  ],
  epic: [
    '炎獄のイフリート', '絶対零度の雪女', '黒騎士デュラハン', '雷帝サンダーバード', '深緑の古竜',
    '紅蓮魔導司祭', '白銀の聖堂騎士', '暴走する魔導機兵', '凍土のマンモス王', '闇夜の大吸血鬼',
    '妖刀の傀儡武者', '翠嵐のキメラ', 'マグマ・ベヒーモス', '呪縛の死霊術師', '蒼穹の竜騎士',
    '毒沼のエンペラー', '星屑の精霊獣', '紅き月の狂戦士',
  ],
  legendary: [
    '黄金の古竜アウレリア', '業火の魔神ベルゼブ', '氷帝グラキエス', '破滅の騎士アバドン',
    '蒼天の大魔導卿', '雷神トール・ヴァラ', '深海のクラーケン', '万象の賢者ゴーレム',
    '聖域の堕天使', '不死鳥フェニックス', '闇王ノクス・レギス', '翡翠の竜王ヴァーダ',
    '煉獄のバハムート', '星辰の守護巨神', '白銀狼フェンリル', '古の英雄霊エインヘリヤル',
  ],
  mythic: [
    '神話級巨竜ティアマト', '終末の魔王サタナエル', '極光の女神アウロラ', '冥界神ハデス・影',
    '天災の巨人クロノス', '紅蓮竜皇イグニス', '絶対氷王コキュートス', '嵐皇テンペスタス',
    '聖剣の亡霊王アーサー', '虚空の魔導皇アルカ', '神獣麒麟・天翔', '混沌の魔王アザトス',
    '九尾の妖狐・玉藻', '創世の石像タイタン', '血盟の真祖ドラキュラ',
  ],
  arcane: [
    '秘奥の監視者オメガ', '魔紋結晶ドラゴニア', '真理の書庫番ヘルメス', '時空歪曲のメビウス',
    '深淵魔導機アーク', '万華鏡の幻惑姫', '次元裂きのファントム', '反物質の精霊核',
    '古代王国の星術師', '無限回廊の番犬', '封じられし大賢者', '魔力奔流リヴァイアサン',
    '白亜の魔導巨兵', '蒼き真理の熾天使',
  ],
  astral: [
    '星界竜セレスティアル', '銀河の織姫ヴェガ', '彗星騎士ハレー', '超新星ゴーレム',
    '天球儀の裁定者', '星座獣レグルス', '漆黒のブラックホール核', '光年を超える翼蛇',
    '星霊皇アストレア', '天の川の守護龍', '月食の魔導女帝', '極星王ポラリス',
  ],
  infinity: [
    '無限龍ウロボロス', '永劫回帰の覇者', '次元統合体ゼノス', '無窮の戦神アレス∞',
    '虚無と創造の双子神', 'パラドックス・セラフ', '境界なき深淵皇', '無限演算機エデン',
    '全知の星眼・インフィニ', '終焉を超えし者・零',
  ],
  secret: [
    '隠されし原初竜プロトス', '禁忌の書架・アカシック', '世界樹の真核ユグドラ', '未知なる星神ゼタ',
    '空白の王・ゼロス', '黄金比の熾天使メタトロン', '創世記の観測者アエテルナ',
  ],
};

const ARCHETYPES: EnemyArchetype[] = ['slime', 'beast', 'warrior', 'mage', 'dragon', 'golem', 'wraith', 'seraph'];
const ELEMENTS: SkillElement[] = ['nature', 'fire', 'ice', 'lightning', 'shadow', 'holy', 'astral', 'slash'];
const PATTERNS: EnemyAttackPattern[] = ['melee', 'ranged', 'charge', 'aoe', 'boss_multi'];

const PALETTES: { primary: string; accent: string }[] = [
  { primary: '#4ADE80', accent: '#166534' },
  { primary: '#60A5FA', accent: '#1E3A8A' },
  { primary: '#F97316', accent: '#9A3412' },
  { primary: '#38BDF8', accent: '#0369A1' },
  { primary: '#C084FC', accent: '#581C87' },
  { primary: '#F87171', accent: '#7F1D1D' },
  { primary: '#2DD4BF', accent: '#115E59' },
  { primary: '#FACC15', accent: '#854D0E' },
  { primary: '#F472B6', accent: '#831843' },
  { primary: '#FDE047', accent: '#713F12' },
];

function inferArchetype(name: string, idx: number): EnemyArchetype {
  if (name.includes('スライム') || name.includes('胞子') || name.includes('核')) return 'slime';
  if (name.includes('竜') || name.includes('龍') || name.includes('ワイバーン') || name.includes('バハムート') || name.includes('イグニス')) return 'dragon';
  if (name.includes('ゴーレム') || name.includes('巨兵') || name.includes('石像') || name.includes('機')) return 'golem';
  if (name.includes('天使') || name.includes('セラフ') || name.includes('女神') || name.includes('観測者')) return 'seraph';
  if (name.includes('魔導') || name.includes('賢者') || name.includes('術師') || name.includes('司祭') || name.includes('ウィスプ')) return 'mage';
  if (name.includes('亡霊') || name.includes('ファントム') || name.includes('吸血鬼') || name.includes('雪女') || name.includes('影')) return 'wraith';
  if (name.includes('ウルフ') || name.includes('ボア') || name.includes('獣') || name.includes('狐') || name.includes('ホーク') || name.includes('ケルベロス')) return 'beast';
  return ARCHETYPES[idx % ARCHETYPES.length];
}

function build150Enemies(): EnemyDefinition[] {
  const enemies: EnemyDefinition[] = [];
  let globalIdx = 1;

  for (const group of RARITY_COUNTS) {
    const rarityMeta = RARITIES.find((r) => r.id === group.rarity)!;
    const rank = rarityMeta.rank;
    const names = CURATED_NAMES[group.rarity];

    for (let i = 0; i < group.count; i++) {
      const name = names[i];
      const mapId = group.maps[i % group.maps.length];
      const archetype = inferArchetype(name, globalIdx);
      const element = ELEMENTS[(globalIdx + rank) % ELEMENTS.length];
      const isBoss = i >= group.count - 2 || rank >= 7 && i % 3 === 0 || rank === 9;
      const attackPattern: EnemyAttackPattern = isBoss
        ? 'boss_multi'
        : PATTERNS[(globalIdx + (archetype === 'mage' ? 1 : archetype === 'beast' ? 2 : 0)) % 4];

      const mult = rarityMeta.powerMultiplier;
      const maxHp = Math.round((65 + rank * 35) * mult * (isBoss ? 2.4 : 1) * (1 + (i % 4) * 0.08));
      const atk = Math.round((10 + rank * 6) * Math.pow(1.42, rank) * (isBoss ? 1.35 : 1));
      const def = Math.round((2 + rank * 4) * Math.pow(1.35, rank));
      const speed = Math.round(78 + rank * 7 + (archetype === 'beast' ? 28 : archetype === 'golem' ? -18 : 0));
      const size = Math.round((archetype === 'dragon' || archetype === 'golem' ? 26 : 19) + rank * 1.4 + (isBoss ? 10 : 0));
      const palette = PALETTES[rank];

      enemies.push({
        id: `en_${String(globalIdx).padStart(3, '0')}`,
        index: globalIdx,
        name,
        rarity: group.rarity,
        mapId,
        archetype,
        element,
        maxHp,
        atk,
        def,
        speed,
        size,
        aggroRange: isBoss ? 440 : 270 + rank * 12,
        attackPattern,
        expReward: Math.round(24 * Math.pow(1.65, rank) * (isBoss ? 3.5 : 1)),
        goldReward: Math.round(18 * Math.pow(1.55, rank) * (isBoss ? 4 : 1)),
        primaryColor: palette.primary,
        accentColor: palette.accent,
        isBoss,
        lore: `${rarityMeta.label}ランクに属する${isBoss ? '領域ボス' : '野生/精鋭'}モンスター。高レアリティほど強大で希少な装備・スキルをドロップする。`,
      });

      globalIdx++;
    }
  }

  return enemies;
}

export const ENEMIES: EnemyDefinition[] = build150Enemies();

export const ENEMY_BY_ID: Record<string, EnemyDefinition> = ENEMIES.reduce(
  (acc, e) => {
    acc[e.id] = e;
    return acc;
  },
  {} as Record<string, EnemyDefinition>,
);

export function getEnemiesForMap(mapId: MapId): EnemyDefinition[] {
  return ENEMIES.filter((e) => e.mapId === mapId);
}
