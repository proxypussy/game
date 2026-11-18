import React, { useMemo, useState } from 'react';
import { ITEM_BY_ID } from '../game/itemsCatalog';
import { ComputedStats } from '../game/mechanics';
import { ItemCategory, ItemDefinition, PlayerSave, RARITIES, RARITY_BY_ID, RarityId } from '../game/types';
import { Shield, Sparkles, Sword, Zap } from 'lucide-react';

interface InventoryPanelProps {
  save: PlayerSave;
  stats: ComputedStats;
  quickItemIds: string[];
  onEquipItem: (item: ItemDefinition) => void;
  onUseCombatItem: (item: ItemDefinition) => void;
  onAssignQuickItem: (slotIdx: number, itemId: string) => void;
}

const CATEGORY_TABS: { id: 'all' | ItemCategory; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'weapon', label: '武器' },
  { id: 'armor', label: '防具(鎧)' },
  { id: 'helm', label: '兜・冠' },
  { id: 'accessory', label: '装飾品' },
  { id: 'consumable', label: '戦闘消費' },
];

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  save,
  stats,
  quickItemIds,
  onEquipItem,
  onUseCombatItem,
  onAssignQuickItem,
}) => {
  const [catFilter, setCatFilter] = useState<'all' | ItemCategory>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | RarityId>('all');
  const [assigningSlot, setAssigningSlot] = useState<number | null>(null);

  const equippedSlots = [
    { label: '武器', item: ITEM_BY_ID[save.equippedWeaponId] },
    { label: '鎧', item: ITEM_BY_ID[save.equippedArmorId] },
    { label: '兜', item: ITEM_BY_ID[save.equippedHelmId] },
    { label: '装飾', item: ITEM_BY_ID[save.equippedAccessoryId] },
  ];

  const itemsList = useMemo(() => {
    return save.inventory
      .map((st) => ({ stack: st, def: ITEM_BY_ID[st.itemId] }))
      .filter((entry): entry is { stack: { itemId: string; qty: number }; def: ItemDefinition } => Boolean(entry.def))
      .filter((e) => (catFilter === 'all' ? true : e.def.category === catFilter))
      .filter((e) => (rarityFilter === 'all' ? true : e.def.rarity === rarityFilter))
      .sort((a, b) => RARITY_BY_ID[b.def.rarity].rank - RARITY_BY_ID[a.def.rarity].rank);
  }, [save.inventory, catFilter, rarityFilter]);

  const isEquipped = (id: string) =>
    save.equippedWeaponId === id ||
    save.equippedArmorId === id ||
    save.equippedHelmId === id ||
    save.equippedAccessoryId === id;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">装備・アイテム管理</h2>
            <p className="text-xs text-slate-400 mt-1">
              すべての武器・防具・消費品はアイテム判定であり、戦闘中に直接使用することもできます
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono-num">
            <span className="text-slate-300">総合戦闘力 <strong className="text-amber-400">{stats.combatPower.toLocaleString()}</strong></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">ATK <strong className="text-white">{stats.atk}</strong></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">DEF <strong className="text-white">{stats.def}</strong></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">CRIT <strong className="text-white">{stats.critChance}%</strong></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">所持金 <strong className="text-amber-300">{save.gold.toLocaleString()} G</strong></span>
          </div>
        </div>

        {/* Equipped Gear + Quick Combat Item Slots */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              現在の装備スロット
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {equippedSlots.map(({ label, item }) => {
                const rMeta = item ? RARITY_BY_ID[item.rarity] : null;
                return (
                  <div
                    key={label}
                    className={`p-3 rounded-lg border ${rMeta ? `${rMeta.bgClass} ${rMeta.borderClass}` : 'bg-slate-950 border-slate-800'}`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{label}</span>
                      {rMeta && <span style={{ color: rMeta.color }} className="font-semibold">{rMeta.label}</span>}
                    </div>
                    <p className="text-sm font-bold text-white mt-1 truncate">{item ? item.name : '未装備'}</p>
                    {item && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-300 font-mono-num">
                          ATK+{item.atkBonus} DEF+{item.defBonus} HP+{item.hpBonus}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUseCombatItem(item)}
                          className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer"
                        >
                          効果発動
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              戦闘アイテムクイックスロット（Z / X / C）
            </h3>
            <p className="text-xs text-slate-400">
              スロットを選んで下のアイテム一覧からセットすると戦闘中にキー1つで発動できます
            </p>
            <div className="space-y-2">
              {['Z', 'X', 'C'].map((keyLabel, idx) => {
                const qId = quickItemIds[idx];
                const qItem = qId ? ITEM_BY_ID[qId] : null;
                const rMeta = qItem ? RARITY_BY_ID[qItem.rarity] : null;
                const active = assigningSlot === idx;
                return (
                  <div
                    key={keyLabel}
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      active ? 'border-amber-400 bg-amber-950/30' : 'border-slate-800 bg-slate-950/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded bg-slate-800 text-amber-300 font-mono-num text-xs font-bold flex items-center justify-center shrink-0">
                        {keyLabel}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {qItem ? qItem.name : '未セット'}
                        </p>
                        {rMeta && (
                          <span className="text-xs" style={{ color: rMeta.color }}>
                            {rMeta.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssigningSlot(active ? null : idx)}
                      className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 cursor-pointer"
                    >
                      {active ? '選択中...' : '変更'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCatFilter(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  catFilter === t.id ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as 'all' | RarityId)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="all">全レアリティ表示</option>
            {RARITIES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Item Grid */}
        {itemsList.length === 0 ? (
          <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-400">
            条件に一致する所持アイテムがありません。モンスターを討伐するか合成工房で生成しましょう。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {itemsList.map(({ stack, def }) => {
              const rMeta = RARITY_BY_ID[def.rarity];
              const eq = isEquipped(def.id);
              return (
                <div
                  key={def.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${rMeta.bgClass} ${rMeta.borderClass}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: rMeta.color }} className="font-bold">
                        {rMeta.label}
                      </span>
                      <span className="font-mono-num text-slate-300">所持数 x{stack.qty}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sword className="w-3.5 h-3.5 shrink-0" style={{ color: rMeta.color }} />
                      <span className="truncate">{def.name}</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{def.description}</p>
                    <div className="text-xs text-slate-200 font-mono-num pt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {def.atkBonus !== 0 && <span>ATK +{def.atkBonus}</span>}
                      {def.defBonus !== 0 && <span>DEF +{def.defBonus}</span>}
                      {def.hpBonus !== 0 && <span>HP +{def.hpBonus}</span>}
                      {def.mpBonus !== 0 && <span>MP +{def.mpBonus}</span>}
                      {def.critBonus !== 0 && <span>CRIT +{def.critBonus}%</span>}
                      {def.healHp > 0 && <span className="text-emerald-300">回復HP +{def.healHp}</span>}
                      {def.combatDamage > 0 && <span className="text-amber-300">発動DMG {def.combatDamage}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                    {def.category !== 'consumable' && (
                      <button
                        type="button"
                        onClick={() => onEquipItem(def)}
                        disabled={eq}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                          eq
                            ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                            : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700'
                        }`}
                      >
                        {eq ? '装備中' : '装備する'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onUseCombatItem(def)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      戦闘使用
                    </button>

                    {assigningSlot !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          onAssignQuickItem(assigningSlot, def.id);
                          setAssigningSlot(null);
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors cursor-pointer"
                      >
                        スロット{['Z', 'X', 'C'][assigningSlot]}にセット
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
