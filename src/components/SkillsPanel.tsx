import React, { useMemo, useState } from 'react';
import { SKILLS, SKILL_BY_ID } from '../game/skillsCatalog';
import { PlayerSave, RARITIES, RARITY_BY_ID, RarityId, SkillElement } from '../game/types';
import { Flame, Sparkles } from 'lucide-react';

interface SkillsPanelProps {
  save: PlayerSave;
  onEquipSkillToSlot: (slotIdx: number, skillId: string) => void;
}

const ELEMENTS: { id: 'all' | SkillElement; label: string }[] = [
  { id: 'all', label: '全属性' },
  { id: 'slash', label: '斬撃' },
  { id: 'fire', label: '炎熱' },
  { id: 'ice', label: '氷結' },
  { id: 'lightning', label: '雷霆' },
  { id: 'holy', label: '聖光' },
  { id: 'shadow', label: '闇影' },
  { id: 'astral', label: '星辰' },
  { id: 'nature', label: '翠嵐' },
];

export const SkillsPanel: React.FC<SkillsPanelProps> = ({ save, onEquipSkillToSlot }) => {
  const [selectedRarity, setSelectedRarity] = useState<RarityId>('common');
  const [elementFilter, setElementFilter] = useState<'all' | SkillElement>('all');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number>(0);

  const ownedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of save.ownedSkills) {
      map.set(s.skillId, s.qty);
    }
    return map;
  }, [save.ownedSkills]);

  const rarityStats = useMemo(() => {
    const counts: Record<RarityId, number> = {
      common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0,
      mythic: 0, arcane: 0, astral: 0, infinity: 0, secret: 0,
    };
    for (const st of save.ownedSkills) {
      const sk = SKILL_BY_ID[st.skillId];
      if (sk && st.qty > 0) counts[sk.rarity]++;
    }
    return counts;
  }, [save.ownedSkills]);

  const filteredSkills = useMemo(() => {
    return SKILLS.filter((sk) => sk.rarity === selectedRarity)
      .filter((sk) => (elementFilter === 'all' ? true : sk.element === elementFilter))
      .filter((sk) => (!ownedOnly ? true : (ownedMap.get(sk.id) || 0) > 0));
  }, [selectedRarity, elementFilter, ownedOnly, ownedMap]);

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">スキル図鑑・ホットバー編成（全400種）</h2>
            <p className="text-xs text-slate-400 mt-1">
              10レアリティ × 各40スキル（合計400種）。下の1〜6スロットを選択して習得済みスキルを装備します
            </p>
          </div>
          <div className="text-xs font-mono-num text-slate-300">
            習得済み種類 <strong className="text-amber-400">{save.ownedSkills.length}</strong> / 400
          </div>
        </div>

        {/* 6 Active Skill Hotbar Slots */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            装備中スキル（キーボード 1 〜 6 で発動・クリックで入替先スロットを選択）
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
              const skId = save.equippedSkills[slotIdx];
              const sk = skId ? SKILL_BY_ID[skId] : null;
              const rMeta = sk ? RARITY_BY_ID[sk.rarity] : null;
              const isSel = activeSlot === slotIdx;
              return (
                <button
                  key={slotIdx}
                  type="button"
                  onClick={() => setActiveSlot(slotIdx)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    isSel
                      ? 'border-amber-400 bg-amber-950/35 ring-1 ring-amber-400/50'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-num font-bold text-amber-300">[{slotIdx + 1}]</span>
                    {rMeta && <span style={{ color: rMeta.color }}>{rMeta.label}</span>}
                  </div>
                  <p className="text-xs font-bold text-white mt-1.5 truncate">{sk ? sk.name : '空きスロット'}</p>
                  {sk && (
                    <p className="text-xs text-slate-400 font-mono-num mt-0.5">
                      MP {sk.mpCost} · {sk.powerMult}x
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 10 Rarity Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {RARITIES.map((r) => {
            const active = selectedRarity === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRarity(r.id)}
                style={{ borderColor: active ? r.color : undefined }}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active ? 'bg-slate-800 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span style={{ color: r.color }}>{r.label}</span>
                <span className="ml-1.5 font-mono-num text-slate-400">({rarityStats[r.id]}/40)</span>
              </button>
            );
          })}
        </div>

        {/* Element & Owned Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {ELEMENTS.map((el) => (
              <button
                key={el.id}
                type="button"
                onClick={() => setElementFilter(el.id)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  elementFilter === el.id ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {el.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={ownedOnly}
              onChange={(e) => setOwnedOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-amber-500"
            />
            習得済みスキルのみ表示
          </label>
        </div>

        {/* Skills Grid (40 per rarity) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredSkills.map((sk) => {
            const qty = ownedMap.get(sk.id) || 0;
            const rMeta = RARITY_BY_ID[sk.rarity];
            const equippedIdx = save.equippedSkills.indexOf(sk.id);
            return (
              <div
                key={sk.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                  qty > 0
                    ? `${rMeta.bgClass} ${rMeta.borderClass}`
                    : 'bg-slate-900/40 border-slate-800/70 opacity-65'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: rMeta.color }} className="font-bold">
                      {rMeta.label}
                    </span>
                    <span className="font-mono-num text-slate-300">
                      {qty > 0 ? `所持 x${qty}` : '未習得'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: sk.color }} />
                    <span className="truncate">{sk.name}</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{sk.description}</p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono-num text-slate-400">
                    CD {(sk.cooldownMs / 1000).toFixed(1)}s
                  </span>
                  {qty > 0 ? (
                    <button
                      type="button"
                      onClick={() => onEquipSkillToSlot(activeSlot, sk.id)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                        equippedIdx !== -1
                          ? 'bg-emerald-900/70 text-emerald-300'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      {equippedIdx !== -1 ? `スロット${equippedIdx + 1}装備中` : `スロット${activeSlot + 1}へセット`}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">敵ドロップ/合成で獲得</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
