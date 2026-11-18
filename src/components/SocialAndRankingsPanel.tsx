import React, { useEffect, useState } from 'react';
import {
  acceptFriendRequest,
  fetchLeaderboard,
  fetchPublicProfilesByIds,
  LeaderboardCategory,
  mapDisplayName,
  removeFriendship,
  searchProfileByFriendCode,
  sendFriendRequest,
  signOutUser,
  updateProfileAppearance,
} from '../services/firebase';
import { FriendshipRecord, MapId, PLAYER_CLASSES, PlayerClassId, PublicProfile } from '../game/types';
import { Check, Copy, Home, LogOut, Navigation, Search, Trophy, UserCheck, UserPlus, Users, X } from 'lucide-react';

interface SocialAndRankingsPanelProps {
  profile: PublicProfile;
  friendships: FriendshipRecord[];
  onVisitBase: (ownerId: string, ownerName: string) => void;
  onWarpToMap: (mapId: MapId) => void;
  onProfileUpdated: (updated: Partial<PublicProfile>) => void;
}

const RANK_TABS: { id: LeaderboardCategory; label: string; unit: string }[] = [
  { id: 'combatPower', label: '総合戦闘力', unit: '' },
  { id: 'enemiesDefeated', label: 'モンスター討伐数', unit: '体' },
  { id: 'level', label: 'キャラクターレベル', unit: '' },
  { id: 'bestiaryCount', label: '図鑑コンプリート', unit: '/150' },
  { id: 'rarityScore', label: 'レア収集スコア', unit: 'pt' },
];

const HAIR_SWATCHES = ['#1E293B', '#E2E8F0', '#451A03', '#991B1B', '#1D4ED8', '#6D28D9', '#D97706', '#047857'];
const ARMOR_SWATCHES = ['#991B1B', '#312E81', '#065F46', '#6D28D9', '#334155', '#B45309', '#0E7490', '#831843'];

