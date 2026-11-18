import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { AuthGate } from './components/AuthGate';
import { BestiaryPanel } from './components/BestiaryPanel';
import { DailyBonusModal } from './components/DailyBonusModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameCanvas } from './components/GameCanvas';
import { InventoryPanel } from './components/InventoryPanel';
import { SkillsPanel } from './components/SkillsPanel';
import { SocialAndRankingsPanel } from './components/SocialAndRankingsPanel';
import { SynthesisPanel } from './components/SynthesisPanel';
import { soundEngine } from './game/audio';
import { getRandomItemByRarity } from './game/itemsCatalog';
import { WORLD_MAPS } from './game/mapsCatalog';
import { getRandomSkillByRarity } from './game/skillsCatalog';
import {
  addItemToInventory,
  addSkillToOwned,
  computePlayerStats,
  computeRarityScore,
  EnemyDropResult,
  expRequiredForLevel,
  performItemSynthesis,
  performSkillSynthesis,
  removeItemFromInventory,
  removeSkillFromOwned,
} from './game/mechanics';
import {
  DailyBonusReward,
  EnemyDefinition,
  FriendshipRecord,
  ItemDefinition,
  MapId,
  PlacedStructure,
  PlayerBase,
  PlayerClassId,
  PlayerSave,
  PublicProfile,
  RARITY_BY_ID,
  RarityId,
  RemotePlayerState,
} from './game/types';
import {
  createPlayerAccount,
  loadAccountData,
  loadBaseByOwnerId,
  onAuthChange,
  savePlayerBase,
  savePlayerProgress,
  subscribeFriendships,
} from './services/firebase';
import { ChatMessage, MultiplayerClient } from './services/multiplayer';
import { Save } from 'lucide-react';

type ActiveTab = 'world' | 'inventory' | 'skills' | 'synthesis' | 'bestiary' | 'social';

