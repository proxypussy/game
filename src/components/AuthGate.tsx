import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { PLAYER_CLASSES, PlayerClassId } from '../game/types';
import { signInWithGoogle, signOutUser } from '../services/firebase';
import { LogIn, Shield, Sparkles, Swords, UserPlus } from 'lucide-react';

interface AuthGateProps {
  authUser: User | null;
  authLoading: boolean;
  needsRegistration: boolean;
  onCreateAccount: (params: {
    displayName: string;
    playerClass: PlayerClassId;
    hairColor: string;
    armorColor: string;
    bio: string;
  }) => Promise<void>;
}

const HAIR_SWATCHES = ['#1E293B', '#E2E8F0', '#451A03', '#991B1B', '#1D4ED8', '#6D28D9', '#D97706', '#047857'];
const ARMOR_SWATCHES = ['#991B1B', '#312E81', '#065F46', '#6D28D9', '#334155', '#B45309', '#0E7490', '#831843'];

export const AuthGate: React.FC<AuthGateProps> = ({
  authUser,
  authLoading,
  needsRegistration,
  onCreateAccount,
}) => {
  const [selectedClass, setSelectedClass] = useState<PlayerClassId>('blade_knight');
  const [displayName, setDisplayName] = useState(authUser?.displayName?.slice(0, 20) || 'アストラル騎士');
  const [bio, setBio] = useState('未知のシークレット装備を求めて旅する開拓者');
  const [hairColor, setHairColor] = useState(PLAYER_CLASSES.blade_knight.defaultHairColor);
  const [armorColor, setArmorColor] = useState(PLAYER_CLASSES.blade_knight.defaultArmorColor);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectClass = (cid: PlayerClassId) => {
    setSelectedClass(cid);
    setHairColor(PLAYER_CLASSES[cid].defaultHairColor);
    setArmorColor(PLAYER_CLASSES[cid].defaultArmorColor);
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ログインに失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('プレイヤー名を入力してください。');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onCreateAccount({
        displayName: displayName.trim(),
        playerClass: selectedClass,
        hairColor,
        armorColor,
        bio,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'アカウント作成に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">ワールドデータを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
        {!authUser ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 min-h-[340px]">
              <img
                src="/src/assets/images/title_key_art_1794995264980.jpg"
                alt="Aetheria Chronicles 2D Open World RPG"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 space-y-2">
                <p className="text-xs font-medium text-amber-300 tracking-wide">
                  10段階レアリティ · 150種モンスター · 400種スキル · 拠点建築
                </p>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-white leading-tight">
                  Aetheria Chronicles
                </h1>
                <p className="text-sm text-slate-200 max-w-xl leading-relaxed">
                  6つの広大なオープンワールドをワープゲートで巡り、レアリティ合成・拠点防衛建築・仲間とのリアルタイムマルチプレイに挑む本格2DアクションRPG。
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 lg:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">アカウント作成・ログイン</h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Googleアカウントで認証して冒険データ・建築拠点・フレンド・ランキング記録をクラウドに永久保存します。
                </p>

                <div className="space-y-3 pt-2 text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <Swords className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>コモンからシークレットまで全10段階の武具・400種のスキルを収集＆合成</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>聖域エリアに城壁・鍛冶工房・自動防衛砲台を建築し、フレンドの拠点も訪問可能</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>WebSocketリアルタイムマルチプレイで同じマップの冒険者と共闘</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-700/60 text-xs text-rose-200">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={submitting}
                  className="w-full py-3 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  {submitting ? '認証中...' : 'Googleでログイン / 新規アカウント作成'}
                </button>
              </div>
            </div>
          </div>
        ) : needsRegistration ? (
          <form onSubmit={handleRegister} className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">新規キャラクター・アカウント作成</h1>
                <p className="text-sm text-slate-400 mt-1">
                  職業と外見デザインを決定してエテリア大陸へ出発しましょう
                </p>
              </div>
              <button
                type="button"
                onClick={() => signOutUser()}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                別アカウントに切り替え
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.values(PLAYER_CLASSES).map((cls) => {
                const active = selectedClass === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleSelectClass(cls.id)}
                    className={`text-left rounded-xl overflow-hidden border transition-all cursor-pointer ${
                      active
                        ? 'border-amber-400 bg-slate-800/90 ring-1 ring-amber-400/50'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="aspect-square w-full bg-slate-900 overflow-hidden">
                      <img
                        src={cls.portraitUrl}
                        alt={cls.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-white">{cls.name}</span>
                        <span className="text-xs text-amber-400 font-mono-num">ATK {cls.baseAtk}</span>
                      </div>
                      <p className="text-xs text-slate-400">{cls.role}</p>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{cls.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">プレイヤー名（24文字以内）</label>
                <input
                  type="text"
                  maxLength={24}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="例：レオンハルト"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">髪色・装甲アクセントカラー</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    {HAIR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setHairColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 ${
                          hairColor === c ? 'border-white scale-110' : 'border-slate-700'
                        }`}
                        aria-label={`髪色 ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {ARMOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setArmorColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-md border-2 ${
                        armorColor === c ? 'border-amber-300 scale-110' : 'border-slate-700'
                      }`}
                      aria-label={`装甲色 ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">自己紹介（120文字以内）</label>
                <input
                  type="text"
                  maxLength={120}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-700/60 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                {submitting ? 'アカウントを作成中...' : 'このキャラクターで冒険を始める'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
};
