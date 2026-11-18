import { ItemCategory, ItemDefinition, RARITIES, RarityId } from './types';

const RARITY_ITEM_PREFIX: Record<RarityId, string> = {
  common: '旅人の',
  uncommon: '精鋭の',
  rare: '青蒼の',
  epic: '紫電の',
  legendary: '黄金竜の',
  mythic: '紅蓮神の',
  arcane: '真理の',
  astral: '星界の',
  infinity: '無限の',
  secret: '原初秘匿の',
};

interface TemplateItem {
  key: string;
  suffix: string;
  category: ItemCategory;
  visualStyle: ItemDefinition['visualStyle'];
  usableInCombat: boolean;
  atk: number;
  def: number;
  hp: number;
  mp: number;
  spd: number;
  crit: number;
  healHp: number;
  healMp: number;
  combatDamage: number;
  combatRadius: number;
  cooldownMs: number;
  desc: string;
}

const TEMPLATES: TemplateItem[] = [
  // Weapons (all usable in combat too if active relic or base weapon!)
  {
    key: '01',
    suffix: 'ルーンソード',
    category: 'weapon',
    visualStyle: 'sword',
    usableInCombat: true,
    atk: 14,
    def: 2,
    hp: 15,
    mp: 0,
    spd: 6,
    crit: 5,
    healHp: 0,
    healMp: 0,
    combatDamage: 32,
    combatRadius: 115,
    cooldownMs: 3200,
    desc: '装備で攻撃力を上げ、戦闘使用で斬撃波を放つ片手剣。',
  },
  {
    key: '02',
    suffix: 'アークスタッフ',
    category: 'weapon',
    visualStyle: 'staff',
    usableInCombat: true,
    atk: 16,
    def: 0,
    hp: 0,
    mp: 35,
    spd: 2,
    crit: 6,
    healHp: 0,
    healMp: 22,
    combatDamage: 28,
    combatRadius: 140,
    cooldownMs: 3600,
    desc: '装備で魔力を高め、戦闘使用で魔力回復と衝撃波を起こす杖。',
  },
  {
    key: '03',
    suffix: 'シャドウダガー',
    category: 'weapon',
    visualStyle: 'daggers',
    usableInCombat: true,
    atk: 13,
    def: 0,
    hp: 10,
    mp: 10,
    spd: 18,
    crit: 12,
    healHp: 0,
    healMp: 0,
    combatDamage: 36,
    combatRadius: 95,
    cooldownMs: 2400,
    desc: '会心率と速度を大幅に引き上げ、戦闘使用で高速閃光を放つ双剣。',
  },
  {
    key: '04',
    suffix: 'ヴァルキリーランス',
    category: 'weapon',
    visualStyle: 'spear',
    usableInCombat: true,
    atk: 15,
    def: 4,
    hp: 25,
    mp: 15,
    spd: 8,
    crit: 7,
    healHp: 18,
    healMp: 0,
    combatDamage: 30,
    combatRadius: 125,
    cooldownMs: 3400,
    desc: '攻防と聖光回復を兼ね備えた戦乙女の聖槍。',
  },
  {
    key: '05',
    suffix: 'バスターブレイド',
    category: 'weapon',
    visualStyle: 'greatsword',
    usableInCombat: true,
    atk: 20,
    def: 3,
    hp: 30,
    mp: 0,
    spd: -4,
    crit: 8,
    healHp: 0,
    healMp: 0,
    combatDamage: 48,
    combatRadius: 145,
    cooldownMs: 4200,
    desc: '重厚な一撃と広範囲粉砕スキルを内包する大剣。',
  },
  {
    key: '06',
    suffix: '星弓・アストラルボウ',
    category: 'weapon',
    visualStyle: 'bow',
    usableInCombat: true,
    atk: 15,
    def: 0,
    hp: 10,
    mp: 20,
    spd: 14,
    crit: 10,
    healHp: 0,
    healMp: 0,
    combatDamage: 38,
    combatRadius: 165,
    cooldownMs: 2800,
    desc: '遠距離貫通矢を放てる戦闘用魔導弓。',
  },
  // Armor (also usable in combat for barrier/heal!)
  {
    key: '07',
    suffix: '戦士のチェストプレート',
    category: 'armor',
    visualStyle: 'plate',
    usableInCombat: true,
    atk: 2,
    def: 12,
    hp: 65,
    mp: 10,
    spd: 0,
    crit: 0,
    healHp: 25,
    healMp: 0,
    combatDamage: 14,
    combatRadius: 110,
    cooldownMs: 5000,
    desc: '堅牢な鎧。戦闘中に発動すると護身衝撃波と小回復を得る。',
  },
  {
    key: '08',
    suffix: '星織の魔導ローブ',
    category: 'armor',
    visualStyle: 'plate',
    usableInCombat: true,
    atk: 5,
    def: 7,
    hp: 40,
    mp: 55,
    spd: 6,
    crit: 4,
    healHp: 0,
    healMp: 35,
    combatDamage: 18,
    combatRadius: 120,
    cooldownMs: 4500,
    desc: '魔力上限を高め、戦闘使用でMPを急速回復できる外套。',
  },
  // Helms
  {
    key: '09',
    suffix: '守護騎士のヘルム',
    category: 'helm',
    visualStyle: 'helm',
    usableInCombat: true,
    atk: 3,
    def: 8,
    hp: 40,
    mp: 15,
    spd: 3,
    crit: 3,
    healHp: 20,
    healMp: 10,
    combatDamage: 0,
    combatRadius: 0,
    cooldownMs: 4800,
    desc: '頭部を保護し、戦闘使用で精神集中（HP/MP小回復）を行う兜。',
  },
  {
    key: '10',
    suffix: '賢者のサークレット',
    category: 'helm',
    visualStyle: 'helm',
    usableInCombat: true,
    atk: 6,
    def: 5,
    hp: 25,
    mp: 40,
    spd: 6,
    crit: 6,
    healHp: 10,
    healMp: 28,
    combatDamage: 20,
    combatRadius: 120,
    cooldownMs: 4400,
    desc: '会心率とMPを高め、戦闘時に星光波動を放てる冠。',
  },
  // Accessories
  {
    key: '11',
    suffix: '疾風のリング',
    category: 'accessory',
    visualStyle: 'ring',
    usableInCombat: true,
    atk: 6,
    def: 3,
    hp: 20,
    mp: 20,
    spd: 20,
    crit: 9,
    healHp: 0,
    healMp: 15,
    combatDamage: 24,
    combatRadius: 130,
    cooldownMs: 3500,
    desc: '移動速度と会心を伸ばす指輪。発動で疾風刃を周囲に展開。',
  },
  {
    key: '12',
    suffix: '不死鳥の護符',
    category: 'accessory',
    visualStyle: 'ring',
    usableInCombat: true,
    atk: 5,
    def: 6,
    hp: 55,
    mp: 25,
    spd: 5,
    crit: 4,
    healHp: 45,
    healMp: 20,
    combatDamage: 22,
    combatRadius: 125,
    cooldownMs: 5500,
    desc: '生命力を宿した装飾品。戦闘使用で強力な再生炎を発動する。',
  },
  // Combat Consumables
  {
    key: '13',
    suffix: '生命の秘薬',
    category: 'consumable',
    visualStyle: 'potion',
    usableInCombat: true,
    atk: 0,
    def: 0,
    hp: 0,
    mp: 0,
    spd: 0,
    crit: 0,
    healHp: 90,
    healMp: 20,
    combatDamage: 0,
    combatRadius: 0,
    cooldownMs: 1800,
    desc: '戦闘中に即座にHPを大きく回復するポーション。',
  },
  {
    key: '14',
    suffix: '魔力エーテル',
    category: 'consumable',
    visualStyle: 'potion',
    usableInCombat: true,
    atk: 0,
    def: 0,
    hp: 0,
    mp: 0,
    spd: 0,
    crit: 0,
    healHp: 15,
    healMp: 85,
    combatDamage: 0,
    combatRadius: 0,
    cooldownMs: 1800,
    desc: '戦闘中に即座にMPを大幅回復する魔導霊薬。',
  },
  {
    key: '15',
    suffix: '星砕きの爆弾',
    category: 'consumable',
    visualStyle: 'bomb',
    usableInCombat: true,
    atk: 0,
    def: 0,
    hp: 0,
    mp: 0,
    spd: 0,
    crit: 0,
    healHp: 0,
    healMp: 0,
    combatDamage: 75,
    combatRadius: 180,
    cooldownMs: 2200,
    desc: '周囲の敵に大爆発ダメージを与える戦闘用投擲アイテム。',
  },
  {
    key: '16',
    suffix: '天界の戦術巻物',
    category: 'consumable',
    visualStyle: 'scroll',
    usableInCombat: true,
    atk: 0,
    def: 0,
    hp: 0,
    mp: 0,
    spd: 0,
    crit: 0,
    healHp: 45,
    healMp: 45,
    combatDamage: 55,
    combatRadius: 210,
    cooldownMs: 2800,
    desc: 'HP/MPを同時回復しつつ広範囲に衝撃波を放つ魔法の巻物。',
  },
];

