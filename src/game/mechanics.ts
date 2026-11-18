import { getRandomItemByRarity, ITEM_BY_ID } from './itemsCatalog';
import { getRandomSkillByRarity, SKILL_BY_ID } from './skillsCatalog';
import {
  EnemyDefinition,
  InventoryStack,
  ItemDefinition,
  OwnedSkillStack,
  PLAYER_CLASSES,
  PlayerBase,
  PlayerClassId,
  PlayerSave,
  RARITIES,
  RARITY_BY_ID,
  RarityId,
  SkillDefinition,
} from './types';

export interface ComputedStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  speed: number;
  critChance: number; // %
  combatPower: number;
  forgeBonusPct: number;
  libraryBonusPct: number;
}

export function expRequiredForLevel(level: number): number {
  return Math.round(60 * Math.pow(level, 1.45) + 40 * level);
}

export function computePlayerStats(
  playerClass: PlayerClassId,
  save: PlayerSave,
  base: PlayerBase | null,
): ComputedStats {
  const cls = PLAYER_CLASSES[playerClass];
  const weapon = ITEM_BY_ID[save.equippedWeaponId];
  const armor = ITEM_BY_ID[save.equippedArmorId];
  const helm = ITEM_BY_ID[save.equippedHelmId];
  const acc = ITEM_BY_ID[save.equippedAccessoryId];

  const gearList = [weapon, armor, helm, acc].filter(Boolean);

  const gearHp = gearList.reduce((s, g) => s + g.hpBonus, 0);
  const gearMp = gearList.reduce((s, g) => s + g.mpBonus, 0);
  const gearAtk = gearList.reduce((s, g) => s + g.atkBonus, 0);
  const gearDef = gearList.reduce((s, g) => s + g.defBonus, 0);
  const gearSpd = gearList.reduce((s, g) => s + g.spdBonus, 0);
  const gearCrit = gearList.reduce((s, g) => s + g.critBonus, 0);

  const forgeCount = base ? base.structures.filter((st) => st.type === 'forge').length : 0;
  const libraryCount = base ? base.structures.filter((st) => st.type === 'library').length : 0;
  const forgeBonusPct = Math.min(10, forgeCount * 2);
  const libraryBonusPct = Math.min(25, libraryCount * 5);

  const maxHp = Math.round(cls.baseHp + (save.level - 1) * 26 + gearHp);
  const maxMp = Math.round(cls.baseMp + (save.level - 1) * 10 + gearMp + libraryCount * 15);
  const atk = Math.round(cls.baseAtk + (save.level - 1) * 5 + gearAtk);
  const def = Math.round(cls.baseDef + (save.level - 1) * 3 + gearDef);
  const speed = Math.max(150, Math.min(430, Math.round(cls.baseSpeed + gearSpd)));
  const critChance = Math.min(75, 8 + gearCrit);

  const skillPower = save.equippedSkills.reduce((sum, skId) => {
    const sk = SKILL_BY_ID[skId];
    return sum + (sk ? RARITY_BY_ID[sk.rarity].scoreValue * 12 : 0);
  }, 0);

  const combatPower = Math.round(atk * 4 + def * 3 + maxHp * 0.45 + maxMp * 0.3 + critChance * 6 + skillPower);

  return {
    maxHp,
    maxMp,
    atk,
    def,
    speed,
    critChance,
    combatPower,
    forgeBonusPct,
    libraryBonusPct,
  };
}

export function computeRarityScore(save: PlayerSave): number {
  let score = 0;
  for (const st of save.inventory) {
    const item = ITEM_BY_ID[st.itemId];
    if (item) score += RARITY_BY_ID[item.rarity].scoreValue * Math.min(5, st.qty);
  }
  for (const sk of save.ownedSkills) {
    const skill = SKILL_BY_ID[sk.skillId];
    if (skill) score += RARITY_BY_ID[skill.rarity].scoreValue * Math.min(3, sk.qty);
  }
  return score;
}

export interface EnemyDropResult {
  exp: number;
  gold: number;
  arcaneDust: number;
  droppedItems: ItemDefinition[];
  droppedSkills: SkillDefinition[];
}