function MainApp() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [save, setSave] = useState<PlayerSave | null>(null);
  const [playerBase, setPlayerBase] = useState<PlayerBase | null>(null);
  const [visitingBase, setVisitingBase] = useState<PlayerBase | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('world');
  const [buildMode, setBuildMode] = useState(false);
  const [quickItemIds, setQuickItemIds] = useState<string[]>(['cs_common_13', 'cs_common_14', 'cs_common_15']);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [dailyClaimNotice, setDailyClaimNotice] = useState<string | null>(null);
  const dailyAutoPromptedRef = useRef(false);

  // Multiplayer & Social
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayerState>>(new Map());
  const [onlineCount, setOnlineCount] = useState(1);
  const [wsConnected, setWsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [friendships, setFriendships] = useState<FriendshipRecord[]>([]);

  const mpRef = useRef<MultiplayerClient | null>(null);
  const skillTriggerRef = useRef<((slotIdx: number) => void) | null>(null);
  const itemTriggerRef = useRef<((item: ItemDefinition) => void) | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const loaded = await loadAccountData(user.uid);
          if (loaded) {
            setProfile(loaded.profile);
            setSave(loaded.save);
            setPlayerBase(loaded.base);
          } else {
            setProfile(null);
            setSave(null);
            setPlayerBase(null);
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        setProfile(null);
        setSave(null);
        setPlayerBase(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Friendships subscription
  useEffect(() => {
    if (!authUser || !profile) return;
    const unsub = subscribeFriendships(authUser.uid, setFriendships);
    return () => unsub();
  }, [authUser, profile?.uid]);

  // WebSocket Multiplayer lifecycle
  useEffect(() => {
    if (!profile || !save) return;

    const client = new MultiplayerClient({
      onPlayersChange: (players, count) => {
        setRemotePlayers(players);
        setOnlineCount(count);
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev.slice(-49), msg]);
      },
      onChatHistory: (msgs) => {
        setChatMessages(msgs);
      },
      onConnectionChange: (connected) => {
        setWsConnected(connected);
      },
    });

    mpRef.current = client;
    client.connect({
      uid: profile.uid,
      displayName: profile.displayName,
      playerClass: profile.playerClass,
      hairColor: profile.hairColor,
      armorColor: profile.armorColor,
      weaponId: save.equippedWeaponId,
      level: save.level,
      mapId: save.currentMapId,
      x: save.posX,
      y: save.posY,
      aimAngle: 0,
      hp: 200,
      maxHp: 200,
    });

    return () => {
      client.disconnect();
      mpRef.current = null;
    };
  }, [profile?.uid]);

  const stats = useMemo(() => {
    if (!profile || !save) {
      return {
        maxHp: 100,
        maxMp: 100,
        atk: 20,
        def: 10,
        speed: 220,
        critChance: 10,
        combatPower: 100,
        forgeBonusPct: 0,
        libraryBonusPct: 0,
      };
    }
    return computePlayerStats(profile.playerClass, save, playerBase);
  }, [profile, save, playerBase]);

  // Persist save helper
  const saveRef = useRef(save);
  const profileRef = useRef(profile);
  const statsRef = useRef(stats);
  saveRef.current = save;
  profileRef.current = profile;
  statsRef.current = stats;

  const persistNow = useCallback(async (silent = false) => {
    const s = saveRef.current;
    const p = profileRef.current;
    if (!s || !p) return;
    setSaving(true);
    try {
      await savePlayerProgress(p.uid, s, {
        level: s.level,
        combatPower: statsRef.current.combatPower,
        enemiesDefeated: s.enemiesDefeated,
        bestiaryCount: s.discoveredEnemies.length,
        rarityScore: computeRarityScore(s),
        currentMapId: s.currentMapId,
      });
      if (!silent) showToast('冒険データをクラウドへ保存しました');
    } catch (err) {
      console.error(err);
      if (!silent) showToast('保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  const getLocalDateKey = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayDateKey = getLocalDateKey();
  const canClaimDaily = Boolean(save && save.lastDailyBonusDate !== todayDateKey);
  const currentStreak = save?.loginStreak ?? 0;
  const nextRewardDay = canClaimDaily ? (currentStreak % 7) + 1 : currentStreak > 0 ? ((currentStreak - 1) % 7) + 1 : 1;

  useEffect(() => {
    if (profile && save && canClaimDaily && !dailyAutoPromptedRef.current) {
      dailyAutoPromptedRef.current = true;
      setDailyModalOpen(true);
    }
  }, [profile?.uid, save?.uid, canClaimDaily]);

  // Periodic autosave every 18s
  useEffect(() => {
    if (!profile || !save) return;
    const id = window.setInterval(() => {
      persistNow(true);
    }, 18000);
    return () => clearInterval(id);
  }, [profile?.uid, persistNow]);

  const handleCreateAccount = async (params: {
    displayName: string;
    playerClass: PlayerClassId;
    hairColor: string;
    armorColor: string;
    bio: string;
  }) => {
    if (!authUser) return;
    const loaded = await createPlayerAccount({
      uid: authUser.uid,
      ...params,
    });
    setProfile(loaded.profile);
    setSave(loaded.save);
    setPlayerBase(loaded.base);
  };

  const handleMoveUpdate = useCallback((mapId: MapId, x: number, y: number) => {
    setSave((prev) => (prev ? { ...prev, currentMapId: mapId, posX: x, posY: y } : prev));
  }, []);

  const handleEnemyDefeated = useCallback((enemy: EnemyDefinition, drops: EnemyDropResult) => {
    setSave((prev) => {
      if (!prev) return prev;
      let nextExp = prev.exp + drops.exp;
      let nextLevel = prev.level;
      let leveledUp = false;
      while (nextExp >= expRequiredForLevel(nextLevel) && nextLevel < 9999) {
        nextExp -= expRequiredForLevel(nextLevel);
        nextLevel++;
        leveledUp = true;
      }
      if (leveledUp) {
        soundEngine.playLevelUp();
        showToast(`レベルアップ！ Lv.${nextLevel} に到達しました`);
      }

      let nextInv = prev.inventory;
      for (const it of drops.droppedItems) {
        nextInv = addItemToInventory(nextInv, it.id, 1);
      }

      let nextSkills = prev.ownedSkills;
      for (const sk of drops.droppedSkills) {
        nextSkills = addSkillToOwned(nextSkills, sk.id, 1);
      }

      const nextDiscovered = prev.discoveredEnemies.includes(enemy.id)
        ? prev.discoveredEnemies
        : [...prev.discoveredEnemies, enemy.id];

      return {
        ...prev,
        level: nextLevel,
        exp: nextExp,
        gold: prev.gold + drops.gold,
        arcaneDust: prev.arcaneDust + drops.arcaneDust,
        inventory: nextInv,
        ownedSkills: nextSkills,
        discoveredEnemies: nextDiscovered,
        enemiesDefeated: prev.enemiesDefeated + 1,
        bossesDefeated: prev.bossesDefeated + (enemy.isBoss ? 1 : 0),
      };
    });
  }, [showToast]);

  const handleWarpToMap = useCallback((mapId: MapId, spawnX: number, spawnY: number) => {
    setVisitingBase(null);
    setBuildMode(false);
    setSave((prev) => (prev ? { ...prev, currentMapId: mapId, posX: spawnX, posY: spawnY } : prev));
    setActiveTab('world');
  }, []);

  const handleEquipItem = (item: ItemDefinition) => {
    setSave((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (item.category === 'weapon') next.equippedWeaponId = item.id;
      else if (item.category === 'armor') next.equippedArmorId = item.id;
      else if (item.category === 'helm') next.equippedHelmId = item.id;
      else if (item.category === 'accessory') next.equippedAccessoryId = item.id;
      return next;
    });
    showToast(`${item.name} を装備しました`);
  };

  const handleUseCombatItem = (item: ItemDefinition) => {
    if (activeTab !== 'world') {
      setActiveTab('world');
    }
    setTimeout(() => {
      itemTriggerRef.current?.(item);
    }, 50);
    showToast(`${item.name} の戦闘効果を発動！`);
  };

  const handleConsumeQuickItem = useCallback((item: ItemDefinition) => {
    setSave((prev) => (prev ? { ...prev, inventory: removeItemFromInventory(prev.inventory, item.id, 1) } : prev));
  }, []);

  const handleEquipSkillToSlot = (slotIdx: number, skillId: string) => {
    setSave((prev) => {
      if (!prev) return prev;
      const nextSlots = [...prev.equippedSkills];
      while (nextSlots.length < 6) nextSlots.push('');
      nextSlots[slotIdx] = skillId;
      return { ...prev, equippedSkills: nextSlots.filter(Boolean) };
    });
    showToast(`スロット${slotIdx + 1}にスキルをセットしました`);
  };

  const handleSynthesizeItems = (rarity: RarityId, itemIds: string[]) => {
    const outcome = performItemSynthesis(rarity, stats.forgeBonusPct);
    soundEngine.playSynthesis(outcome.success);

    setSave((prev) => {
      if (!prev) return prev;
      let nextInv = prev.inventory;
      for (const id of itemIds) {
        nextInv = removeItemFromInventory(nextInv, id, 1);
      }
      if (outcome.success && outcome.result) {
        nextInv = addItemToInventory(nextInv, outcome.result.id, 1);
      }
      return {
        ...prev,
        inventory: nextInv,
        arcaneDust: prev.arcaneDust + outcome.dustRefund,
        synthesesAttempted: prev.synthesesAttempted + 1,
        synthesesSucceeded: prev.synthesesSucceeded + (outcome.success ? 1 : 0),
      };
    });

    return {
      success: outcome.success,
      result: outcome.result || undefined,
      dustRefund: outcome.dustRefund,
    };
  };

  const handleSynthesizeSkills = (rarity: RarityId, skillIds: string[]) => {
    const outcome = performSkillSynthesis(rarity, stats.forgeBonusPct);
    soundEngine.playSynthesis(outcome.success);

    setSave((prev) => {
      if (!prev) return prev;
      let nextSkills = prev.ownedSkills;
      for (const id of skillIds) {
        nextSkills = removeSkillFromOwned(nextSkills, id, 1);
      }
      if (outcome.success && outcome.result) {
        nextSkills = addSkillToOwned(nextSkills, outcome.result.id, 1);
      }
      return {
        ...prev,
        ownedSkills: nextSkills,
        arcaneDust: prev.arcaneDust + outcome.dustRefund,
        synthesesAttempted: prev.synthesesAttempted + 1,
        synthesesSucceeded: prev.synthesesSucceeded + (outcome.success ? 1 : 0),
      };
    });

    return {
      success: outcome.success,
      result: outcome.result || undefined,
      dustRefund: outcome.dustRefund,
    };
  };

  const handlePlaceStructure = useCallback(
    (st: PlacedStructure, costGold: number, costDust: number) => {
      setSave((prev) =>
        prev
          ? {
              ...prev,
              gold: Math.max(0, prev.gold - costGold),
              arcaneDust: Math.max(0, prev.arcaneDust - costDust),
            }
          : prev,
      );
      setPlayerBase((prev) => {
        if (!prev || !profileRef.current) return prev;
        const updated: PlayerBase = {
          ...prev,
          structures: [...prev.structures, st],
        };
        savePlayerBase(profileRef.current.uid, updated).catch(console.error);
        return updated;
      });
    },
    [],
  );

  const handleRemoveStructure = useCallback((id: string) => {
    setPlayerBase((prev) => {
      if (!prev || !profileRef.current) return prev;
      const updated: PlayerBase = {
        ...prev,
        structures: prev.structures.filter((s) => s.id !== id),
      };
      savePlayerBase(profileRef.current.uid, updated).catch(console.error);
      return updated;
    });
  }, []);

  const handleVisitFriendBase = async (ownerId: string, ownerName: string) => {
    const baseData = await loadBaseByOwnerId(ownerId);
    if (!baseData) {
      showToast(`${ownerName} の拠点データが見つかりませんでした`);
      return;
    }
    setVisitingBase(baseData);
    setBuildMode(false);
    setActiveTab('world');
    showToast(`${ownerName} の拠点へ訪問しました`);
  };

  const handleClaimDailyBonus = useCallback(
    (reward: DailyBonusReward) => {
      const currentSave = saveRef.current;
      const currentProfile = profileRef.current;
      if (!currentSave || !currentProfile) return;
      const dateKey = getLocalDateKey();
      if (currentSave.lastDailyBonusDate === dateKey) return;

      let nextInv = currentSave.inventory;
      let nextSkills = currentSave.ownedSkills;
      const gainedNotes: string[] = [`+${reward.gold.toLocaleString()}G`, `魔導粉塵+${reward.arcaneDust}`];

      if (reward.bonusPotionQty) {
        nextInv = addItemToInventory(nextInv, 'cs_common_13', reward.bonusPotionQty);
        gainedNotes.push(`生命の秘薬×${reward.bonusPotionQty}`);
      }
      if (reward.itemRarity) {
        const it = getRandomItemByRarity(reward.itemRarity, false);
        nextInv = addItemToInventory(nextInv, it.id, 1);
        gainedNotes.push(`[${RARITY_BY_ID[it.rarity].label}] ${it.name}`);
      }
      if (reward.skillRarity) {
        const sk = getRandomSkillByRarity(reward.skillRarity);
        nextSkills = addSkillToOwned(nextSkills, sk.id, 1);
        gainedNotes.push(`スキル: ${sk.name}`);
      }

      const updatedSave: PlayerSave = {
        ...currentSave,
        gold: currentSave.gold + reward.gold,
        arcaneDust: currentSave.arcaneDust + reward.arcaneDust,
        inventory: nextInv,
        ownedSkills: nextSkills,
        lastDailyBonusDate: dateKey,
        loginStreak: (currentSave.loginStreak ?? 0) + 1,
      };

      setSave(updatedSave);
      soundEngine.playLevelUp();
      const summary = `${reward.label}を受取: ${gainedNotes.join(' · ')}`;
      setDailyClaimNotice(summary);
      showToast('本日のログインボーナスを受け取りました！');

      const nextStats = computePlayerStats(currentProfile.playerClass, updatedSave, playerBase);
      savePlayerProgress(currentProfile.uid, updatedSave, {
        level: updatedSave.level,
        combatPower: nextStats.combatPower,
        enemiesDefeated: updatedSave.enemiesDefeated,
        bestiaryCount: updatedSave.discoveredEnemies.length,
        rarityScore: computeRarityScore(updatedSave),
        currentMapId: updatedSave.currentMapId,
      }).catch(console.error);
    },
    [playerBase, showToast],
  );

  const handleDefenseCleared = useCallback(
    (
      waveCount: number,
      goldReward: number,
      dustReward: number,
      itemRarity: RarityId,
      skillRarity: RarityId,
    ) => {
      const currentSave = saveRef.current;
      const currentProfile = profileRef.current;
      if (!currentSave || !currentProfile) return;

      const rewardItem = getRandomItemByRarity(itemRarity, false);
      const rewardSkill = getRandomSkillByRarity(skillRarity);

      const updatedSave: PlayerSave = {
        ...currentSave,
        gold: currentSave.gold + goldReward,
        arcaneDust: currentSave.arcaneDust + dustReward,
        inventory: addItemToInventory(currentSave.inventory, rewardItem.id, 1),
        ownedSkills: addSkillToOwned(currentSave.ownedSkills, rewardSkill.id, 1),
        defenseWavesCleared: (currentSave.defenseWavesCleared ?? 0) + waveCount,
      };

      setSave(updatedSave);
      showToast(`拠点防衛成功！ [${RARITY_BY_ID[rewardItem.rarity].label}] ${rewardItem.name} を獲得`);

      const nextStats = computePlayerStats(currentProfile.playerClass, updatedSave, playerBase);
      savePlayerProgress(currentProfile.uid, updatedSave, {
        level: updatedSave.level,
        combatPower: nextStats.combatPower,
        enemiesDefeated: updatedSave.enemiesDefeated,
        bestiaryCount: updatedSave.discoveredEnemies.length,
        rarityScore: computeRarityScore(updatedSave),
        currentMapId: updatedSave.currentMapId,
      }).catch(console.error);
    },
    [playerBase, showToast],
  );

  if (!authUser || !profile || !save || !playerBase) {
    return (
      <AuthGate
        authUser={authUser}
        authLoading={authLoading}
        needsRegistration={Boolean(authUser && !profile)}
        onCreateAccount={handleCreateAccount}
      />
    );
  }

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'world', label: '冒険フィールド' },
    { id: 'inventory', label: '装備・アイテム' },
    { id: 'skills', label: 'スキル (400)' },
    { id: 'synthesis', label: '合成工房' },
    { id: 'bestiary', label: '図鑑 (150)' },
    { id: 'social', label: 'フレンド・ランキング' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* 3-Zone Top Bar */}
      <header className="h-14 px-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-8 shrink-0">
        {/* Zone 1: Brand Title */}
        <span className="font-display text-lg font-bold tracking-wide text-amber-400 whitespace-nowrap shrink-0">
          Aetheria Chronicles
        </span>

        {/* Zone 2: Single-line Nav Links */}
        <nav className="flex items-center gap-5 overflow-x-auto">
          {navItems.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-semibold py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-4 shrink-0">
          <span className="hidden xl:inline text-xs font-mono-num text-slate-300 whitespace-nowrap">
            Lv.{save.level} · 戦闘力 {stats.combatPower.toLocaleString()} · {save.gold.toLocaleString()}G
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={() => persistNow(false)}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? '保存中...' : 'セーブ'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Keep GameCanvas mounted when switching tabs? Better: keep mounted or hide via CSS so combat state & enemies don't reset when opening bags/synthesis! */}
        <div className={activeTab === 'world' ? 'w-full h-full' : 'hidden'}>
          <GameCanvas
            profile={profile}
            save={save}
            stats={stats}
            playerBase={playerBase}
            visitingBase={visitingBase}
            remotePlayers={remotePlayers}
            onlineCount={onlineCount}
            wsConnected={wsConnected}
            chatMessages={chatMessages}
            quickItemIds={quickItemIds}
            multiplayer={mpRef.current}
            buildMode={buildMode}
            canClaimDaily={canClaimDaily}
            onOpenDailyBonus={() => setDailyModalOpen(true)}
            onDefenseCleared={handleDefenseCleared}
            onToggleBuildMode={setBuildMode}
            onExitVisitBase={() => setVisitingBase(null)}
            onMoveUpdate={handleMoveUpdate}
            onEnemyDefeated={handleEnemyDefeated}
            onPlaceStructure={handlePlaceStructure}
            onRemoveStructure={handleRemoveStructure}
            onWarpToMap={handleWarpToMap}
            onConsumeQuickItem={handleConsumeQuickItem}
            externalSkillTriggerRef={skillTriggerRef}
            externalItemTriggerRef={itemTriggerRef}
          />
        </div>

        {activeTab === 'inventory' && (
          <InventoryPanel
            save={save}
            stats={stats}
            quickItemIds={quickItemIds}
            onEquipItem={handleEquipItem}
            onUseCombatItem={handleUseCombatItem}
            onAssignQuickItem={(slotIdx, itemId) =>
              setQuickItemIds((prev) => {
                const next = [...prev];
                next[slotIdx] = itemId;
                return next;
              })
            }
          />
        )}

        {activeTab === 'skills' && (
          <SkillsPanel save={save} onEquipSkillToSlot={handleEquipSkillToSlot} />
        )}

        {activeTab === 'synthesis' && (
          <SynthesisPanel
            save={save}
            stats={stats}
            onSynthesizeItems={handleSynthesizeItems}
            onSynthesizeSkills={handleSynthesizeSkills}
          />
        )}

        {activeTab === 'bestiary' && <BestiaryPanel save={save} />}

        {activeTab === 'social' && (
          <SocialAndRankingsPanel
            profile={profile}
            friendships={friendships}
            onVisitBase={handleVisitFriendBase}
            onWarpToMap={(mapId) => {
              const m = WORLD_MAPS[mapId];
              handleWarpToMap(mapId, m.spawnX, m.spawnY);
            }}
            onProfileUpdated={(updates) =>
              setProfile((prev) => (prev ? { ...prev, ...updates } : prev))
            }
          />
        )}

        <DailyBonusModal
          open={dailyModalOpen}
          canClaim={canClaimDaily}
          currentStreak={currentStreak}
          nextRewardDay={nextRewardDay}
          claimedNotice={dailyClaimNotice}
          onClaim={handleClaimDailyBonus}
          onClose={() => setDailyModalOpen(false)}
        />

        {/* Toast Notification */}
        {toast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-900 border border-amber-400/70 text-amber-200 px-4 py-2 rounded-lg text-xs font-semibold shadow-xl z-40 pointer-events-none">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