function buildItemsCatalog(): ItemDefinition[] {
  const list: ItemDefinition[] = [];

  for (const rarityMeta of RARITIES) {
    const mult = rarityMeta.powerMultiplier;
    const prefix = RARITY_ITEM_PREFIX[rarityMeta.id];

    for (const tpl of TEMPLATES) {
      const catPrefix =
        tpl.category === 'weapon'
          ? 'wp'
          : tpl.category === 'armor'
            ? 'ar'
            : tpl.category === 'helm'
              ? 'hl'
              : tpl.category === 'accessory'
                ? 'ac'
                : 'cs';

      const id = `${catPrefix}_${rarityMeta.id}_${tpl.key}`;
      list.push({
        id,
        name: `${prefix}${tpl.suffix}`,
        rarity: rarityMeta.id,
        category: tpl.category,
        atkBonus: Math.round(tpl.atk * mult),
        defBonus: Math.round(tpl.def * mult),
        hpBonus: Math.round(tpl.hp * mult),
        mpBonus: Math.round(tpl.mp * mult),
        spdBonus: Math.round(tpl.spd * (1 + rarityMeta.rank * 0.16)),
        critBonus: Math.min(45, Math.round(tpl.crit * (1 + rarityMeta.rank * 0.18))),
        usableInCombat: tpl.usableInCombat,
        healHp: Math.round(tpl.healHp * mult),
        healMp: Math.round(tpl.healMp * mult),
        combatDamage: Math.round(tpl.combatDamage * mult),
        combatRadius: tpl.combatRadius + rarityMeta.rank * 6,
        cooldownMs: tpl.cooldownMs,
        visualStyle: tpl.visualStyle,
        description: `[${rarityMeta.label}] ${tpl.desc}`,
      });
    }
  }

  return list;
}

export const ITEMS: ItemDefinition[] = buildItemsCatalog();

export const ITEM_BY_ID: Record<string, ItemDefinition> = ITEMS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, ItemDefinition>,
);

export function getItemsByRarity(rarity: RarityId): ItemDefinition[] {
  return ITEMS.filter((i) => i.rarity === rarity);
}

export function getRandomItemByRarity(rarity: RarityId, excludeConsumables = false): ItemDefinition {
  const pool = ITEMS.filter((i) => i.rarity === rarity && (!excludeConsumables || i.category !== 'consumable'));
  return pool[Math.floor(Math.random() * pool.length)];
}