export const SocialAndRankingsPanel: React.FC<SocialAndRankingsPanelProps> = ({
  profile,
  friendships,
  onVisitBase,
  onWarpToMap,
  onProfileUpdated,
}) => {
  const [subTab, setSubTab] = useState<'friends' | 'rankings' | 'account'>('friends');
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<PublicProfile | null>(null);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const [friendProfiles, setFriendProfiles] = useState<Record<string, PublicProfile>>({});
  const [rankCategory, setRankCategory] = useState<LeaderboardCategory>('combatPower');
  const [leaderboard, setLeaderboard] = useState<PublicProfile[]>([]);
  const [loadingRank, setLoadingRank] = useState(false);

  // Account edit states
  const [editName, setEditName] = useState(profile.displayName);
  const [editClass, setEditClass] = useState<PlayerClassId>(profile.playerClass);
  const [editHair, setEditHair] = useState(profile.hairColor);
  const [editArmor, setEditArmor] = useState(profile.armorColor);
  const [editBio, setEditBio] = useState(profile.bio || '');
  const [saveNotice, setSaveNotice] = useState('');

  useEffect(() => {
    const otherIds = friendships
      .map((f) => (f.requesterId === profile.uid ? f.recipientId : f.requesterId))
      .filter((id) => id !== profile.uid);
    if (otherIds.length > 0) {
      fetchPublicProfilesByIds(otherIds).then(setFriendProfiles).catch(console.error);
    }
  }, [friendships, profile.uid]);

  useEffect(() => {
    if (subTab === 'rankings') {
      setLoadingRank(true);
      fetchLeaderboard(rankCategory)
        .then(setLeaderboard)
        .finally(() => setLoadingRank(false));
    }
  }, [subTab, rankCategory]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(profile.friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchStatus('');
    setSearchResult(null);
    const res = await searchProfileByFriendCode(searchCode);
    if (!res) {
      setSearchStatus('該当するフレンドコードが見つかりませんでした。');
    } else if (res.uid === profile.uid) {
      setSearchStatus('あなた自身のアカウントです。');
    } else {
      setSearchResult(res);
    }
  };

  const handleSendRequest = async (target: PublicProfile) => {
    await sendFriendRequest(profile, target);
    setSearchStatus(`${target.displayName} にフレンド申請を送信しました。`);
    setSearchResult(null);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveNotice('');
    await updateProfileAppearance(profile.uid, {
      displayName: editName,
      playerClass: editClass,
      hairColor: editHair,
      armorColor: editArmor,
      bio: editBio,
    });
    onProfileUpdated({
      displayName: editName,
      playerClass: editClass,
      hairColor: editHair,
      armorColor: editArmor,
      bio: editBio,
    });
    setSaveNotice('アカウント・キャラクター設定を保存しました。');
  };

  const pendingIncoming = friendships.filter((f) => f.status === 'pending' && f.recipientId === profile.uid);
  const pendingOutgoing = friendships.filter((f) => f.status === 'pending' && f.requesterId === profile.uid);
  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setSubTab('friends')}
              className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                subTab === 'friends' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              フレンド管理
            </button>
            <button
              type="button"
              onClick={() => setSubTab('rankings')}
              className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                subTab === 'rankings' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              ランキング
            </button>
            <button
              type="button"
              onClick={() => setSubTab('account')}
              className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                subTab === 'account' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              アカウント・キャラ設定
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">あなたのフレンドコード:</span>
            <span className="font-mono-num font-bold text-amber-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded">
              {profile.friendCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'コピー済' : 'コピー'}
            </button>
          </div>
        </div>

        {subTab === 'friends' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">フレンド検索・申請</h3>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="例: ARC-XXXXXX"
                    className="flex-1 px-3 py-2 text-xs font-mono-num bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    検索
                  </button>
                </form>

                {searchStatus && <p className="text-xs text-slate-300">{searchStatus}</p>}

                {searchResult && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{searchResult.displayName}</p>
                      <p className="text-xs text-slate-400 font-mono-num">
                        Lv.{searchResult.level} · 戦闘力 {searchResult.combatPower.toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendRequest(searchResult)}
                      className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      申請
                    </button>
                  </div>
                )}
              </div>

              {pendingIncoming.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-amber-300">届いているフレンド申請</h3>
                  <div className="space-y-2">
                    {pendingIncoming.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-sm font-semibold text-white">{req.requesterName}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => acceptFriendRequest(req.id)}
                            className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                          >
                            承認
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFriendship(req.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-900 text-slate-300 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingOutgoing.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                  <h3 className="text-xs font-bold text-slate-400">送信済み（承認待ち）</h3>
                  {pendingOutgoing.map((req) => (
                    <div key={req.id} className="flex items-center justify-between text-xs text-slate-300 py-1">
                      <span>{req.recipientName}</span>
                      <button
                        type="button"
                        onClick={() => removeFriendship(req.id)}
                        className="text-slate-500 hover:text-rose-400 cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">フレンド一覧（{acceptedFriends.length}人）</h3>
              {acceptedFriends.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400">
                  まだフレンドがいません。ランキングやフレンドコードから仲間を追加して、お互いの拠点を訪問しましょう！
                </div>
              ) : (
                <div className="space-y-3">
                  {acceptedFriends.map((f) => {
                    const otherId = f.requesterId === profile.uid ? f.recipientId : f.requesterId;
                    const fp = friendProfiles[otherId];
                    const name = fp?.displayName || (f.requesterId === profile.uid ? f.recipientName : f.requesterName);
                    return (
                      <div key={f.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {fp && (
                            <img
                              src={PLAYER_CLASSES[fp.playerClass].portraitUrl}
                              alt={name}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-lg object-cover border border-slate-700"
                            />
                          )}
                          <div>
                            <p className="text-sm font-bold text-white">{name}</p>
                            {fp ? (
                              <p className="text-xs text-slate-400 font-mono-num">
                                Lv.{fp.level} · 戦闘力 {fp.combatPower.toLocaleString()} · {mapDisplayName(fp.currentMapId)}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500">プロフィール読込中...</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onVisitBase(otherId, name)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Home className="w-3.5 h-3.5" />
                            拠点訪問
                          </button>
                          {fp && (
                            <button
                              type="button"
                              onClick={() => onWarpToMap(fp.currentMapId)}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              合流ワープ
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFriendship(f.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs cursor-pointer"
                          >
                            解除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === 'rankings' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 w-fit">
              {RANK_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRankCategory(t.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    rankCategory === t.id ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {loadingRank ? (
                <div className="p-10 text-center text-xs text-slate-400">ランキングを集計中...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">順位</th>
                        <th className="px-4 py-3 font-semibold">開拓者</th>
                        <th className="px-4 py-3 font-semibold">職業</th>
                        <th className="px-4 py-3 font-semibold">現在地</th>
                        <th className="px-4 py-3 font-semibold text-right">スコア</th>
                        <th className="px-4 py-3 font-semibold text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {leaderboard.map((row, idx) => {
                        const val = row[rankCategory];
                        const unit = RANK_TABS.find((t) => t.id === rankCategory)?.unit || '';
                        const isMe = row.uid === profile.uid;
                        return (
                          <tr key={row.uid} className={isMe ? 'bg-amber-950/25' : 'hover:bg-slate-800/40'}>
                            <td className="px-4 py-3 font-mono-num font-bold text-amber-400">#{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-white">{row.displayName}</div>
                              <div className="text-slate-400 font-mono-num">{row.friendCode}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-300">{PLAYER_CLASSES[row.playerClass].name}</td>
                            <td className="px-4 py-3 text-slate-400">{mapDisplayName(row.currentMapId)}</td>
                            <td className="px-4 py-3 text-right font-mono-num font-bold text-white">
                              {Number(val).toLocaleString()} {unit}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => onVisitBase(row.uid, row.displayName)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 cursor-pointer"
                              >
                                拠点を見る
                              </button>
                              {!isMe && (
                                <button
                                  type="button"
                                  onClick={() => handleSendRequest(row)}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 cursor-pointer"
                                >
                                  フレンド申請
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === 'account' && (
          <form onSubmit={handleSaveAccount} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">キャラクター外見・アカウント設定</h3>
                <p className="text-xs text-slate-400 mt-0.5">職業クラスやカラーリングはいつでも変更可能です</p>
              </div>
              <button
                type="button"
                onClick={() => signOutUser()}
                className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                ログアウト
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.values(PLAYER_CLASSES).map((cls) => {
                const active = editClass === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setEditClass(cls.id)}
                    className={`rounded-xl overflow-hidden border text-left transition-all cursor-pointer ${
                      active ? 'border-amber-400 bg-slate-800' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={cls.portraitUrl}
                      alt={cls.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-36 object-cover"
                    />
                    <div className="p-3">
                      <div className="text-sm font-bold text-white">{cls.name}</div>
                      <div className="text-xs text-slate-400">{cls.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">プレイヤー名</label>
                <input
                  type="text"
                  maxLength={24}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">髪色・装甲色</label>
                <div className="flex items-center gap-1.5">
                  {HAIR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditHair(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 ${editHair === c ? 'border-white' : 'border-slate-700'}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {ARMOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditArmor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-md border-2 ${editArmor === c ? 'border-amber-300' : 'border-slate-700'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">自己紹介</label>
                <input
                  type="text"
                  maxLength={120}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>
            </div>

            {saveNotice && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-xs text-emerald-200">
                {saveNotice}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                変更を保存する
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
