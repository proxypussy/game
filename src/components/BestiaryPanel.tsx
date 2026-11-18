import React, { useMemo, useState } from 'react';
import { ENEMIES } from '../game/enemiesCatalog';
import { WORLD_MAP_LIST, WORLD_MAPS } from '../game/mapsCatalog';
import { MapId, PlayerSave, RARITIES, RARITY_BY_ID, RarityId } from '../game/types';
import { Crown, Skull } from 'lucide-react';

interface BestiaryPanelProps {
  save: PlayerSave;
}

export const BestiaryPanel: React.FC<BestiaryPanelProps> = ({ save }) => {
  const [rarityFilter, setRarityFilter] = useState<'all' | RarityId>('all');
  const [mapFilter, setMapFilter] = useState<'all' | MapId>('all');

  const discoveredSet = useMemo(() => new Set(save.discoveredEnemies), [save.discoveredEnemies]);

  const filtered = useMemo(() => {
    return ENEMIES.filter((e) => (rarityFilter === 'all' ? true : e.rarity === rarityFilter)).filter((e) =>
      mapFilter === 'all' ? true : e.mapId === mapFilter,
    );
  }, [rarityFilter, mapFilter]);

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">モンスター図鑑（全150種類）</h2>
            <p className="text-xs text-slate-400 mt-1">
              6つのマップに生息する全150種の敵を討伐・登録。高レアリティほど強大で希少な武具・スキルをドロップします
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono-num">
            <span className="text-slate-300">
              発見数 <strong className="text-amber-400">{save.discoveredEnemies.length}</strong> / 150
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">
              総討伐数 <strong className="text-emerald-400">{save.enemiesDefeated.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as 'all' | RarityId)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="all">全レアリティ（150種）</option>
            {RARITIES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={mapFilter}
            onChange={(e) => setMapFilter(e.target.value as 'all' | MapId)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="all">全マップ</option>
            {WORLD_MAP_LIST.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((enemy) => {
            const discovered = discoveredSet.has(enemy.id);
            const rMeta = RARITY_BY_ID[enemy.rarity];
            const mapName = WORLD_MAPS[enemy.mapId].name;

            return (
              <div
                key={enemy.id}
                className={`p-4 rounded-xl border space-y-2 ${
                  discovered ? `${rMeta.bgClass} ${rMeta.borderClass}` : 'bg-slate-900/50 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-num text-slate-400">No.{String(enemy.index).padStart(3, '0')}</span>
                  <span style={{ color: rMeta.color }} className="font-bold">
                    {rMeta.label}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  {enemy.isBoss ? (
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Skull className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{discovered ? enemy.name : '未発見のモンスター'}</span>
                </h4>

                <div className="text-xs text-slate-400">
                  出現地: <span className="text-slate-200">{mapName}</span>
                </div>

                {discovered ? (
                  <>
                    <div className="text-xs font-mono-num text-slate-200 flex flex-wrap gap-x-3 gap-y-1">
                      <span>HP {enemy.maxHp.toLocaleString()}</span>
                      <span>ATK {enemy.atk.toLocaleString()}</span>
                      <span>DEF {enemy.def.toLocaleString()}</span>
                      <span>EXP {enemy.expReward.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{enemy.lore}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    {mapName}を探索してこの存在を討伐すると詳細が解放されます。
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
