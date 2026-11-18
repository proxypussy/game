import React from 'react';
import { DAILY_BONUS_REWARDS, DailyBonusReward, RARITY_BY_ID } from '../game/types';
import { CalendarCheck, Check, Gift, Sparkles, X } from 'lucide-react';

interface DailyBonusModalProps {
  open: boolean;
  canClaim: boolean;
  currentStreak: number;
  nextRewardDay: number; // 1..7
  claimedNotice: string | null;
  onClaim: (reward: DailyBonusReward) => void;
  onClose: () => void;
}

export const DailyBonusModal: React.FC<DailyBonusModalProps> = ({
  open,
  canClaim,
  currentStreak,
  nextRewardDay,
  claimedNotice,
  onClaim,
  onClose,
}) => {
  if (!open) return null;

  const targetReward = DAILY_BONUS_REWARDS.find((r) => r.day === nextRewardDay) || DAILY_BONUS_REWARDS[0];

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-amber-400" />
              日替わりログインボーナス
            </h2>
            <p className="text-xs text-slate-400">
              毎日ログインしてゴールド・魔導粉塵・高レアリティ武具やスキルを受け取りましょう（連続ログイン{' '}
              <span className="font-mono-num font-bold text-amber-300">{currentStreak}日</span>）
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {DAILY_BONUS_REWARDS.map((r) => {
            const isPast = canClaim ? r.day < nextRewardDay : r.day <= nextRewardDay;
            const isToday = canClaim && r.day === nextRewardDay;
            const itemMeta = r.itemRarity ? RARITY_BY_ID[r.itemRarity] : null;
            const skillMeta = r.skillRarity ? RARITY_BY_ID[r.skillRarity] : null;

            return (
              <div
                key={r.day}
                className={`p-3 rounded-lg border flex flex-col justify-between space-y-2 ${
                  isToday
                    ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400/50'
                    : isPast
                      ? 'border-emerald-700/50 bg-emerald-950/25 opacity-80'
                      : 'border-slate-800 bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{r.label}</span>
                  {isPast && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>

                <div className="space-y-1 text-xs font-mono-num">
                  <div className="text-amber-300">+{r.gold.toLocaleString()} G</div>
                  <div className="text-cyan-300">粉塵 +{r.arcaneDust}</div>
                  {r.bonusPotionQty && <div className="text-emerald-300">秘薬 ×{r.bonusPotionQty}</div>}
                  {itemMeta && (
                    <div style={{ color: itemMeta.color }} className="font-semibold font-sans">
                      {itemMeta.label}装備
                    </div>
                  )}
                  {skillMeta && (
                    <div style={{ color: skillMeta.color }} className="font-semibold font-sans">
                      {skillMeta.label}スキル
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {claimedNotice && (
          <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-600/60 text-xs text-emerald-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{claimedNotice}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            {canClaim ? '本日の報酬が受取可能です' : '本日のログインボーナスは受取済みです'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              閉じる
            </button>
            <button
              type="button"
              disabled={!canClaim}
              onClick={() => onClaim(targetReward)}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              {canClaim ? `${targetReward.label}を受け取る` : '受取済み'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
