import React, { useMemo, useState } from 'react';
import { ITEM_BY_ID } from '../game/itemsCatalog';
import { ComputedStats, getSynthesisSuccessRate } from '../game/mechanics';
import { SKILL_BY_ID } from '../game/skillsCatalog';
import { ItemDefinition, PlayerSave, RARITIES, RARITY_BY_ID, RarityId, SkillDefinition } from '../game/types';
import { Anvil, ArrowRight, CheckCircle2, Sparkles, XCircle } from 'lucide-react';

interface SynthesisPanelProps {
  save: PlayerSave;
  stats: ComputedStats;
  onSynthesizeItems: (rarity: RarityId, itemIds: string[]) => { success: boolean; result?: ItemDefinition; dustRefund: number };
  onSynthesizeSkills: (rarity: RarityId, skillIds: string[]) => { success: boolean; result?: SkillDefinition; dustRefund: number };
}

export const SynthesisPanel: React.FC<SynthesisPanelProps> = ({
  save,
  stats,
  onSynthesizeItems,
  onSynthesizeSkills,
}) => {
  const [mode, setMode] = useState<'item' | 'skill'>('item');
  const [selectedRarity, setSelectedRarity] = useState<RarityId>('common');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    name?: string;
    nextRarityLabel?: string;
    nextRarityColor?: string;
    dustRefund: number;
  } | null>(null);

  const synthRarities = RARITIES.slice(0, 9); // Common -> Infinity (upgrades to Secret)
  const rMeta = RARITY_BY_ID[selectedRarity];
  const nextMeta = RARITIES[rMeta.rank + 1];
  const rate = getSynthesisSuccessRate(selectedRarity, stats.forgeBonusPct);

  // Build individual selectable units for selected rarity
  const availableItems = useMemo(() => {
    const out: { key: string; def: ItemDefinition }[] = [];
    for (const st of save.inventory) {
      const def = ITEM_BY_ID[st.itemId];
      if (!def || def.rarity !== selectedRarity) continue;
      // Keep 1 copy if currently equipped
      const equippedCount =
        (save.equippedWeaponId === def.id ? 1 : 0) +
        (save.equippedArmorId === def.id ? 1 : 0) +
        (save.equippedHelmId === def.id ? 1 : 0) +
        (save.equippedAccessoryId === def.id ? 1 : 0);
      const usableQty = Math.max(0, st.qty - equippedCount);
      for (let i = 0; i < Math.min(usableQty, 12); i++) {
        out.push({ key: `${def.id}__${i}`, def });
      }
    }
    return out;
  }, [save, selectedRarity]);

  const availableSkills = useMemo(() => {
    const out: { key: string; def: SkillDefinition }[] = [];
    for (const st of save.ownedSkills) {
      const def = SKILL_BY_ID[st.skillId];
      if (!def || def.rarity !== selectedRarity) continue;
      const isEquipped = save.equippedSkills.includes(def.id) ? 1 : 0;
      const usableQty = Math.max(0, st.qty - isEquipped);
      for (let i = 0; i < Math.min(usableQty, 12); i++) {
        out.push({ key: `${def.id}__${i}`, def });
      }
    }
    return out;
  }, [save, selectedRarity]);

  const toggleSelectKey = (key: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return [...prev.slice(1), key];
      return [...prev, key];
    });
  };

  const handleAutoPick = () => {
    const pool = mode === 'item' ? availableItems : availableSkills;
    if (pool.length >= 3) {
      setSelectedIds(pool.slice(0, 3).map((p) => p.key));
    }
  };

  const handleExecute = () => {
    if (selectedIds.length !== 3) return;
    const rawIds = selectedIds.map((k) => k.split('__')[0]);
    if (mode === 'item') {
      const res = onSynthesizeItems(selectedRarity, rawIds);
      setLastResult({
        success: res.success,
        name: res.result?.name,
        nextRarityLabel: nextMeta.label,
        nextRarityColor: nextMeta.color,
        dustRefund: res.dustRefund,
      });
    } else {
      const res = onSynthesizeSkills(selectedRarity, rawIds);
      setLastResult({
        success: res.success,
        name: res.result?.name,
        nextRarityLabel: nextMeta.label,
        nextRarityColor: nextMeta.color,
        dustRefund: res.dustRefund,
      });
    }
    setSelectedIds([]);
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">合成工房（レアリティ昇格）</h2>
            <p className="text-xs text-slate-400 mt-1">
              同じレアリティのアイテム（またはスキル）を3つ合成して1段階上のレアリティを生成します。高レアほど失敗確率が上昇します
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono-num">
            <span className="text-slate-300">拠点鍛冶ボーナス <strong className="text-emerald-400">+{stats.forgeBonusPct}%</strong></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">魔導粉塵 <strong className="text-cyan-300">{save.arcaneDust}</strong></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">成功 {save.synthesesSucceeded}/{save.synthesesAttempted}</span>
          </div>
        </div>

        {/* Mode Switch */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => {
              setMode('item');
              setSelectedIds([]);
              setLastResult(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'item' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            アイテム合成
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('skill');
              setSelectedIds([]);
              setLastResult(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'skill' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            スキル合成
          </button>
        </div>

        {/* Rarity Tier Selector */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {synthRarities.map((r) => {
            const active = selectedRarity === r.id;
            const tierRate = getSynthesisSuccessRate(r.id, stats.forgeBonusPct);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRarity(r.id);
                  setSelectedIds([]);
                }}
                style={{ borderColor: active ? r.color : undefined }}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  active ? 'bg-slate-800' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold truncate" style={{ color: r.color }}>
                  {r.label}
                </div>
                <div className="text-xs font-mono-num text-slate-400 mt-1">成功率 {tierRate}%</div>
              </button>
            );
          })}
        </div>

        {/* Synthesis Chamber */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm font-bold">
              <span style={{ color: rMeta.color }}>{rMeta.label} ×3</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span style={{ color: nextMeta.color }}>{nextMeta.label} ×1</span>
              <span className="text-xs font-mono-num text-slate-300 ml-2">
                成功確率 <strong className={rate >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{rate}%</strong>
                （失敗時：素材消滅・魔導粉塵 +{(rMeta.rank + 1) * 4}）
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoPick}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                自動で3つ選択
              </button>
              <button
                type="button"
                disabled={selectedIds.length !== 3}
                onClick={handleExecute}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 flex items-center gap-1.5 cursor-pointer"
              >
                <Anvil className="w-4 h-4" />
                合成を実行 ({selectedIds.length}/3)
              </button>
            </div>
          </div>

          {lastResult && (
            <div
              className={`p-4 rounded-lg border flex items-center gap-3 ${
                lastResult.success
                  ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-700/60 text-rose-200'
              }`}
            >
              {lastResult.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-sm">
                    合成成功！ <strong style={{ color: lastResult.nextRarityColor }}>[{lastResult.nextRarityLabel}] {lastResult.name}</strong> を獲得しました！
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <div className="text-sm">
                    合成に失敗しました…素材は失われましたが、魔導粉塵を <strong>+{lastResult.dustRefund}</strong> 回収しました。
                  </div>
                </>
              )}
            </div>
          )}

          {/* Available pool */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              素材選択（装備中・ホットバー装備中の最後の1つは保護され一覧に表示されません）
            </p>
            {(mode === 'item' ? availableItems : availableSkills).length === 0 ? (
              <div className="p-8 text-center rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
                このレアリティの合成可能な余剰{mode === 'item' ? 'アイテム' : 'スキル'}がありません。
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {(mode === 'item' ? availableItems : availableSkills).map((entry) => {
                  const chosen = selectedIds.includes(entry.key);
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => toggleSelectKey(entry.key)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        chosen
                          ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400/50'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: rMeta.color }} className="font-semibold">
                          {rMeta.label}
                        </span>
                        {chosen && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-xs font-bold text-white mt-1 truncate">{entry.def.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