export function rollEnemyDrops(enemy: EnemyDefinition, libraryBonusPct = 0): EnemyDropResult {
  const rank = RARITY_BY_ID[enemy.rarity].rank;
  const exp = Math.round(enemy.expReward * (1 + libraryBonusPct / 100));
  const gold = enemy.goldReward;
  const arcaneDust = enemy.isBoss ? 2 + rank : Math.random() < 0.4 + rank * 0.05 ? 1 + Math.floor(rank / 2) : 0;

  const droppedItems: ItemDefinition[] = [];
  const droppedSkills: SkillDefinition[] = [];

  // Higher rarity enemies have higher drop rate and drop rarities anchored to enemy rarity!
  const itemDropChance = enemy.isBoss ? 1.0 : Math.min(0.95, 0.42 + rank * 0.06);
  if (Math.random() < itemDropChance) {
    const rollUp = enemy.isBoss && Math.random() < 0.28 && rank < 9 ? rank + 1 : rank;
    const rollDown = Math.random() < 0.25 && rank > 0 ? rank - 1 : rollUp;
    const targetRarity = RARITIES[Math.max(0, Math.min(9, rollDown))].id;
    droppedItems.push(getRandomItemByRarity(targetRarity));
  }
  // Chance for bonus combat consumable
  if (Math.random() < 0.35 || enemy.isBoss) {
    const consPool = RARITIES[Math.max(0, Math.min(9, rank))].id;
    const item = getRandomItemByRarity(consPool, false);
    droppedItems.push(item);
  }

  // Skill drop
  const skillDropChance = enemy.isBoss ? 0.92 : Math.min(0.85, 0.24 + rank * 0.065);
  if (Math.random() < skillDropChance) {
    const targetRank = enemy.isBoss && Math.random() < 0.22 && rank < 9 ? rank + 1 : rank;
    const targetRarity = RARITIES[targetRank].id;
    droppedSkills.push(getRandomSkillByRarity(targetRarity));
  }

  return { exp, gold, arcaneDust, droppedItems, droppedSkills };
}

export function addItemToInventory(inv: InventoryStack[], itemId: string, qty = 1): InventoryStack[] {
  const next = inv.map((s) => ({ ...s }));
  const existing = next.find((s) => s.itemId === itemId);
  if (existing) {
    existing.qty += qty;
  } else {
    next.push({ itemId, qty });
  }
  return next;
}

export function removeItemFromInventory(inv: InventoryStack[], itemId: string, qty = 1): InventoryStack[] {
  const next: InventoryStack[] = [];
  for (const st of inv) {
    if (st.itemId === itemId) {
      const rem = st.qty - qty;
      if (rem > 0) next.push({ itemId: st.itemId, qty: rem });
    } else {
      next.push({ ...st });
    }
  }
  return next;
}

export function addSkillToOwned(owned: OwnedSkillStack[], skillId: string, qty = 1): OwnedSkillStack[] {
  const next = owned.map((s) => ({ ...s }));
  const existing = next.find((s) => s.skillId === skillId);
  if (existing) {
    existing.qty += qty;
  } else {
    next.push({ skillId, qty });
  }
  return next;
}

export function removeSkillFromOwned(owned: OwnedSkillStack[], skillId: string, qty = 1): OwnedSkillStack[] {
  const next: OwnedSkillStack[] = [];
  for (const st of owned) {
    if (st.skillId === skillId) {
      const rem = st.qty - qty;
      if (rem > 0) next.push({ skillId: st.skillId, qty: rem });
    } else {
      next.push({ ...st });
    }
  }
  return next;
}

export interface SynthesisOutcome<T> {
  success: boolean;
  rateUsed: number;
  result: T | null;
  dustRefund: number;
  nextRarity: RarityId;
}

export function getSynthesisSuccessRate(rarity: RarityId, forgeBonusPct: number): number {
  const meta = RARITY_BY_ID[rarity];
  if (meta.rank >= 9) return 0;
  return Math.min(98, meta.synthesisRateToNext + forgeBonusPct);
}

export function performItemSynthesis(rarity: RarityId, forgeBonusPct: number): SynthesisOutcome<ItemDefinition> {
  const meta = RARITY_BY_ID[rarity];
  const nextRarity = RARITIES[Math.min(9, meta.rank + 1)].id;
  const rate = getSynthesisSuccessRate(rarity, forgeBonusPct);
  const success = Math.random() * 100 < rate;
  if (success) {
    return {
      success: true,
      rateUsed: rate,
      result: getRandomItemByRarity(nextRarity, false),
      dustRefund: 0,
      nextRarity,
    };
  }
  return {
    success: false,
    rateUsed: rate,
    result: null,
    dustRefund: (meta.rank + 1) * 4,
    nextRarity,
  };
}

export function performSkillSynthesis(rarity: RarityId, forgeBonusPct: number): SynthesisOutcome<SkillDefinition> {
  const meta = RARITY_BY_ID[rarity];
  const nextRarity = RARITIES[Math.min(9, meta.rank + 1)].id;
  const rate = getSynthesisSuccessRate(rarity, forgeBonusPct);
  const success = Math.random() * 100 < rate;
  if (success) {
    return {
      success: true,
      rateUsed: rate,
      result: getRandomSkillByRarity(nextRarity),
      dustRefund: 0,
      nextRarity,
    };
  }
  return {
    success: false,
    rateUsed: rate,
    result: null,
    dustRefund: (meta.rank + 1) * 4,
    nextRarity,
  };
}
