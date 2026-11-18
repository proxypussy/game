import { RARITIES, RARITY_BY_ID, RarityId, SkillDefinition, SkillElement, SkillPattern } from './types';

const ELEMENT_META: { element: SkillElement; label: string; color: string; verbs: string[] }[] = [
  { element: 'slash', label: '斬撃', color: '#E2E8F0', verbs: ['閃光斬', '連撃剣', '断空刃', '裂破斬', '円月舞'] },
  { element: 'fire', label: '炎熱', color: '#F97316', verbs: ['紅蓮波', '爆炎槍', '業火輪', '焦熱閃', '太陽墜'] },
  { element: 'ice', label: '氷結', color: '#38BDF8', verbs: ['氷霜刃', '凍土陣', '零度柱', '結晶嵐', '白銀壁'] },
  { element: 'lightning', label: '雷霆', color: '#FACC15', verbs: ['紫電閃', '落雷矢', '迅雷陣', '鳴神斬', '電磁網'] },
  { element: 'holy', label: '聖光', color: '#FEF08A', verbs: ['聖癒光', '天啓盾', '裁き光', '祝福陣', '浄化閃'] },
  { element: 'shadow', label: '闇影', color: '#A855F7', verbs: ['影縫い', '夜叉斬', '虚影弾', '冥府渦', '暗黒牙'] },
  { element: 'astral', label: '星辰', color: '#818CF8', verbs: ['流星群', '星屑弾', '銀河渦', '天体障壁', '彗星衝'] },
  { element: 'nature', label: '翠嵐', color: '#34D399', verbs: ['翠風刃', '茨の檻', '生命泉', '疾風歩', '精霊砲'] },
];

const RARITY_PREFIXES: Record<RarityId, string[]> = {
  common: ['初伝', '見習い', '素朴な', '鍛錬', '基本'],
  uncommon: ['熟練', '精鋭', '鋭利な', '強化', '疾走'],
  rare: ['秘伝', '蒼穹', '古流', '共鳴', '魔導'],
  epic: ['英雄', '王道', '覇気', '霊脈', '真髄'],
  legendary: ['伝説', '竜殺し', '聖域', '覇王', '不滅'],
  mythic: ['神話', '創世', '災厄', '降臨', '冥王'],
  arcane: ['秘奥義', '魔紋', '真理', '深淵術', '万象'],
  astral: ['星界', '天球', '星神', '宙域', '天翔'],
  infinity: ['無限', '永劫', '次元断', '輪廻', '終極'],
  secret: ['禁忌', '零式', '神域覚醒', '未知', '原初'],
};

const PATTERNS_BY_SLOT: SkillPattern[] = [
  'slash',
  'projectile',
  'nova',
  'beam',
  'dash',
  'heal',
  'shield',
  'meteor',
];

const PATTERN_DESCRIPTIONS: Record<SkillPattern, string> = {
  slash: '前方の扇状範囲を鋭く斬り払う近接技。',
  projectile: '照準方向へ貫通性の魔力弾を放つ遠距離技。',
  nova: '自身の周囲全方位に衝撃波を放つ範囲制圧技。',
  beam: '前方直線上の敵すべてを貫く高出力レーザー。',
  dash: '高速で前方へ踏み込みながら経路上の敵を薙ぎ払う。',
  heal: '自身のHPを瞬時に回復し戦闘態勢を立て直す。',
  shield: '周囲の敵を押し返し短時間のダメージ軽減結界を張る。',
  meteor: '照準地点に広範囲の高威力隕石・星震を降らせる。',
};

function buildAllSkills(): SkillDefinition[] {
  const result: SkillDefinition[] = [];

  for (const rarityMeta of RARITIES) {
    const prefixes = RARITY_PREFIXES[rarityMeta.id];
    const rank = rarityMeta.rank;
    const multBase = rarityMeta.powerMultiplier;

    for (let i = 0; i < 40; i++) {
      const elemInfo = ELEMENT_META[i % ELEMENT_META.length];
      const verb = elemInfo.verbs[Math.floor(i / ELEMENT_META.length) % elemInfo.verbs.length];
      const prefix = prefixes[(i + Math.floor(i / 8)) % prefixes.length];

      // Choose pattern intelligently by element/slot
      let pattern = PATTERNS_BY_SLOT[i % PATTERNS_BY_SLOT.length];
      if (elemInfo.element === 'holy' && i % 8 === 5) pattern = 'heal';
      if (elemInfo.element === 'nature' && i % 8 === 5) pattern = 'heal';
      if (pattern === 'heal' && elemInfo.element !== 'holy' && elemInfo.element !== 'nature' && i % 3 !== 0) {
        pattern = 'nova';
      }

      const numSuffix = i >= 24 ? `・改${(i % 4) + 1}` : i >= 16 ? '・極' : i >= 8 ? '・弐' : '';
      const name = `${prefix}「${verb}${numSuffix}」`;
      const id = `sk_${rarityMeta.id}_${String(i + 1).padStart(2, '0')}`;

      const isHeal = pattern === 'heal';
      const isShield = pattern === 'shield';
      const mpCost = Math.round(10 + rank * 6 + (pattern === 'meteor' || pattern === 'beam' ? 8 : 0) + (i % 5));
      const cooldownMs = Math.max(
        1100,
        Math.round((isHeal ? 6500 : pattern === 'meteor' ? 5200 : pattern === 'nova' ? 3800 : 2100) * (1 - rank * 0.03) + (i % 4) * 250),
      );
      const powerMult = Number((multBase * (pattern === 'meteor' ? 2.2 : pattern === 'beam' ? 1.85 : pattern === 'nova' ? 1.65 : isHeal ? 1.4 : 1.35) * (1 + (i % 5) * 0.06)).toFixed(2));
      const range = pattern === 'projectile' || pattern === 'beam' || pattern === 'meteor' ? 360 + rank * 22 : pattern === 'dash' ? 210 : 120 + rank * 8;
      const aoeRadius = pattern === 'nova' ? 150 + rank * 12 : pattern === 'meteor' ? 130 + rank * 10 : pattern === 'slash' ? 105 + rank * 6 : isShield ? 135 : 42;

      result.push({
        id,
        name,
        rarity: rarityMeta.id,
        element: elemInfo.element,
        pattern,
        mpCost,
        cooldownMs,
        powerMult,
        range,
        aoeRadius,
        color: rank >= 8 ? rarityMeta.color : elemInfo.color,
        description: `[${rarityMeta.label} / ${elemInfo.label}] ${PATTERN_DESCRIPTIONS[pattern]} (威力倍率 ${powerMult}x / MP ${mpCost})`,
      });
    }
  }

  return result;
}

export const SKILLS: SkillDefinition[] = buildAllSkills();

export const SKILL_BY_ID: Record<string, SkillDefinition> = SKILLS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, SkillDefinition>,
);

export function getSkillsByRarity(rarity: RarityId): SkillDefinition[] {
  return SKILLS.filter((s) => s.rarity === rarity);
}

export function getRandomSkillByRarity(rarity: RarityId): SkillDefinition {
  const pool = getSkillsByRarity(rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRarityColor(rarity: RarityId): string {
  return RARITY_BY_ID[rarity].color;
}
