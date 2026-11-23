import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudLightning, Droplets, Flame, ShieldCheck, Sparkles, Utensils, X } from 'lucide-react';
import { audioEngine, MIDI_TRACKS } from './audio/midiEngine';
import type { ActiveFishingCast } from './components/FarmCanvas';
import { TitleScreen } from './components/TitleScreen';

const AlmanachModal = lazy(() => import('./components/AlmanachModal').then((m) => ({ default: m.AlmanachModal })));
const AvatarModal = lazy(() => import('./components/AvatarModal').then((m) => ({ default: m.AvatarModal })));
const CraftModal = lazy(() => import('./components/CraftModal').then((m) => ({ default: m.CraftModal })));
const FarmCanvas = lazy(() => import('./components/FarmCanvas').then((m) => ({ default: m.FarmCanvas })));
const FarmShopModal = lazy(() => import('./components/FarmShopModal').then((m) => ({ default: m.FarmShopModal })));
const HouseModal = lazy(() => import('./components/HouseModal').then((m) => ({ default: m.HouseModal })));
const HudBar = lazy(() => import('./components/HudBar').then((m) => ({ default: m.HudBar })));
const InventoryModal = lazy(() => import('./components/InventoryModal').then((m) => ({ default: m.InventoryModal })));
const MailboxModal = lazy(() => import('./components/MailboxModal').then((m) => ({ default: m.MailboxModal })));
const MarketModal = lazy(() => import('./components/MarketModal').then((m) => ({ default: m.MarketModal })));
const MerchantModal = lazy(() => import('./components/MerchantModal').then((m) => ({ default: m.MerchantModal })));
const MineModal = lazy(() => import('./components/MineModal').then((m) => ({ default: m.MineModal })));
const NeighborsModal = lazy(() => import('./components/NeighborsModal').then((m) => ({ default: m.NeighborsModal })));
const OptionsModal = lazy(() => import('./components/OptionsModal').then((m) => ({ default: m.OptionsModal })));
const PetModal = lazy(() => import('./components/PetModal').then((m) => ({ default: m.PetModal })));
const QuestsModal = lazy(() => import('./components/QuestsModal').then((m) => ({ default: m.QuestsModal })));
const SeasonalEventModal = lazy(() =>
  import('./components/SeasonalEventModal').then((m) => ({ default: m.SeasonalEventModal }))
);
const ThemeParkModal = lazy(() =>
  import('./components/ThemeParkModal').then((m) => ({ default: m.ThemeParkModal }))
);
const TutorialWidget = lazy(() => import('./components/TutorialWidget').then((m) => ({ default: m.TutorialWidget })));
const VillageBoardModal = lazy(() =>
  import('./components/VillageBoardModal').then((m) => ({ default: m.VillageBoardModal }))
);
const VillageBusinessModal = lazy(() =>
  import('./components/VillageBusinessModal').then((m) => ({ default: m.VillageBusinessModal }))
);
const VillageFairModal = lazy(() =>
  import('./components/VillageFairModal').then((m) => ({ default: m.VillageFairModal }))
);
const WorkersModal = lazy(() => import('./components/WorkersModal').then((m) => ({ default: m.WorkersModal })));
const AdminEventModal = import.meta.env.DEV
  ? lazy(() => import('./components/AdminEventModal').then((m) => ({ default: m.AdminEventModal })))
  : null;
import {
  ARTISAN_STATION_IDS,
  CATALOG,
  CATALOG_BY_ID,
  CRAFT_RECIPES,
  CRAFT_STATIONS,
  createAnimalLifespanMs,
  createRandomAvatar,
  DAYS_PER_SEASON,
  DEFAULT_SETTINGS,
  FISH_CATALOG,
  FISH_DENSITY_META,
  FISHING_REGION_LABELS,
  FISHING_UNLOCK_LEVEL,
  FLY_AGARIC_COOLDOWN_MS,
  FLY_AGARIC_PSYCHEDELIC_MS,
  generateSingleQuest,
  getMaxWorkersForLevel,
  GRID_SIZE,
  HOUSE_EXTRAS,
  HOUSE_FLOOR_UPGRADES,
  isLivestockAnimal,
  MAX_LEVEL,
  MAX_MOISTURE_MS,
  MAX_NEIGHBOR_REQUESTS_PER_DAY,
  PET_CATALOG,
  QUEST_MILESTONES,
  REAL_MS_PER_INGAME_MINUTE,
  SEASON_LABELS,
  SEASONAL_EVENTS,
  TUTORIAL_STEPS,
  WATERING_CAN_TIERS,
  WEATHER_META,
  WORKER_ROLES,
  WORKERS_UNLOCK_LEVEL,
  WORLD_MARGIN,
  WORLD_SIZE,
} from './data/catalog';
import {
  generateMineBoard,
  MINE_FORGE_RECIPES,
  MINE_RELICS,
  MINE_RESOURCE_BY_ID,
  MINE_SNACKS,
} from './data/mineCatalog';
import {
  getResidentsForHouse,
  VILLAGE_BUSINESS_BY_ID,
  VILLAGE_BUSINESSES,
  VILLAGE_HOUSE_BY_ID,
  VILLAGE_HOUSES,
} from './data/village';
import { THEME_PARK_ATTRACTION_BY_ID, THEME_PARK_BASE_COST, THEME_PARK_BOUNDS } from './data/themePark';
import { ROMANCE_CANDIDATES, ROMANCE_CANDIDATE_BY_ID, ROMANCE_DATES } from './data/romance';
import {
  acceptRomanceSpark,
  addFishingXp,
  addPetXp,
  addXpAndCheckLevelUp,
  advanceGameTick,
  advanceQuestProgress,
  applyNewDayStateReset,
  breakupRomance,
  buildScaledNeighborRequest,
  buildThemeParkAttraction,
  clearSavedGame,
  createInitialGameState,
  createInitialMineState,
  createInitialRomanceState,
  createInitialVillageBoardState,
  declineRomanceSpark,
  evaluateVillageFair,
  EXPANSION_COSTS,
  formatDurationMs,
  generateFishCatchMetrics,
  getAlmanacBonuses,
  getDayInSeason,
  getHouseBonuses,
  getMarketCrashMult,
  getMaxMineStamina,
  getMilestoneProgress,
  getNeighborRequestStepMeta,
  getPartnerBonuses,
  getSeasonFairKey,
  getTileProtections,
  getWateringPatternOffsets,
  giveRomanceFavoriteGift,
  goOnRomanceDate,
  isTileUnlockedForRing,
  loadGameState,
  loadSettings,
  marryRomancePartner,
  migrateGameState,
  purchaseThemePark,
  purchaseVillageBusiness,
  recordAlmanacDiscovery,
  repairThemePark,
  repairVillageBusiness,
  saveGameState,
  saveSettings,
  triggerRomanceSparkForced,
  tryTriggerOrganicRomanceSpark,
} from './engine/gameLogic';
import { getRiverRegionForWy } from './graphics/pixelSprites';
import {
  ActionBurst,
  ActionBurstKind,
  AvatarConfig,
  CraftStationId,
  FarmWorker,
  FloatingText,
  GameSettings,
  GameState,
  ModalType,
  MovingDecorationState,
  PetType,
  PlayerPosition,
  RomanceDateId,
  Season,
  ThemeParkAttractionId,
  ToastMessage,
  ToolType,
  UfoAbductionAnimation,
  VillageBusinessId,
  WeatherType,
  WorkerRole,
  WorkerTasks,
} from './types/game';

export interface InitialBootConfig {
  mode: 'continue' | 'new' | 'options';
  selectedPet: PetType;
  avatar: AvatarConfig;
  settings: GameSettings;
}

export default function GameApp({ initialBoot }: { initialBoot?: InitialBootConfig }) {
  const [phase, setPhase] = useState<'TITLE' | 'PLAYING'>(() =>
    initialBoot && initialBoot.mode !== 'options' ? 'PLAYING' : 'TITLE'
  );
  const [settings, setSettings] = useState<GameSettings>(() => initialBoot?.settings ?? loadSettings(DEFAULT_SETTINGS));
  const [savedExists, setSavedExists] = useState<boolean>(() => {
    if (initialBoot?.mode === 'new') return true;
    return Boolean(loadGameState());
  });
  const [selectedTitlePet, setSelectedTitlePet] = useState<PetType>(() => initialBoot?.selectedPet ?? 'dog');
  const [gameState, setGameState] = useState<GameState>(() => {
    if (initialBoot?.mode === 'new') {
      const fresh = createInitialGameState(initialBoot.selectedPet);
      fresh.avatar = initialBoot.avatar;
      saveGameState(fresh);
      return fresh;
    }
    const existing = loadGameState();
    if (existing) return existing;
    const fresh = createInitialGameState(initialBoot?.selectedPet ?? 'dog');
    if (initialBoot?.avatar) fresh.avatar = initialBoot.avatar;
    return fresh;
  });
  const [activeModal, setActiveModal] = useState<ModalType>(() =>
    initialBoot?.mode === 'options' ? 'options' : 'none'
  );
  const [craftModalStation, setCraftModalStation] = useState<CraftStationId | undefined>(undefined);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [playerPos, setPlayerPos] = useState<PlayerPosition>({
    x: WORLD_MARGIN + 9,
    y: WORLD_MARGIN + 9,
    facing: 'down',
    moving: false,
  });
  const [fishingCast, setFishingCast] = useState<ActiveFishingCast | null>(null);
  const [ufoAbduction, setUfoAbduction] = useState<UfoAbductionAnimation | null>(null);
  const [movingDecoration, setMovingDecoration] = useState<MovingDecorationState | null>(null);
  const [fireModalOpen, setFireModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<VillageBusinessId>('auto_supplier');
  const [neighborsInitialTab, setNeighborsInitialTab] = useState<'neighbors' | 'romance'>('neighbors');

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const playerPosRef = useRef(playerPos);
  playerPosRef.current = playerPos;
  const fishingCastRef = useRef(fishingCast);
  fishingCastRef.current = fishingCast;
  const movingDecorationRef = useRef(movingDecoration);
  movingDecorationRef.current = movingDecoration;
  const fishingTimersRef = useRef<{ waitTimer: number | null; missTimer: number | null }>({
    waitTimer: null,
    missTimer: null,
  });
  const lastJumpAtRef = useRef(0);
  const lastFenceHintAtRef = useRef(0);
  const actionBurstQueueRef = useRef<ActionBurst[]>([]);

  const pushBurst = useCallback(
    (wx: number, wy: number, kind: ActionBurstKind, color?: string) => {
      if ((settings.graphicsQuality ?? 'high') !== 'high') return;
      actionBurstQueueRef.current.push({ wx, wy, kind, color });
      if (actionBurstQueueRef.current.length > 48) {
        actionBurstQueueRef.current.splice(0, actionBurstQueueRef.current.length - 48);
      }
    },
    [settings.graphicsQuality]
  );

  const clearFishingTimers = useCallback(() => {
    if (fishingTimersRef.current.waitTimer !== null) {
      window.clearTimeout(fishingTimersRef.current.waitTimer);
      fishingTimersRef.current.waitTimer = null;
    }
    if (fishingTimersRef.current.missTimer !== null) {
      window.clearTimeout(fishingTimersRef.current.missTimer);
      fishingTimersRef.current.missTimer = null;
    }
  }, []);

  useEffect(() => () => clearFishingTimers(), [clearFishingTimers]);

  const pushToast = useCallback((title: string, detail?: string, tone: ToastMessage['tone'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, detail, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const spawnFloat = useCallback(
    (x: number, y: number, text: string, color = '#fef08a', isWorldCoord = false) => {
      const id = `ft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setFloatingTexts((prev) => [
        ...prev.slice(-16),
        { id, x, y, text, color, createdAt: Date.now(), isWorldCoord },
      ]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((f) => f.id !== id));
      }, 1550);
    },
    []
  );

  const triggerUfoAt = useCallback((ux: number, uy: number) => {
    setUfoAbduction({
      id: `ufo_${Date.now()}`,
      x: ux,
      y: uy,
      startedAt: Date.now(),
      durationMs: 4800,
    });
    window.setTimeout(() => {
      setUfoAbduction((cur) => (cur && Date.now() - cur.startedAt >= cur.durationMs ? null : cur));
    }, 5000);
  }, []);

  const updateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    audioEngine.updateSettings(next);
  }, []);

  const startMusicOnInteraction = useCallback((s: GameSettings) => {
    audioEngine.unlockAndSync(s, (nextIdx) => {
      setSettings((curr) => {
        const updated = { ...curr, currentTrackIndex: nextIdx };
        saveSettings(updated);
        audioEngine.updateSettings(updated);
        return updated;
      });
    });
  }, []);

  // Real-time game loop (250ms tick)
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    let lastTick = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.min(2000, now - lastTick);
      lastTick = now;

      setGameState((prev) => {
        const { next, events } = advanceGameTick(prev, delta);
        if (events.newDay) {
          pushToast(`Neuer Tag ${events.newDay}`, 'Marktangebote & Nachbarschaftshilfe aktualisiert.', 'info');
          if (getDayInSeason(events.newDay) === DAYS_PER_SEASON) {
            pushToast(
              'Saison-Dorffest heute geöffnet!',
              'Bewerte heute deinen Hof im Dorffest-Menü & gewinne Medaillen sowie Fest-Deko.',
              'success'
            );
          }
        }
        if (events.newSeason) {
          pushToast(
            `Jahreszeit: ${SEASON_LABELS[events.newSeason]}`,
            `${SEASONAL_EVENTS[events.newSeason].title} hat begonnen!`,
            'success'
          );
        }
        if (events.weatherChanged) {
          const wm = WEATHER_META[events.weatherChanged];
          pushToast(`Wetterwechsel: ${wm.label}`, wm.effectText, 'info');
        }
        if (events.disasterWarningStarted) {
          audioEngine.playSfx('alert');
        }
        if (events.disasterTriggered) {
          audioEngine.playSfx('levelup');
        }
        if (events.ufoAbduction) {
          const { x: ux, y: uy } = events.ufoAbduction;
          triggerUfoAt(ux, uy);
          spawnFloat(ux, uy, '👽 Muuuuh?!', '#67e8f9');
        }
        if (events.mushroomLuckStarted) {
          audioEngine.playSfx('levelup');
          pushToast(
            'Pilz-Glück aktiviert! (15 Min.)',
            'Du angelst jetzt erfolgreicher und bekommst +20 % mehr Ernte & Fische!',
            'success'
          );
        }
        if (events.animalLifespanEnded && events.animalLifespanEnded.length > 0) {
          audioEngine.playSfx('animal');
          events.animalLifespanEnded.forEach((ev) => {
            spawnFloat(ev.x, ev.y, `${ev.meatName} bereit!`, '#fca5a5');
            pushToast(
              `${ev.animalName} hat seinen Lebenszyklus beendet`,
              `${ev.meatName} liegt auf der Weide zum Einsammeln bereit!`,
              'info'
            );
          });
        }
        if (events.petHelped) {
          spawnFloat(events.petHelped.x, events.petHelped.y, events.petHelped.text, '#86efac');
        }
        if (events.petLeveledUpTo) {
          audioEngine.playSfx('levelup');
          pushToast(
            `${next.pet.name} ist jetzt Haustier-Level ${events.petLeveledUpTo}!`,
            'Hilft ab sofort noch schneller auf deinem Hof.',
            'success'
          );
        }
        if (events.payrollReport) {
          const { paidCount, totalPaid, strikeCount, totalUnpaid } = events.payrollReport;
          if (strikeCount > 0 && paidCount > 0) {
            audioEngine.playSfx('alert');
            pushToast(
              'Gehaltszahlung (0:00 Uhr)',
              `${paidCount} Angestellte bezahlt (-${totalPaid} M) · ${strikeCount} im Streik (${totalUnpaid} M offen)!`,
              'warning'
            );
          } else if (strikeCount > 0) {
            audioEngine.playSfx('alert');
            pushToast(
              'Personal im Streik! (0:00 Uhr)',
              `Nicht genug Münzen für ${strikeCount} Angestellte (${totalUnpaid} M offen). Zahle im Personal-Menü nach!`,
              'warning'
            );
          } else if (paidCount > 0) {
            audioEngine.playSfx('coin');
            pushToast(
              'Gehaltszahlung (0:00 Uhr)',
              `${paidCount} Angestellte bezahlt (-${totalPaid.toLocaleString('de-DE')} Münzen).`,
              'info'
            );
          }
        }
        if (events.workerActed && events.workerActed.length > 0) {
          events.workerActed.forEach((act) => {
            spawnFloat(act.x, act.y, act.text, '#93c5fd');
          });
        }
        if (events.craftedItems && events.craftedItems.length > 0) {
          audioEngine.playSfx('harvest');
          events.craftedItems.forEach((ci) => {
            const outMeta = CATALOG_BY_ID[ci.itemId];
            pushToast(
              `Veredelung fertig: ${outMeta?.produceName || ci.itemId}!`,
              `Im Rucksack abgelegt (+${ci.xp} XP).`,
              'success'
            );
          });
        }
        if (events.merchantArrived) {
          audioEngine.playSfx('merchant');
          pushToast(
            'Wanderhändler Bruno ist da!',
            'Er hält mit seinem Planwagen an der südlichen Brücke (6 Min.).',
            'success'
          );
        }
        if (events.shopSales && events.shopSales.length > 0) {
          audioEngine.playSfx('coin');
          events.shopSales.forEach((sale) => {
            const soldMeta = CATALOG_BY_ID[sale.itemId];
            const label =
              sale.summaryText ||
              `+${sale.qty || 1}× ${soldMeta?.produceName || sale.itemId} (+${sale.coins} M)`;
            spawnFloat(1.95, 4.35, label, '#fef08a', true);
            if (sale.friendshipGain && sale.buyerName) {
              pushToast(
                `${sale.buyerName} hat im Hofladen eingekauft!`,
                `+${sale.friendshipGain} Freundschaft · ${label}`,
                'info'
              );
            }
          });
        }
        if (events.mailDelivered) {
          audioEngine.playSfx('mail');
          spawnFloat(4.1, 2.8, 'Post geliefert!', '#fef08a', true);
          pushToast(
            'Die Post ist da! (10:00 Uhr)',
            'Saatgut-Belohnungen & das Sonnentaler Tagesblatt liegen im Briefkasten bereit.',
            'success'
          );
        }
        if (events.santaArrived) {
          audioEngine.playSfx('santa');
          pushToast(
            'Ho Ho Ho! Der Weihnachtsmann kommt!',
            'Er fliegt mit seinen Rentieren über den Hof und wirft gleich ein Weihnachtsgeschenk ab!',
            'success'
          );
        }
        if (events.santaGiftDropped) {
          audioEngine.playSfx('santa');
          spawnFloat(events.santaGiftDropped.x, events.santaGiftDropped.y, '🎁 Geschenk gelandet!', '#fef08a');
          pushToast(
            'Weihnachtsgeschenk auf dem Hof gelandet!',
            'Klicke das rote Geschenkpaket auf der Wiese an, um eine festliche Weihnachts-Deko auszupacken!',
            'success'
          );
        }
        if (events.fireworksStarted) {
          audioEngine.playSfx('firework');
          pushToast(
            'Frohes neues Jahr! Silvester-Feuerwerk!',
            'Ein buntes Feuerwerk erleuchtet den Himmel über Hof & Sonnental-Dorf!',
            'success'
          );
        } else if (next.winterFestival?.fireworks?.active && Math.random() < 0.085) {
          audioEngine.playSfx('firework');
        }
        if (events.villageFireStarted) {
          audioEngine.playSfx('alert');
          const fh = VILLAGE_HOUSE_BY_ID[events.villageFireStarted.houseId];
          if (fh) {
            spawnFloat(fh.doorX, fh.y - 0.3, '🔥 Feuerwehreinsatz!', '#fb7185', true);
          }
          pushToast(
            `Brand im Dorf: ${events.villageFireStarted.houseName}!`,
            'Die Feuerwehr löscht 2–3 Std. lang. Klicke auf das Haus oder Fahrzeug, um zu helfen!',
            'warning'
          );
        }
        if (events.villageFireExtinguished) {
          setFireModalOpen(false);
          audioEngine.playSfx('harvest');
          pushToast(
            `Brand bei „${events.villageFireExtinguished.houseName}“ gelöscht!`,
            'Alle Bewohner sind wohlauf. Morgen steht der Einsatzbericht im Sonnentaler Tagesblatt!',
            'success'
          );
        }
        if (events.businessPayouts && events.businessPayouts.length > 0) {
          events.businessPayouts.forEach((payout) => {
            const spec = VILLAGE_BUSINESS_BY_ID[payout.businessId];
            if (spec) {
              spawnFloat(
                spec.doorX,
                spec.y + 0.5,
                `+${payout.amount.toLocaleString('de-DE')} M (${spec.shortLabel})`,
                '#fde047',
                true
              );
            }
          });
        }
        if (events.themeParkPayout) {
          spawnFloat(
            THEME_PARK_BOUNDS.northGateX,
            THEME_PARK_BOUNDS.northGateY + 1.4,
            `+${events.themeParkPayout.toLocaleString('de-DE')} M (Freizeitpark)`,
            '#fde047',
            true
          );
        }
        if (events.partnerMorningHelp) {
          const { partnerName, wateredCount, giftLabel } = events.partnerMorningHelp;
          spawnFloat(
            next.romance?.partnerX ?? 4.8,
            (next.romance?.partnerY ?? 3.4) - 0.5,
            `💕 ${giftLabel}`,
            '#fda4af',
            true
          );
          pushToast(
            `Morgengruß von ${partnerName}`,
            `${wateredCount > 0 ? `${wateredCount} Felder gegossen & ` : ''}${giftLabel} für dich bereitgelegt!`,
            'success'
          );
        }
        if (events.businessOutage) {
          audioEngine.playSfx('alert');
          const spec = VILLAGE_BUSINESS_BY_ID[events.businessOutage.businessId];
          if (spec) {
            spawnFloat(spec.doorX, spec.y + 0.3, '🔧 Störung!', '#fb7185', true);
          }
          pushToast(
            `Betriebs-Störung: ${events.businessOutage.name}!`,
            `${events.businessOutage.reason} · Ausschüttung pausiert bis zur Reparatur (${events.businessOutage.repairCost.toLocaleString('de-DE')} M).`,
            'warning'
          );
        }
        if (events.parkOutage) {
          audioEngine.playSfx('alert');
          spawnFloat(THEME_PARK_BOUNDS.northGateX, THEME_PARK_BOUNDS.northGateY + 1.0, '🔧 Park-Panne!', '#fb7185', true);
          pushToast(
            'Abenteuerpark: Technische Störung!',
            `${events.parkOutage.reason} · Park-Einnahmen pausieren bis zur Reparatur (${events.parkOutage.repairCost.toLocaleString('de-DE')} M).`,
            'warning'
          );
        }
        if (events.economyLevy) {
          audioEngine.playSfx('alert');
          spawnFloat(playerPosRef.current.x, playerPosRef.current.y - 0.5, `-${events.economyLevy.amount.toLocaleString('de-DE')} M Abgabe`, '#fca5a5', true);
          pushToast(
            'Gewerbeprüfung & Sonderabgabe',
            `${events.economyLevy.reason}: -${events.economyLevy.amount.toLocaleString('de-DE')} Münzen abgebucht.`,
            'warning'
          );
        }
        if (events.shopSpoilage) {
          audioEngine.playSfx('alert');
          pushToast(
            `Hofladen-Nachtverderb (-${events.shopSpoilage.totalLostQty} Stk.)`,
            'Überschüssige Regale ohne Voll-Kühlung verdorben (Schutz: 4. Etage + 2 Helfer + 6 Extras).',
            'warning'
          );
        }
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [phase, pushToast, spawnFloat]);

  // Auto-save every 15 minutes
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const id = window.setInterval(() => {
      saveGameState(gameStateRef.current);
      setGameState((prev) => ({ ...prev, savedAt: Date.now() }));
      pushToast('Automatisch gespeichert', 'Spielstand lokal gesichert (15-Minuten-Intervall).', 'info');
    }, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [phase, pushToast]);

  useEffect(() => {
    const onUnload = () => {
      if (phase === 'PLAYING') saveGameState(gameStateRef.current);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [phase]);

  const handleReelFishing = useCallback(() => {
    const cast = fishingCastRef.current;
    if (!cast || !cast.active) return;
    clearFishingTimers();

    if (cast.phase !== 'biting') {
      setFishingCast(null);
      pushToast('Zu früh eingeholt', 'Warte, bis ein Ausrufezeichen (!) am Schwimmer erscheint.', 'info');
      return;
    }

    setFishingCast(null);

    setGameState((prev) => {
      const density = prev.fishing.regionDensity[cast.region];
      const unlockedFish = FISH_CATALOG.filter((f) => f.unlockLevel <= prev.fishing.level);
      const pool = unlockedFish.length > 0 ? unlockedFish : [FISH_CATALOG[0]];
      const luckActive = (prev.mushroomEffect?.luckBuffRemainingMs ?? 0) > 0;
      const almanacBonuses = getAlmanacBonuses(prev.almanac);

      // Higher fishing level, richer water, rainy weather, mushroom luck, Almanac bonus, and Profi-Bait increase chance of rarer fish
      const weatherQualityBonus =
        prev.weather === 'rainy'
          ? 0.22
          : prev.weather === 'stormy'
          ? 0.15
          : prev.weather === 'foggy'
          ? 0.08
          : 0;
      const qualityBonus =
        Math.min(0.65, prev.fishing.level * 0.03) +
        (density === 'high' ? 0.2 : 0) +
        weatherQualityBonus +
        almanacBonuses.fishBonus +
        (luckActive ? 0.18 : 0) +
        (cast.usedBait ? 0.22 : 0);
      const roll = Math.min(0.999, Math.pow(Math.random(), Math.max(0.28, 1 - qualityBonus)));
      const caught = pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))];
      const fishQty = luckActive && Math.random() < 0.2 ? 2 : 1;
      const rainBonusNote =
        (prev.weather === 'rainy' || prev.weather === 'stormy') && caught.unlockLevel >= 5
          ? ' (Regen-Fang!)'
          : '';

      const catchMetrics = generateFishCatchMetrics(caught, prev.weather, prev.fishing.level, Boolean(cast.usedBait));
      const discRes = recordAlmanacDiscovery(prev.almanac, caught.id);
      const prevRec = discRes.almanac.fishRecords[caught.id];
      const isNewLengthRecord = !prevRec || catchMetrics.cm > prevRec.maxCm;
      const nextFishRecord = {
        maxCm: prevRec ? Math.max(prevRec.maxCm, catchMetrics.cm) : catchMetrics.cm,
        maxGrams: prevRec ? Math.max(prevRec.maxGrams, catchMetrics.grams) : catchMetrics.grams,
        catches: (prevRec?.catches || 0) + fishQty,
        bestWeather: isNewLengthRecord ? prev.weather : prevRec?.bestWeather || prev.weather,
      };
      const nextAlmanac = {
        ...discRes.almanac,
        fishRecords: {
          ...discRes.almanac.fishRecords,
          [caught.id]: nextFishRecord,
        },
      };

      const nextInv = { ...prev.inventory, [caught.id]: (prev.inventory[caught.id] || 0) + fishQty };
      const fishXpGain = Math.max(15, Math.round(caught.xpReward * 0.9)) * fishQty;

      const fRes = addFishingXp(
        {
          ...prev,
          inventory: nextInv,
          almanac: nextAlmanac,
          fishing: {
            ...prev.fishing,
            totalCaught: prev.fishing.totalCaught + fishQty,
          },
          eventState: {
            ...prev.eventState,
            points: prev.eventState.points + Math.max(5, Math.round(caught.xpReward * 0.25)) * fishQty,
          },
        },
        fishXpGain
      );

      const fishEventPts = Math.max(5, Math.round(caught.xpReward * 0.25)) * fishQty;
      const pRes = addXpAndCheckLevelUp(fRes.state, caught.xpReward * fishQty);
      let questState = advanceQuestProgress(pRes.state, 'catch_fish', fishQty);
      questState = advanceQuestProgress(questState, 'catch_specific_fish', fishQty, caught.id);
      questState = advanceQuestProgress(questState, 'event_points', fishEventPts);

      audioEngine.playSfx(fRes.fishingLeveledUpTo || pRes.leveledUpTo ? 'levelup' : 'harvest');
      pushBurst(cast.targetWx, cast.targetWy, 'splash', '#7dd3fc');
      spawnFloat(
        cast.targetWx,
        cast.targetWy,
        fishQty > 1
          ? `+${fishQty} ${caught.name} (${catchMetrics.cm} cm · Pilz-Glück!)`
          : `+1 ${caught.name} (${catchMetrics.cm} cm)!${rainBonusNote}`,
        fishQty > 1 ? '#4ade80' : '#7dd3fc',
        true
      );
      pushToast(
        fishQty > 1 ? `Doppelfang: ${fishQty}× ${caught.name}!` : `${caught.name} gefangen!${rainBonusNote}`,
        `${catchMetrics.cm.toFixed(1)} cm · ${catchMetrics.grams} g${isNewLengthRecord ? ' (Neuer Rekord!)' : ''} · +${fishXpGain} Angel-XP · +${caught.xpReward * fishQty} Hof-XP`,
        'success'
      );
      if (fRes.fishingLeveledUpTo) {
        pushToast(
          `Angel-Level ${fRes.fishingLeveledUpTo} erreicht!`,
          'Du kannst nun noch wertvollere Fische aus dem Talbach ziehen!',
          'success'
        );
      }

      return questState;
    });
  }, [clearFishingTimers, pushBurst, pushToast, spawnFloat]);

  const handleRiverInteract = useCallback(
    (wx: number, wy: number) => {
      startMusicOnInteraction(settings);
      const state = gameStateRef.current;

      if (state.level < FISHING_UNLOCK_LEVEL) {
        pushToast(
          `Angeln ab Hof-Level ${FISHING_UNLOCK_LEVEL}`,
          `Du bist aktuell Level ${state.level}. Bald erhältst du deine eigene Angel!`,
          'info'
        );
        return;
      }

      if (fishingCastRef.current?.active) {
        handleReelFishing();
        return;
      }

      const p = playerPosRef.current;
      const dist = Math.hypot(p.x - wx, p.y - wy);
      if (dist > 2.8) {
        pushToast('Zu weit vom Wasser entfernt!', 'Laufe mit WASD / Pfeiltasten direkt ans rechte Flussufer.', 'info');
        spawnFloat(wx, wy, 'Näher ans Ufer!', '#fca5a5', true);
        return;
      }

      const hasBait = (state.fishingBaitCharges || 0) > 0;
      if (state.selectedTool !== 'fishing' || hasBait) {
        setGameState((prev) => ({
          ...prev,
          selectedTool: 'fishing',
          fishingBaitCharges: hasBait ? Math.max(0, (prev.fishingBaitCharges || 0) - 1) : prev.fishingBaitCharges || 0,
        }));
      }

      const region = getRiverRegionForWy(wy);
      const density = state.fishing.regionDensity[region];
      const densityMeta = FISH_DENSITY_META[density];

      audioEngine.playSfx('splash');
      pushBurst(wx, wy, 'splash');
      clearFishingTimers();
      setFishingCast({
        active: true,
        phase: 'waiting',
        targetWx: wx,
        targetWy: wy,
        region,
        usedBait: hasBait,
      });
      setPlayerPos((curr) => ({ ...curr, facing: 'right' }));
      if (hasBait) {
        spawnFloat(wx, wy, 'Profi-Köder aktiv!', '#38bdf8', true);
      }

      const luckActive = (state.mushroomEffect?.luckBuffRemainingMs ?? 0) > 0;
      const baseCatchChance = density === 'none' ? 0 : densityMeta.catchChance;
      const weatherCatchBonus =
        state.weather === 'rainy' ? 0.1 : state.weather === 'stormy' ? 0.06 : 0;
      const effectiveCatchChance = Math.min(
        0.99,
        baseCatchChance + weatherCatchBonus + (luckActive ? 0.22 : 0) + (hasBait ? 0.35 : 0)
      );

      if (Math.random() > effectiveCatchChance) {
        fishingTimersRef.current.waitTimer = window.setTimeout(() => {
          setFishingCast(null);
          spawnFloat(wx, wy, 'Kein Fisch hier...', '#cbd5e1', true);
          pushToast(
            density === 'none' ? `${FISHING_REGION_LABELS[region]} ist fischleer` : 'Kein Biss in diesem Wurf',
            'Probiere einen anderen Abschnitt am Fluss (Oben, Mitte oder Unten)!',
            'info'
          );
        }, 2300);
        return;
      }

      const waitMs = Math.round(
        (1300 + Math.random() * 1900) * densityMeta.waitMult * (luckActive ? 0.78 : 1) * (hasBait ? 0.65 : 1)
      );
      fishingTimersRef.current.waitTimer = window.setTimeout(() => {
        audioEngine.playSfx('bite');
        setFishingCast((curr) => (curr ? { ...curr, phase: 'biting' } : null));
        spawnFloat(wx, wy, 'Biss!!', '#fef08a', true);

        fishingTimersRef.current.missTimer = window.setTimeout(() => {
          setFishingCast(null);
          pushToast('Fisch entkommen', 'Beim nächsten ! etwas schneller einholen.', 'info');
        }, 3800);
      }, waitMs);
    },
    [clearFishingTimers, handleReelFishing, pushToast, settings, spawnFloat, startMusicOnInteraction]
  );

  // Keyboard shortcuts, WASD world movement & Spacebar Jump
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const keysDown = new Set<string>();
    let moveInterval: number | null = null;

    const isFenceBlockedAt = (tx: number, ty: number, currTx: number, currTy: number, isJumping: boolean) => {
      if (isJumping) return false;
      if (tx === currTx && ty === currTy) return false;
      const fx = tx - WORLD_MARGIN;
      const fy = ty - WORLD_MARGIN;
      if (fx < 0 || fy < 0 || fx >= GRID_SIZE || fy >= GRID_SIZE) return false;
      return gameStateRef.current.tiles[fy]?.[fx]?.entity?.itemId === 'fence';
    };

    const isWalkableWorld = (nx: number, ny: number, currX: number, currY: number, isJumping: boolean) => {
      const tx = Math.round(nx);
      const ty = Math.round(ny);
      const currTx = Math.round(currX);
      const currTy = Math.round(currY);
      // Keep out of the east river (both valley and village north) and south river except bridge (wx === 14)
      if (tx === WORLD_SIZE - 2 && ty >= -17 && ty <= WORLD_SIZE - 2) return false;
      if (ty === WORLD_SIZE - 2 && tx >= 4 && tx <= WORLD_SIZE - 2 && tx !== 14) return false;
      // Keep out of the rocky Alte Waldmine cliff wall (entrance track at wy === 12 remains walkable!)
      if (tx >= 1 && tx <= 2 && ty === 11) return false;
      // Keep out of Abenteuerpark perimeter walls except through the North (-9.5..-7.5) & East (6.2..7.8) gates
      const inNorthParkGate = nx >= -9.5 && nx <= -7.5;
      const inEastParkGate = ny >= 6.2 && ny <= 7.8;
      if (nx < -0.6 && ny >= -0.45 && ny <= 0.75 && !inNorthParkGate) return false;
      if (nx >= -1.25 && nx <= -0.35 && ny >= 0.4 && !inEastParkGate) return false;
      if (nx < -0.6 && ny > 19.55) return false;
      // Keep out of village house and Westviertel business walls (allow stepping right up to doorways)
      if (ny < -0.5) {
        for (const h of VILLAGE_HOUSES) {
          if (nx >= h.x + 0.15 && nx <= h.x + h.width - 0.15 && ny >= h.y + 0.3 && ny <= h.y + h.height - 0.35) {
            return false;
          }
        }
        for (const b of VILLAGE_BUSINESSES) {
          if (nx >= b.x + 0.15 && nx <= b.x + b.width - 0.15 && ny >= b.y + 0.25 && ny <= b.y + b.height - 0.3) {
            return false;
          }
        }
      }
      if (isFenceBlockedAt(tx, ty, currTx, currTy, isJumping)) return 'fence';
      return true;
    };

    const stepMove = () => {
      const feastActive = (gameStateRef.current.feastBuff?.remainingMs ?? 0) > 0;
      const moveStep = feastActive ? 0.18 * 1.25 : 0.18;
      let dx = 0;
      let dy = 0;
      if (keysDown.has('w') || keysDown.has('arrowup')) dy -= moveStep;
      if (keysDown.has('s') || keysDown.has('arrowdown')) dy += moveStep;
      if (keysDown.has('a') || keysDown.has('arrowleft')) dx -= moveStep;
      if (keysDown.has('d') || keysDown.has('arrowright')) dx += moveStep;

      if (dx === 0 && dy === 0) {
        setPlayerPos((p) => (p.moving ? { ...p, moving: false } : p));
        return;
      }

      // Moving cancels an active cast line
      if (fishingCastRef.current?.active) {
        clearFishingTimers();
        setFishingCast(null);
      }

      const now = Date.now();
      setPlayerPos((p) => {
        const isJumping = Boolean(p.jumpStartMs && now - p.jumpStartMs < 460);
        const minXForY =
          p.y < -0.45 ? -27.2 : p.y <= 19.55 && (p.x < -0.6 || (p.y >= 6.2 && p.y <= 7.8)) ? -18.1 : -0.5;
        const clampedX = Math.max(minXForY, Math.min(WORLD_SIZE - 2.6, p.x + dx));
        const maxYForX = clampedX < -0.6 ? 19.55 : WORLD_SIZE - 1.5;
        const clampedY = Math.max(-15.2, Math.min(maxYForX, p.y + dy));
        const resX = isWalkableWorld(clampedX, p.y, p.x, p.y, isJumping);
        const nx = resX === true ? clampedX : p.x;
        const resY = isWalkableWorld(nx, clampedY, nx, p.y, isJumping);
        const ny = resY === true ? clampedY : p.y;

        if ((resX === 'fence' || resY === 'fence') && now - lastFenceHintAtRef.current > 2600) {
          lastFenceHintAtRef.current = now;
          window.setTimeout(() => {
            spawnFloat(p.x, p.y - 0.5, 'Leertaste: Über Zaun springen!', '#fde047', true);
          }, 0);
        }

        const facing =
          Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
        return { ...p, x: nx, y: ny, facing, moving: true };
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const key = e.key === ' ' ? 'space' : e.key.toLowerCase();

      if (key === 'escape') {
        if (movingDecorationRef.current) {
          setMovingDecoration(null);
          audioEngine.playSfx('click');
          return;
        }
        setActiveModal((m) => (m === 'none' ? 'options' : 'none'));
        return;
      }

      if (key === 'space' && activeModal === 'none') {
        e.preventDefault();
        if (fishingCastRef.current?.active && fishingCastRef.current.phase === 'biting') {
          handleReelFishing();
          return;
        }
        const now = Date.now();
        if (now - lastJumpAtRef.current >= 380) {
          lastJumpAtRef.current = now;
          audioEngine.playSfx('jump');
          setPlayerPos((p) => ({ ...p, jumpStartMs: now }));
        }
        return;
      }

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        if (activeModal === 'none') {
          keysDown.add(key);
          if (moveInterval === null) {
            moveInterval = window.setInterval(stepMove, 33);
          }
        }
        return;
      }

      const kb = settings.keybinds;
      if (key === kb.toolHand) { setMovingDecoration(null); setGameState((s) => ({ ...s, selectedTool: 'hand' })); }
      else if (key === kb.toolHoe) { setMovingDecoration(null); setGameState((s) => ({ ...s, selectedTool: 'hoe' })); }
      else if (key === kb.toolWater) { setMovingDecoration(null); setGameState((s) => ({ ...s, selectedTool: 'water' })); }
      else if (key === kb.toolFertilize) { setMovingDecoration(null); setGameState((s) => ({ ...s, selectedTool: 'fertilize' })); }
      else if (key === kb.toolPlant) {
        setMovingDecoration(null);
        setGameState((s) => {
          const cur = CATALOG_BY_ID[s.selectedSeedId];
          const isPlantable = cur && (cur.category === 'crop' || cur.category === 'mushroom' || cur.category === 'tree');
          const nextSeedId = isPlantable && (s.seeds[cur.id] || 0) > 0
            ? s.selectedSeedId
            : CATALOG.find(
                (i) => (i.category === 'crop' || i.category === 'mushroom' || i.category === 'tree') && (s.seeds[i.id] || 0) > 0
              )?.id || s.selectedSeedId;
          return { ...s, selectedTool: 'plant', selectedSeedId: nextSeedId };
        });
      }
      else if (key === (kb.toolBuild || '9')) {
        setMovingDecoration(null);
        setGameState((s) => {
          const cur = CATALOG_BY_ID[s.selectedSeedId];
          const isBuildable = cur && (cur.category === 'decoration' || cur.category === 'animal');
          const nextSeedId = isBuildable && (s.seeds[cur.id] || 0) > 0
            ? s.selectedSeedId
            : CATALOG.find(
                (i) => (i.category === 'decoration' || i.category === 'animal') && (s.seeds[i.id] || 0) > 0
              )?.id || s.selectedSeedId;
          return { ...s, selectedTool: 'build', selectedSeedId: nextSeedId };
        });
      }
      else if (key === '8') { setMovingDecoration(null); setGameState((s) => ({ ...s, selectedTool: 'move' })); }
      else if (key === kb.toolRemove) { setMovingDecoration(null); setGameState((s) => ({ ...s, selectedTool: 'remove' })); }
      else if (key === '7' && gameStateRef.current.level >= FISHING_UNLOCK_LEVEL) {
        setMovingDecoration(null);
        setGameState((s) => ({ ...s, selectedTool: 'fishing' }));
      } else if (key === 'i') { setMovingDecoration(null); setActiveModal((m) => (m === 'inventory' ? 'none' : 'inventory')); }
      else if (key === kb.openMarket) setActiveModal((m) => (m === 'market' ? 'none' : 'market'));
      else if (key === kb.openNeighbors) setActiveModal((m) => (m === 'neighbors' ? 'none' : 'neighbors'));
      else if (key === kb.openEvents) setActiveModal((m) => (m === 'events' ? 'none' : 'events'));
      else if (key === kb.openAvatar) setActiveModal((m) => (m === 'avatar' ? 'none' : 'avatar'));
      else if (key === kb.openOptions) setActiveModal((m) => (m === 'options' ? 'none' : 'options'));
      else if (key === kb.toggleMusic) {
        updateSettings({ ...settings, musicPlaying: !settings.musicPlaying });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysDown.delete(key);
      if (keysDown.size === 0 && moveInterval !== null) {
        window.clearInterval(moveInterval);
        moveInterval = null;
        setPlayerPos((p) => ({ ...p, moving: false }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (moveInterval !== null) window.clearInterval(moveInterval);
    };
  }, [phase, activeModal, settings, updateSettings, clearFishingTimers, handleReelFishing, spawnFloat]);

  // Core Tile Interaction
  const handleTileInteract = useCallback(
    (x: number, y: number, isDrag = false) => {
      startMusicOnInteraction(settings);

      const activeMove = movingDecorationRef.current;
      if (activeMove) {
        if (isDrag) return;
        if (x === activeMove.fromX && y === activeMove.fromY) {
          setMovingDecoration(null);
          audioEngine.playSfx('click');
          return;
        }
        const currState = gameStateRef.current;
        const destTile = currState.tiles[y]?.[x];
        if (!destTile || !destTile.unlocked) return;
        const isFlyHere =
          currState.flyAgaricPos !== null &&
          currState.flyAgaricPos.x === x &&
          currState.flyAgaricPos.y === y;
        const isGiftHere = Boolean(
          currState.winterFestival?.droppedGifts?.some((g) => g.x === x && g.y === y)
        );
        if (destTile.entity || isFlyHere || isGiftHere) {
          spawnFloat(x, y, 'Feld ist belegt!', '#fca5a5');
          return;
        }

        const moveName = CATALOG_BY_ID[activeMove.itemId]?.name || 'Dekoobjekt';
        setMovingDecoration(null);
        audioEngine.playSfx('plant');
        spawnFloat(x, y, `${moveName} verschoben!`, '#fde047');

        setGameState((prev) => {
          const src = prev.tiles[activeMove.fromY]?.[activeMove.fromX];
          const dst = prev.tiles[y]?.[x];
          if (!src?.entity || src.entity.category !== 'decoration' || !dst || !dst.unlocked || dst.entity) {
            return prev;
          }
          const nextTiles = prev.tiles.map((r) => r.map((c) => ({ ...c })));
          const movedEntity = { ...src.entity };
          nextTiles[activeMove.fromY][activeMove.fromX].entity = null;
          nextTiles[y][x].entity = movedEntity;
          if (nextTiles[y][x].ground === 'tilled') {
            nextTiles[y][x].ground = 'grass';
            nextTiles[y][x].watered = false;
            nextTiles[y][x].wateredRemainingMs = 0;
          }
          nextTiles[y][x].dryMs = 0;
          nextTiles[y][x].idleTilledMs = 0;
          return { ...prev, tiles: nextTiles };
        });
        return;
      }

      const snap = gameStateRef.current;
      const snapTile = snap.tiles[y]?.[x];
      if (!snapTile || !snapTile.unlocked) return;

      // Collect wrapped Christmas gift dropped by Santa!
      const giftOnTile = snap.winterFestival?.droppedGifts?.find((g) => g.x === x && g.y === y);
      if (giftOnTile && !isDrag) {
        const giftMeta = CATALOG_BY_ID[giftOnTile.itemId];
        audioEngine.playSfx('santa');
        spawnFloat(x, y, `🎁 +1 ${giftMeta?.name || 'Weihnachts-Deko'}!`, '#fde047');
        pushToast(
          `Geschenk ausgepackt: ${giftMeta?.name || 'Weihnachts-Deko'}!`,
          'Liegt jetzt in deinem Rucksack – wähle Bau [6], um die Deko auf deinem Hof aufzustellen!',
          'success'
        );
        setGameState((prev) => {
          const fest = prev.winterFestival;
          if (!fest) return prev;
          const remainingGifts = fest.droppedGifts.filter((g) => !(g.x === x && g.y === y));
          const rewardXp = giftMeta?.xpReward ?? 100;
          const xpRes = addXpAndCheckLevelUp(
            {
              ...prev,
              seeds: {
                ...prev.seeds,
                [giftOnTile.itemId]: (prev.seeds[giftOnTile.itemId] || 0) + 1,
              },
              selectedSeedId: giftOnTile.itemId,
              winterFestival: {
                ...fest,
                droppedGifts: remainingGifts,
              },
            },
            rewardXp
          );
          return xpRes.state;
        });
        return;
      }

      if (
        snapTile.entity?.category === 'decoration' &&
        !snapTile.entity.withered &&
        snap.selectedTool === 'hand' &&
        !isDrag &&
        ARTISAN_STATION_IDS.has(snapTile.entity.itemId)
      ) {
        setCraftModalStation(snapTile.entity.itemId as CraftStationId);
        setActiveModal('craft');
        audioEngine.playSfx('click');
        return;
      }

      if (
        snapTile.entity?.category === 'decoration' &&
        !snapTile.entity.withered &&
        (snap.selectedTool === 'move' || (snap.selectedTool === 'hand' && !isDrag))
      ) {
        setMovingDecoration({ fromX: x, fromY: y, itemId: snapTile.entity.itemId });
        audioEngine.playSfx('click');
        spawnFloat(x, y, 'Zielfeld anklicken!', '#7dd3fc');
        return;
      }

      if (snap.selectedTool === 'move') {
        if (!isDrag && snapTile.entity) {
          spawnFloat(x, y, 'Nur Dekoobjekte verschiebbar!', '#fca5a5');
        }
        return;
      }

      setGameState((prev) => {
        const tile = prev.tiles[y]?.[x];
        if (!tile || !tile.unlocked) return prev;

        const tool = prev.selectedTool;
        let nextTiles = prev.tiles;
        const cloneTiles = () => {
          if (nextTiles === prev.tiles) {
            nextTiles = prev.tiles.map((r) => r.map((c) => ({ ...c })));
          }
          return nextTiles[y][x];
        };

        if (tile.entity?.withered) {
          const t = cloneTiles();
          t.entity = null;
          t.ground = 'grass';
          t.watered = false;
          t.wateredRemainingMs = 0;
          t.dryMs = 0;
          t.idleTilledMs = 0;
          t.enriched = false;
          audioEngine.playSfx('till');
          spawnFloat(x, y, 'Verdorrt entfernt · Neu hacken!', '#fca5a5');
          return { ...prev, tiles: nextTiles };
        }

        if (tile.entity?.damaged) {
          const t = cloneTiles();
          t.entity = null;
          t.enriched = true;
          audioEngine.playSfx('harvest');
          spawnFloat(x, y, 'Boden +50% Bonus!', '#4ade80');
          return { ...prev, tiles: nextTiles };
        }

        if (tile.entity?.ready) {
          const item = CATALOG_BY_ID[tile.entity.itemId];
          if (!item) return prev;
          const t = cloneTiles();

          const luckActive = (prev.mushroomEffect?.luckBuffRemainingMs ?? 0) > 0;
          const harvestQty = luckActive && Math.random() < 0.2 ? 2 : 1;
          const nextInv = { ...prev.inventory, [item.id]: (prev.inventory[item.id] || 0) + harvestQty };
          const eventPts = Math.max(4, Math.round(item.xpReward * 0.35)) * harvestQty;

          if (tile.entity.category === 'animal') {
            t.entity = {
              ...tile.entity,
              progressMs: 0,
              ready: false,
              harvestCount: tile.entity.harvestCount + 1,
            };
            audioEngine.playSfx('animal');
          } else if (tile.entity.category === 'meat') {
            t.entity = null;
            audioEngine.playSfx('harvest');
          } else if (tile.entity.category === 'tree') {
            const regrowTime = item.regrowMs ?? Math.round(item.growthMs * 0.45);
            t.entity = {
              ...tile.entity,
              progressMs: Math.max(0, item.growthMs - regrowTime),
              ready: false,
              harvestCount: tile.entity.harvestCount + 1,
            };
            audioEngine.playSfx('harvest');
          } else {
            t.entity = null;
            t.enriched = false;
            const nextM = Math.max(0, (t.wateredRemainingMs ?? 0) - MAX_MOISTURE_MS * 0.4);
            t.watered = nextM > 0;
            t.wateredRemainingMs = nextM;
            audioEngine.playSfx('harvest');
          }

          spawnFloat(
            x,
            y,
            harvestQty > 1
              ? `+${harvestQty} ${item.produceName} (Pilz-Glück!)`
              : `+1 ${item.produceName} (+${item.xpReward} XP)`,
            harvestQty > 1 ? '#4ade80' : '#fef08a'
          );
          pushBurst(WORLD_MARGIN + x, WORLD_MARGIN + y, 'harvest', item.pixelColor);

          const discRes = recordAlmanacDiscovery(prev.almanac, item.id);
          const xpResult = addXpAndCheckLevelUp(
            {
              ...prev,
              tiles: nextTiles,
              inventory: nextInv,
              almanac: discRes.almanac,
              eventState: {
                ...prev.eventState,
                points: prev.eventState.points + eventPts,
              },
              stats: {
                ...prev.stats,
                totalHarvested: prev.stats.totalHarvested + harvestQty,
                harvestedByItem: {
                  ...(prev.stats.harvestedByItem || {}),
                  [item.id]: ((prev.stats.harvestedByItem || {})[item.id] || 0) + harvestQty,
                },
              },
            },
            item.xpReward * harvestQty
          );

          const petRes = addPetXp(xpResult.state, 6);
          const questKind =
            tile.entity.category === 'mushroom'
              ? 'harvest_mushroom'
              : tile.entity.category === 'animal' || tile.entity.category === 'meat'
              ? 'collect_animal'
              : tile.entity.category === 'tree'
              ? 'harvest_tree'
              : 'harvest_crop';
          let questedState = advanceQuestProgress(petRes.state, questKind, harvestQty);
          questedState = advanceQuestProgress(questedState, 'harvest_specific', harvestQty, item.id);
          questedState = advanceQuestProgress(questedState, 'event_points', eventPts);

          if (xpResult.leveledUpTo) {
            audioEngine.playSfx('levelup');
            pushToast(
              `Level ${xpResult.leveledUpTo} erreicht!`,
              `Bonus: +${xpResult.leveledUpTo * 65} Münzen.`,
              'success'
            );
            if (prev.level < FISHING_UNLOCK_LEVEL && xpResult.leveledUpTo >= FISHING_UNLOCK_LEVEL) {
              pushToast(
                'Angel freigeschaltet!',
                'Laufe zum Fluss am rechten Rand und wirf deine Angel aus!',
                'success'
              );
            }
            if (prev.level < 18 && xpResult.leveledUpTo >= 18) {
              pushToast(
                'Winter-Gewächshaus freigeschaltet!',
                'Ab Level 18 auf dem Bauernmarkt oder vergünstigt in der Waldmine-Schmiede erhältlich!',
                'success'
              );
            }
            if (prev.level < WORKERS_UNLOCK_LEVEL && xpResult.leveledUpTo >= WORKERS_UNLOCK_LEVEL) {
              pushToast(
                'Personal freigeschaltet!',
                'Du kannst jetzt im Personal-Menü deinen 1. Angestellten einstellen!',
                'success'
              );
            } else if ((prev.level < 60 && xpResult.leveledUpTo >= 60) || (prev.level < 90 && xpResult.leveledUpTo >= 90)) {
              pushToast(
                'Neuer Personal-Platz!',
                `Ab Level ${xpResult.leveledUpTo} kannst du bis zu ${getMaxWorkersForLevel(xpResult.leveledUpTo)} Angestellte beschäftigen.`,
                'success'
              );
            }
          }

          return questedState;
        }

        if (tool === 'hoe') {
          if (tile.entity || tile.ground === 'tilled') return prev;
          const t = cloneTiles();
          t.ground = 'tilled';
          t.dryMs = 0;
          t.idleTilledMs = 0;
          audioEngine.playSfx('till');
          pushBurst(WORLD_MARGIN + x, WORLD_MARGIN + y, 'hoe');
          return { ...prev, tiles: nextTiles };
        }

        if (tool === 'water') {
          const offsets = getWateringPatternOffsets(prev.wateringCanTier || 1);
          let wateredNow = 0;

          offsets.forEach(({ dx, dy }) => {
            const tx = x + dx;
            const ty = y + dy;
            if (tx < 0 || ty < 0 || tx >= GRID_SIZE || ty >= GRID_SIZE) return;
            const targetTile = prev.tiles[ty]?.[tx];
            if (!targetTile || !targetTile.unlocked || targetTile.ground !== 'tilled') return;
            const needsRefresh =
              !targetTile.watered || (targetTile.wateredRemainingMs ?? 0) < MAX_MOISTURE_MS * 0.85;
            if (!needsRefresh) return;

            if (nextTiles === prev.tiles) {
              nextTiles = prev.tiles.map((r) => r.map((c) => ({ ...c })));
            }
            nextTiles[ty][tx].watered = true;
            nextTiles[ty][tx].wateredRemainingMs = MAX_MOISTURE_MS;
            nextTiles[ty][tx].dryMs = 0;
            nextTiles[ty][tx].idleTilledMs = 0;
            wateredNow += 1;
            pushBurst(WORLD_MARGIN + tx, WORLD_MARGIN + ty, 'water');
          });

          if (wateredNow === 0) return prev;
          audioEngine.playSfx('water');
          spawnFloat(x, y, wateredNow > 1 ? `${wateredNow}× Bewässert!` : 'Bewässert', '#7dd3fc');
          const petRes = addPetXp(
            {
              ...prev,
              tiles: nextTiles,
              tutorial: {
                ...prev.tutorial,
                wateredCount: prev.tutorial.wateredCount + wateredNow,
              },
            },
            3 * wateredNow
          );
          return advanceQuestProgress(petRes.state, 'water_tiles', wateredNow);
        }

        if (tool === 'fertilize') {
          if (prev.fertilizerCount <= 0 || tile.enriched || tile.ground !== 'tilled') {
            if (prev.fertilizerCount <= 0) {
              pushToast('Kein Dünger mehr', 'Kaufe neuen Hof-Dünger auf dem Bauernmarkt.', 'info');
            }
            return prev;
          }
          const t = cloneTiles();
          t.enriched = true;
          audioEngine.playSfx('water');
          pushBurst(WORLD_MARGIN + x, WORLD_MARGIN + y, 'fertilize');
          spawnFloat(x, y, 'Nährstoffreich +50%', '#4ade80');
          return advanceQuestProgress(
            {
              ...prev,
              fertilizerCount: prev.fertilizerCount - 1,
              tiles: nextTiles,
            },
            'use_fertilizer',
            1
          );
        }

        if (tool === 'plant' || tool === 'build') {
          const item = CATALOG_BY_ID[prev.selectedSeedId];
          if (!item) return prev;
          const isPlantable =
            item.category === 'crop' || item.category === 'mushroom' || item.category === 'tree';
          const isBuildable = item.category === 'decoration' || item.category === 'animal';
          if (tool === 'plant' && !isPlantable) {
            if (!isDrag) {
              pushToast('Unter „Säen“ nur Saatgut', 'Wähle Saatgut, Pilze oder Obstbäume aus — Deko findest du unter „Bau“.', 'info');
            }
            return prev;
          }
          if (tool === 'build' && !isBuildable) {
            if (!isDrag) {
              pushToast('Unter „Bau“ nur Deko & Hofobjekte', 'Für Saatgut wähle bitte das Werkzeug „Säen“.', 'info');
            }
            return prev;
          }
          const owned = prev.seeds[item.id] || 0;
          if (owned <= 0) {
            pushToast(`Kein Vorrat an ${item.name}`, 'Öffne den Bauernmarkt, um nachzukaufen.', 'info');
            return prev;
          }
          if (tile.entity) return prev;
          if ((item.category === 'crop' || item.category === 'mushroom') && tile.ground !== 'tilled') {
            spawnFloat(x, y, 'Erst mit Hacke [2] ackern!', '#fde047');
            return prev;
          }

          const t = cloneTiles();
          t.dryMs = 0;
          t.idleTilledMs = 0;
          if ((item.category === 'animal' || item.category === 'decoration' || item.category === 'tree') && t.ground === 'tilled') {
            t.ground = 'grass';
            t.watered = false;
            t.wateredRemainingMs = 0;
          }

          t.entity = {
            itemId: item.id,
            category: item.category,
            progressMs: 0,
            ready: false,
            harvestCount: 0,
            fedOrWatered: true,
            ...(item.category === 'animal' && isLivestockAnimal(item.id)
              ? { ageMs: 0, lifespanMs: createAnimalLifespanMs() }
              : {}),
          };

          const nextSeeds = { ...prev.seeds, [item.id]: owned - 1 };
          let nextSelectedSeed = prev.selectedSeedId;
          if (nextSeeds[item.id] === 0) {
            const alt = Object.keys(nextSeeds).find((k) => {
              if ((nextSeeds[k] || 0) <= 0) return false;
              const cat = CATALOG_BY_ID[k]?.category;
              return tool === 'build'
                ? cat === 'decoration' || cat === 'animal'
                : cat === 'crop' || cat === 'mushroom' || cat === 'tree';
            });
            if (alt) nextSelectedSeed = alt;
          }

          audioEngine.playSfx(item.category === 'animal' ? 'animal' : 'plant');
          pushBurst(
            WORLD_MARGIN + x,
            WORLD_MARGIN + y,
            item.category === 'decoration' ? 'build' : 'plant',
            item.pixelColor
          );
          if (item.id === 'winter_greenhouse') {
            spawnFloat(x, y, '5×5 Winter-Gewächshaus!', '#6ee7b7');
          } else if (
            prev.season === 'winter' &&
            (item.category === 'crop' || item.category === 'mushroom' || item.category === 'tree')
          ) {
            const tileProt = getTileProtections(nextTiles, x, y);
            if (tileProt.greenhoused) {
              spawnFloat(x, y, `${item.name} (+25% Wärme!)`, '#6ee7b7');
            } else {
              spawnFloat(x, y, `${item.name} (kalt)`, '#bae6fd');
            }
          } else {
            spawnFloat(x, y, item.name, '#ffffff');
          }

          const nextTutorial = {
            ...prev.tutorial,
            plantedCount: prev.tutorial.plantedCount + 1,
            mushroomPlanted: prev.tutorial.mushroomPlanted || item.category === 'mushroom',
          };

          if (item.category === 'decoration') {
            const xpRes = addXpAndCheckLevelUp(
              {
                ...prev,
                tiles: nextTiles,
                seeds: nextSeeds,
                selectedSeedId: nextSelectedSeed,
                tutorial: nextTutorial,
                stats: {
                  ...prev.stats,
                  totalDecorPlaced: (prev.stats.totalDecorPlaced || 0) + 1,
                },
              },
              item.xpReward
            );
            return advanceQuestProgress(xpRes.state, 'place_decor', 1);
          }

          return advanceQuestProgress(
            {
              ...prev,
              tiles: nextTiles,
              seeds: nextSeeds,
              selectedSeedId: nextSelectedSeed,
              tutorial: nextTutorial,
            },
            'plant_seeds',
            1
          );
        }

        if (tool === 'remove') {
          const t = cloneTiles();
          if (t.entity) {
            const wasWithered = Boolean(t.entity.withered);
            const wasDamaged = Boolean(t.entity.damaged);
            const item = CATALOG_BY_ID[t.entity.itemId];
            if (!wasWithered && t.entity.category === 'meat' && item) {
              t.entity = null;
              const nextInv = { ...prev.inventory, [item.id]: (prev.inventory[item.id] || 0) + 1 };
              const eventPts = Math.max(4, Math.round(item.xpReward * 0.35));
              const discRes = recordAlmanacDiscovery(prev.almanac, item.id);
              const xpResult = addXpAndCheckLevelUp(
                {
                  ...prev,
                  inventory: nextInv,
                  almanac: discRes.almanac,
                  tiles: nextTiles,
                  eventState: {
                    ...prev.eventState,
                    points: prev.eventState.points + eventPts,
                  },
                  stats: {
                    ...prev.stats,
                    totalHarvested: prev.stats.totalHarvested + 1,
                    harvestedByItem: {
                      ...(prev.stats.harvestedByItem || {}),
                      [item.id]: ((prev.stats.harvestedByItem || {})[item.id] || 0) + 1,
                    },
                  },
                },
                item.xpReward
              );
              const petRes = addPetXp(xpResult.state, 6);
              let questedState = advanceQuestProgress(petRes.state, 'collect_animal', 1);
              questedState = advanceQuestProgress(questedState, 'harvest_specific', 1, item.id);
              questedState = advanceQuestProgress(questedState, 'event_points', eventPts);
              if (xpResult.leveledUpTo) {
                audioEngine.playSfx('levelup');
                pushToast(
                  `Level ${xpResult.leveledUpTo} erreicht!`,
                  `Bonus: +${xpResult.leveledUpTo * 65} Münzen.`,
                  'success'
                );
              } else {
                audioEngine.playSfx('harvest');
              }
              spawnFloat(x, y, `+1 ${item.produceName} (+${item.xpReward} XP)`, '#fef08a');
              return questedState;
            }
            if (!wasWithered && wasDamaged) {
              t.entity = null;
              t.enriched = true;
              audioEngine.playSfx('harvest');
              spawnFloat(x, y, 'Boden +50% Bonus!', '#4ade80');
              return { ...prev, tiles: nextTiles };
            }
            const isPackable =
              !wasWithered &&
              (t.entity.category === 'decoration' || t.entity.category === 'animal' || t.entity.category === 'tree') &&
              Boolean(item);
            t.entity = null;
            t.dryMs = 0;
            t.idleTilledMs = 0;
            if (wasWithered) {
              t.ground = 'grass';
              t.watered = false;
              t.wateredRemainingMs = 0;
            }
            if (isPackable && item) {
              const nextSeeds = { ...prev.seeds, [item.id]: (prev.seeds[item.id] || 0) + 1 };
              audioEngine.playSfx('click');
              spawnFloat(x, y, `+1 ${item.name} → Inventar`, '#fde047');
              return { ...prev, seeds: nextSeeds, tiles: nextTiles };
            }
            const refund = !wasWithered && item ? Math.round(item.seedCost * 0.4) : 0;
            audioEngine.playSfx('till');
            if (refund > 0) spawnFloat(x, y, `+${refund} Münzen`, '#fcd34d');
            return { ...prev, coins: prev.coins + refund, tiles: nextTiles };
          }
          if (t.ground === 'tilled' || t.ground === 'path') {
            t.ground = 'grass';
            t.watered = false;
            t.wateredRemainingMs = 0;
            t.dryMs = 0;
            t.idleTilledMs = 0;
            t.enriched = false;
            audioEngine.playSfx('till');
            pushBurst(WORLD_MARGIN + x, WORLD_MARGIN + y, 'remove');
            return { ...prev, tiles: nextTiles };
          }
        }

        return prev;
      });
    },
    [pushBurst, pushToast, settings, spawnFloat, startMusicOnInteraction]
  );

  const handleFlyAgaricInteract = useCallback(
    (fx: number, fy: number) => {
      startMusicOnInteraction(settings);
      const state = gameStateRef.current;
      if (!state.flyAgaricPos || state.flyAgaricPos.x !== fx || state.flyAgaricPos.y !== fy) return;

      const p = playerPosRef.current;
      const dist = Math.hypot(p.x - (fx + WORLD_MARGIN), p.y - (fy + WORLD_MARGIN));
      if (dist > 2.4) {
        spawnFloat(fx, fy, 'Laufe näher ran!', '#fca5a5');
        pushToast(
          'Zu weit vom Fliegenpilz entfernt',
          'Laufe mit WASD direkt zum Fliegenpilz und iss ihn per Rechtsklick!',
          'info'
        );
        return;
      }

      audioEngine.playSfx('harvest');
      spawnFloat(fx, fy, '🍄 Fliegenpilz gegessen!', '#f472b6');
      pushToast(
        'Fliegenpilz gegessen! (30 Sek. Traum-Effekt)',
        'Danach erhältst du 15 Minuten lang besseres Angeln & +20 % mehr Ernte & Fische!',
        'success'
      );
      setGameState((prev) => ({
        ...prev,
        flyAgaricPos: null,
        mushroomEffect: {
          psychedelicRemainingMs: FLY_AGARIC_PSYCHEDELIC_MS,
          luckBuffRemainingMs: prev.mushroomEffect?.luckBuffRemainingMs ?? 0,
          respawnCooldownMs: FLY_AGARIC_COOLDOWN_MS,
          lastEatenDay: prev.day,
        },
      }));
    },
    [pushToast, settings, spawnFloat, startMusicOnInteraction]
  );

  // Market Handlers (including Farmhouse sell multiplier!)
  const handleSellItem = (itemId: string, qty: number) => {
    setGameState((prev) => {
      const owned = prev.inventory[itemId] || 0;
      const count = Math.min(owned, qty);
      if (count <= 0) return prev;
      const base = CATALOG_BY_ID[itemId]?.sellPrice || 0;
      const hotMult = prev.marketHotItems.includes(itemId) ? 1.3 : 1;
      const crashMult = getMarketCrashMult(prev, itemId);
      const houseBonuses = getHouseBonuses(prev.house);
      const almanacBonuses = getAlmanacBonuses(prev.almanac);
      const partnerBonuses = getPartnerBonuses(prev.romance);
      const earned =
        Math.round(
          base * hotMult * crashMult * houseBonuses.sellMult * almanacBonuses.sellMult * partnerBonuses.sellMult
        ) * count;
      audioEngine.playSfx('coin');
      return advanceQuestProgress(
        advanceQuestProgress(
          {
            ...prev,
            coins: prev.coins + earned,
            inventory: { ...prev.inventory, [itemId]: owned - count },
            tutorial: { ...prev.tutorial, soldCount: prev.tutorial.soldCount + count },
            eventState: { ...prev.eventState, points: prev.eventState.points + count * 3 },
            stats: { ...prev.stats, totalSoldCoins: prev.stats.totalSoldCoins + earned },
          },
          'sell_coins',
          earned
        ),
        'event_points',
        count * 3
      );
    });
  };

  const handleSellAll = () => {
    setGameState((prev) => {
      let total = 0;
      let totalQty = 0;
      const nextInv = { ...prev.inventory };
      const houseBonuses = getHouseBonuses(prev.house);
      const almanacBonuses = getAlmanacBonuses(prev.almanac);
      const partnerBonuses = getPartnerBonuses(prev.romance);
      Object.entries(prev.inventory).forEach(([id, qty]) => {
        if (qty <= 0) return;
        const base = CATALOG_BY_ID[id]?.sellPrice || 0;
        const hotMult = prev.marketHotItems.includes(id) ? 1.3 : 1;
        const crashMult = getMarketCrashMult(prev, id);
        total +=
          Math.round(
            base * hotMult * crashMult * houseBonuses.sellMult * almanacBonuses.sellMult * partnerBonuses.sellMult
          ) * qty;
        totalQty += qty;
        nextInv[id] = 0;
      });
      if (total <= 0) return prev;
      audioEngine.playSfx('coin');
      pushToast('Ernte verkauft!', `+${total.toLocaleString('de-DE')} Münzen verdient.`, 'success');
      return advanceQuestProgress(
        advanceQuestProgress(
          {
            ...prev,
            coins: prev.coins + total,
            inventory: nextInv,
            tutorial: { ...prev.tutorial, soldCount: prev.tutorial.soldCount + totalQty },
            eventState: { ...prev.eventState, points: prev.eventState.points + totalQty * 3 },
            stats: { ...prev.stats, totalSoldCoins: prev.stats.totalSoldCoins + total },
          },
          'sell_coins',
          total
        ),
        'event_points',
        totalQty * 3
      );
    });
  };

  const handleCompleteOrder = (orderId: string) => {
    setGameState((prev) => {
      const order = prev.marketOrders.find((o) => o.id === orderId);
      if (!order || order.completed) return prev;
      const owned = prev.inventory[order.itemId] || 0;
      if (owned < order.qty) return prev;

      audioEngine.playSfx('coin');
      const nextOrders = prev.marketOrders.map((o) => (o.id === orderId ? { ...o, completed: true } : o));
      const res = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins + order.rewardCoins,
          inventory: { ...prev.inventory, [order.itemId]: owned - order.qty },
          marketOrders: nextOrders,
          tutorial: { ...prev.tutorial, soldCount: prev.tutorial.soldCount + order.qty },
          eventState: { ...prev.eventState, points: prev.eventState.points + 18 },
          stats: {
            ...prev.stats,
            totalMarketOrders: (prev.stats.totalMarketOrders || 0) + 1,
            totalSoldCoins: prev.stats.totalSoldCoins + order.rewardCoins,
          },
        },
        order.rewardXp
      );
      pushToast(`Bestellung für ${order.customerName} geliefert!`, `+${order.rewardCoins} Münzen · +${order.rewardXp} XP`, 'success');
      return advanceQuestProgress(
        advanceQuestProgress(
          advanceQuestProgress(res.state, 'sell_coins', order.rewardCoins),
          'market_order',
          1
        ),
        'event_points',
        18
      );
    });
  };

  const handleBuyItem = (itemId: string, qty: number) => {
    const item = CATALOG_BY_ID[itemId];
    if (!item) return;
    const targetTool: ToolType =
      item.category === 'decoration' || item.category === 'animal' ? 'build' : 'plant';
    setGameState((prev) => {
      const cost = item.seedCost * qty;
      if (prev.coins < cost || prev.level < item.unlockLevel) return prev;
      audioEngine.playSfx('click');
      return {
        ...prev,
        coins: prev.coins - cost,
        seeds: { ...prev.seeds, [itemId]: (prev.seeds[itemId] || 0) + qty },
        selectedSeedId: itemId,
        selectedTool: targetTool,
      };
    });
    pushToast(
      `${qty}× ${item.name} gekauft`,
      `Werkzeug „${targetTool === 'build' ? 'Bau' : 'Säen'}“ ist direkt ausgewählt.`,
      'info'
    );
  };

  const handleBuyFertilizer = (qty: number) => {
    const cost = qty === 5 ? 160 : 35 * qty;
    setGameState((prev) => {
      if (prev.coins < cost) return prev;
      audioEngine.playSfx('click');
      return {
        ...prev,
        coins: prev.coins - cost,
        fertilizerCount: prev.fertilizerCount + qty,
      };
    });
  };

  const handleUpgradeWateringCan = (targetTier: 2 | 3 | 4) => {
    const info = WATERING_CAN_TIERS[targetTier];
    if (!info) return;
    setGameState((prev) => {
      if ((prev.wateringCanTier || 1) + 1 !== targetTier || prev.level < info.minLevel || prev.coins < info.cost) {
        return prev;
      }
      audioEngine.playSfx('levelup');
      pushToast(`${info.name} freigeschaltet!`, info.description, 'success');
      return {
        ...prev,
        coins: prev.coins - info.cost,
        wateringCanTier: targetTier,
        selectedTool: 'water',
      };
    });
  };

  const handleExpandFarm = (nextRing: number) => {
    const info = EXPANSION_COSTS[nextRing];
    if (!info) return;
    setGameState((prev) => {
      if (prev.unlockedRing + 1 !== nextRing || prev.coins < info.cost || prev.level < info.minLevel) return prev;
      audioEngine.playSfx('levelup');
      const nextTiles = prev.tiles.map((row, y) =>
        row.map((tile, x) => ({
          ...tile,
          unlocked: isTileUnlockedForRing(x, y, nextRing),
        }))
      );
      pushToast('Hof erweitert!', info.label, 'success');
      return {
        ...prev,
        coins: prev.coins - info.cost,
        unlockedRing: nextRing,
        tiles: nextTiles,
      };
    });
  };

  // House Handlers
  const handleUpgradeFloor = (targetFloor: 2 | 3 | 4) => {
    const info = HOUSE_FLOOR_UPGRADES.find((f) => f.floor === targetFloor);
    if (!info) return;
    setGameState((prev) => {
      if (prev.house.floors !== targetFloor - 1 || prev.level < info.minLevel || prev.coins < info.cost) return prev;
      audioEngine.playSfx('levelup');
      pushToast(`Bauernhaus erweitert!`, info.name, 'success');
      return {
        ...prev,
        coins: prev.coins - info.cost,
        house: { ...prev.house, floors: targetFloor },
        tutorial: { ...prev.tutorial, visitedHouseOrPet: true },
      };
    });
  };

  const handleBuyHouseExtra = (extraId: string) => {
    const info = HOUSE_EXTRAS.find((e) => e.id === extraId);
    if (!info) return;
    setGameState((prev) => {
      if (prev.house.extras.includes(extraId) || prev.level < info.minLevel || prev.coins < info.cost) return prev;
      audioEngine.playSfx('levelup');
      pushToast(`Haus-Extra gebaut: ${info.name}`, info.effectText, 'success');
      return {
        ...prev,
        coins: prev.coins - info.cost,
        house: { ...prev.house, extras: [...prev.house.extras, extraId] },
        tutorial: { ...prev.tutorial, visitedHouseOrPet: true },
      };
    });
  };

  // Pet Handlers
  const handlePetInteract = () => {
    setGameState((prev) => {
      if (prev.pet.petCooldownMs > 0) return prev;
      audioEngine.playSfx('animal');
      const res = addPetXp(
        {
          ...prev,
          pet: { ...prev.pet, petCooldownMs: 25000 },
          tutorial: { ...prev.tutorial, visitedHouseOrPet: true },
          stats: {
            ...prev.stats,
            totalPetCares: (prev.stats.totalPetCares || 0) + 1,
          },
        },
        25
      );
      if (res.petLeveledUpTo) {
        audioEngine.playSfx('levelup');
        pushToast(`${prev.pet.name} ist jetzt Level ${res.petLeveledUpTo}!`, 'Noch fleißiger auf dem Hof.', 'success');
      } else {
        pushToast(`${prev.pet.name} freut sich!`, '+25 Haustier-XP', 'success');
      }
      return advanceQuestProgress(advanceQuestProgress(res.state, 'pet_care', 1), 'pet_help', 1);
    });
  };

  // Worker (Personal) Handlers
  const handleHireWorker = (role: WorkerRole, name: string) => {
    const meta = WORKER_ROLES[role];
    setGameState((prev) => {
      const currentWorkers = prev.workers || [];
      const maxSlots = getMaxWorkersForLevel(prev.level);
      if (currentWorkers.length >= maxSlots || prev.coins < meta.dailyWage) return prev;
      const idx = currentWorkers.length;
      const startX = 7 + (idx % 3);
      const startY = 8;
      const newWorker: FarmWorker = {
        id: `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim() || 'Hofhelfer',
        role,
        level: 1,
        xp: 0,
        dailyWage: meta.dailyWage,
        unpaidWage: 0,
        onStrike: false,
        tasks: { ...meta.defaultTasks },
        x: startX,
        y: startY,
        facing: 'right',
        workCooldownMs: 2000,
        lastActionText: 'Neu eingestellt & bereit!',
        outfitColor: meta.outfitColor,
        hatColor: meta.hatColor,
      };
      audioEngine.playSfx('levelup');
      pushToast(
        `${newWorker.name} eingestellt!`,
        `${meta.title} arbeitet ab sofort von 06–22 Uhr (-${meta.dailyWage} M Antrittslohn).`,
        'success'
      );
      return {
        ...prev,
        coins: prev.coins - meta.dailyWage,
        workers: [...currentWorkers, newWorker],
      };
    });
  };

  const handleFireWorker = (workerId: string) => {
    setGameState((prev) => {
      const target = (prev.workers || []).find((w) => w.id === workerId);
      if (!target) return prev;
      audioEngine.playSfx('click');
      pushToast(`${target.name} entlassen`, 'Personal-Platz wieder frei.', 'info');
      return {
        ...prev,
        workers: (prev.workers || []).filter((w) => w.id !== workerId),
      };
    });
  };

  const handleToggleWorkerTask = (workerId: string, task: keyof WorkerTasks) => {
    audioEngine.playSfx('click');
    setGameState((prev) => ({
      ...prev,
      workers: (prev.workers || []).map((w) =>
        w.id === workerId ? { ...w, tasks: { ...w.tasks, [task]: !w.tasks[task] } } : w
      ),
    }));
  };

  const handleRenameWorker = (workerId: string, nextName: string) => {
    const clean = nextName.trim();
    if (!clean) return;
    audioEngine.playSfx('click');
    setGameState((prev) => ({
      ...prev,
      workers: (prev.workers || []).map((w) => (w.id === workerId ? { ...w, name: clean } : w)),
    }));
    pushToast('Name geändert', `Dein Helfer heißt nun ${clean}.`, 'success');
  };

  const handlePayWorkerArrears = (workerId: string) => {
    setGameState((prev) => {
      const target = (prev.workers || []).find((w) => w.id === workerId);
      if (!target || target.unpaidWage <= 0 || prev.coins < target.unpaidWage) return prev;
      audioEngine.playSfx('coin');
      pushToast(
        `Lohn nachgezahlt: ${target.name}`,
        `-${target.unpaidWage} M · ${target.name} arbeitet wieder!`,
        'success'
      );
      return {
        ...prev,
        coins: prev.coins - target.unpaidWage,
        workers: (prev.workers || []).map((w) =>
          w.id === workerId
            ? { ...w, unpaidWage: 0, onStrike: false, lastActionText: 'Lohn beglichen – zurück an der Arbeit!' }
            : w
        ),
      };
    });
  };

  // Tutorial Handler
  const handleClaimTutorialStep = (stepIndex: number) => {
    const meta = TUTORIAL_STEPS.find((s) => s.stepIndex === stepIndex);
    if (!meta) return;
    setGameState((prev) => {
      if (prev.tutorial.completedSteps.includes(stepIndex)) return prev;
      audioEngine.playSfx('levelup');
      const res = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins + meta.rewardCoins,
          tutorial: {
            ...prev.tutorial,
            completedSteps: [...prev.tutorial.completedSteps, stepIndex],
          },
        },
        meta.rewardXp
      );
      pushToast(`Tutorial abgeschlossen: ${meta.title}`, `+${meta.rewardCoins} Münzen · +${meta.rewardXp} XP`, 'success');
      return res.state;
    });
  };

  // Quest Handlers (Post-Tutorial) & Hof-Kapitel Milestones
  const handleClaimQuest = (questId: string) => {
    setGameState((prev) => {
      const quest = prev.quests.active.find((q) => q.id === questId);
      if (!quest || quest.progress < quest.target) return prev;
      audioEngine.playSfx('levelup');

      const otherActive = prev.quests.active.filter((q) => q.id !== questId);
      const nextRecentKinds = [quest.kind, ...(prev.quests.recentKinds || [])].slice(0, 4);
      const nextRecentItems = (
        quest.targetItemId ? [quest.targetItemId, ...(prev.quests.recentTargetIds || [])] : prev.quests.recentTargetIds || []
      ).slice(0, 5);

      const avoidKinds = Array.from(new Set([...otherActive.map((q) => q.kind), ...nextRecentKinds]));
      const avoidItemIds = Array.from(
        new Set([
          ...otherActive.map((q) => q.targetItemId).filter((id): id is string => Boolean(id)),
          ...nextRecentItems,
        ])
      );

      const inRomance = Boolean(
        prev.romance && (prev.romance.status === 'crush' || prev.romance.status === 'married')
      );
      const replacement = generateSingleQuest(
        prev.level,
        avoidKinds,
        prev.season,
        prev.fishing.level,
        avoidItemIds,
        { inRomance }
      );
      const nextActive = prev.quests.active.map((q) => (q.id === questId ? replacement : q));
      const res = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins + quest.rewardCoins,
          fertilizerCount: prev.fertilizerCount + (quest.rewardFertilizer || 0),
          fishingBaitCharges: (prev.fishingBaitCharges || 0) + (quest.rewardBait || 0),
          quests: {
            ...prev.quests,
            active: nextActive,
            completedTotal: prev.quests.completedTotal + 1,
            recentKinds: nextRecentKinds,
            recentTargetIds: nextRecentItems,
          },
        },
        quest.rewardXp
      );
      const extras = [
        quest.rewardFertilizer ? `+${quest.rewardFertilizer} Dünger` : '',
        quest.rewardBait ? `+${quest.rewardBait} Köder` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      pushToast(
        `Auftrag erfüllt: ${quest.title}`,
        `+${quest.rewardCoins} Münzen · +${quest.rewardXp} XP${extras ? ` · ${extras}` : ''}`,
        'success'
      );
      return res.state;
    });
  };

  const handleRerollQuest = (questId: string) => {
    setGameState((prev) => {
      const target = prev.quests.active.find((q) => q.id === questId);
      const nextRecentKinds = target
        ? [target.kind, ...(prev.quests.recentKinds || [])].slice(0, 4)
        : prev.quests.recentKinds || [];
      const nextRecentItems = (
        target?.targetItemId
          ? [target.targetItemId, ...(prev.quests.recentTargetIds || [])]
          : prev.quests.recentTargetIds || []
      ).slice(0, 5);

      const avoidKinds = Array.from(new Set([...prev.quests.active.map((q) => q.kind), ...nextRecentKinds]));
      const avoidItemIds = Array.from(
        new Set([
          ...prev.quests.active.map((q) => q.targetItemId).filter((id): id is string => Boolean(id)),
          ...nextRecentItems,
        ])
      );

      const inRomance = Boolean(
        prev.romance && (prev.romance.status === 'crush' || prev.romance.status === 'married')
      );
      const replacement = generateSingleQuest(
        prev.level,
        avoidKinds,
        prev.season,
        prev.fishing.level,
        avoidItemIds,
        { inRomance }
      );
      audioEngine.playSfx('click');
      return {
        ...prev,
        quests: {
          ...prev.quests,
          active: prev.quests.active.map((q) => (q.id === questId ? replacement : q)),
          recentKinds: nextRecentKinds,
          recentTargetIds: nextRecentItems,
        },
      };
    });
  };

  const handleClaimMilestone = (milestoneId: string) => {
    const ms = QUEST_MILESTONES.find((m) => m.id === milestoneId);
    if (!ms) return;
    setGameState((prev) => {
      const claimed = prev.quests.claimedMilestones || [];
      if (claimed.includes(ms.id) || prev.level < ms.minLevel) return prev;
      if (getMilestoneProgress(ms.id, prev) < ms.target) return prev;

      audioEngine.playSfx('levelup');
      const nextSeeds = { ...prev.seeds };
      if (ms.rewardItem) {
        nextSeeds[ms.rewardItem.itemId] = (nextSeeds[ms.rewardItem.itemId] || 0) + ms.rewardItem.qty;
      }

      const res = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins + ms.rewardCoins,
          fertilizerCount: prev.fertilizerCount + (ms.rewardFertilizer || 0),
          fishingBaitCharges: (prev.fishingBaitCharges || 0) + (ms.rewardBait || 0),
          seeds: nextSeeds,
          quests: {
            ...prev.quests,
            claimedMilestones: [...claimed, ms.id],
          },
        },
        ms.rewardXp
      );

      const itemName = ms.rewardItem ? CATALOG_BY_ID[ms.rewardItem.itemId]?.name : '';
      const bonus = ms.rewardItem && itemName ? ` · +${ms.rewardItem.qty}× ${itemName}` : '';
      pushToast(
        `${ms.title} abgeschlossen!`,
        `+${ms.rewardCoins.toLocaleString('de-DE')} Münzen · +${ms.rewardXp} XP${bonus}`,
        'success'
      );
      return res.state;
    });
  };

  // Neighbor Handlers
  const handleHelpNeighbor = (neighborId: string) => {
    setGameState((prev) => {
      const npc = prev.neighbors.find((n) => n.id === neighborId);
      if (!npc || npc.helpedToday) return prev;
      audioEngine.playSfx('water');
      const nextNeighbors = prev.neighbors.map((n) =>
        n.id === neighborId ? { ...n, helpedToday: true, friendship: Math.min(100, n.friendship + 8) } : n
      );
      const res = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins + 35,
          neighbors: nextNeighbors,
          tutorial: { ...prev.tutorial, helpedNeighbor: true },
          eventState: { ...prev.eventState, points: prev.eventState.points + 12 },
          stats: { ...prev.stats, totalNeighborsHelped: prev.stats.totalNeighborsHelped + 1 },
        },
        25
      );
      pushToast(`${npc.name} geholfen!`, '+35 Münzen · +25 XP · +8 Freundschaft', 'success');
      return advanceQuestProgress(
        advanceQuestProgress(res.state, 'help_neighbor', 1),
        'event_points',
        12
      );
    });
  };

  const handleGiveGift = (neighborId: string) => {
    setGameState((prev) => {
      const npc = prev.neighbors.find((n) => n.id === neighborId);
      if (!npc || npc.giftedToday || prev.coins < 30) return prev;
      audioEngine.playSfx('coin');
      const nextNeighbors = prev.neighbors.map((n) =>
        n.id === neighborId ? { ...n, giftedToday: true, friendship: Math.min(100, n.friendship + 10) } : n
      );
      pushToast(`Präsent an ${npc.name} überreicht`, '+10 Freundschaftspunkte', 'success');
      return { ...prev, coins: prev.coins - 30, neighbors: nextNeighbors };
    });
  };

  const handleFulfillNeighborRequest = (neighborId: string) => {
    setGameState((prev) => {
      const npc = prev.neighbors.find((n) => n.id === neighborId);
      if (!npc) return prev;
      const completedToday = npc.requestsCompletedToday || 0;
      if (completedToday >= MAX_NEIGHBOR_REQUESTS_PER_DAY) return prev;
      const owned = prev.inventory[npc.requestItemId] || 0;
      if (owned < npc.requestQty) return prev;

      audioEngine.playSfx('levelup');
      const stepMeta = getNeighborRequestStepMeta(completedToday);
      const nextCompleted = completedToday + 1;
      const nextFriendship = Math.min(100, npc.friendship + stepMeta.friendshipGain);

      const nextNeighbors = prev.neighbors.map((n) => {
        if (n.id !== neighborId) return n;
        const updated = {
          ...n,
          friendship: nextFriendship,
          requestsCompletedToday: nextCompleted,
        };
        if (nextCompleted < MAX_NEIGHBOR_REQUESTS_PER_DAY) {
          return {
            ...updated,
            ...buildScaledNeighborRequest(updated, prev.level, prev.season, nextCompleted),
          };
        }
        return updated;
      });

      const res = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins + npc.rewardCoins,
          fertilizerCount: prev.fertilizerCount + stepMeta.bonusFertilizer,
          inventory: { ...prev.inventory, [npc.requestItemId]: owned - npc.requestQty },
          neighbors: nextNeighbors,
          tutorial: { ...prev.tutorial, helpedNeighbor: true },
          eventState: { ...prev.eventState, points: prev.eventState.points + stepMeta.eventPoints },
          stats: { ...prev.stats, totalNeighborsHelped: prev.stats.totalNeighborsHelped + 1 },
        },
        npc.rewardXp
      );
      const bonusNote = stepMeta.bonusFertilizer > 0 ? ` · +${stepMeta.bonusFertilizer} Dünger (Tages-Finale!)` : '';
      pushToast(
        `Bitte ${stepMeta.stepNumber}/${MAX_NEIGHBOR_REQUESTS_PER_DAY} von ${npc.name} erfüllt!`,
        `+${npc.rewardCoins} Münzen · +${npc.rewardXp} XP · +${stepMeta.friendshipGain} Freundschaft${bonusNote}`,
        'success'
      );
      return advanceQuestProgress(
        advanceQuestProgress(res.state, 'help_neighbor', 1),
        'event_points',
        stepMeta.eventPoints
      );
    });
  };

  const handleClaimEventTier = (tierIdx: number) => {
    setGameState((prev) => {
      const ev = SEASONAL_EVENTS[prev.season];
      const tier = ev.tiers[tierIdx];
      if (!tier || prev.eventState.claimedTiers.includes(tierIdx) || prev.eventState.points < tier.points) return prev;

      audioEngine.playSfx('levelup');
      const nextSeeds = { ...prev.seeds };
      if (tier.rewardItem) {
        nextSeeds[tier.rewardItem.itemId] = (nextSeeds[tier.rewardItem.itemId] || 0) + tier.rewardItem.qty;
      }
      const nextTrophies =
        tier.trophyId && !prev.unlockedTrophies.includes(tier.trophyId)
          ? [...prev.unlockedTrophies, tier.trophyId]
          : prev.unlockedTrophies;

      pushToast(`Event-Belohnung Stufe ${tierIdx + 1}!`, `+${tier.rewardCoins} Münzen erhalten.`, 'success');
      let nextState: GameState = {
        ...prev,
        coins: prev.coins + tier.rewardCoins,
        seeds: nextSeeds,
        unlockedTrophies: nextTrophies,
        eventState: {
          ...prev.eventState,
          claimedTiers: [...prev.eventState.claimedTiers, tierIdx],
        },
      };

      if (tierIdx >= 1) {
        const sparkRes = tryTriggerOrganicRomanceSpark(nextState, ev.title, 0.38);
        nextState = sparkRes.state;
        if (sparkRes.sparkedCandidate) {
          pushToast(
            `💘 Herzklopfen: ${sparkRes.sparkedCandidate.name}!`,
            `Bei „${ev.title}“ hat es gefunkt — schau in Nachbarn & Liebe → Herzenssache!`,
            'success'
          );
        }
      }
      return nextState;
    });
  };

  // Craft & Wandering Merchant Handlers
  const handleStartCraft = (recipeId: string) => {
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    const outItem = CATALOG_BY_ID[recipe.outputItemId];
    setGameState((prev) => {
      if (prev.level < recipe.unlockLevel) return prev;
      let placedCount = 0;
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (prev.tiles[y]?.[x]?.entity?.itemId === recipe.stationId) {
            placedCount += 1;
          }
        }
      }
      const jobsForStation = (prev.craftingJobs || []).filter((j) => j.stationId === recipe.stationId).length;
      if (placedCount === 0 || jobsForStation >= placedCount) return prev;

      const nextInventory = { ...prev.inventory };
      for (const ing of recipe.ingredients) {
        if ((nextInventory[ing.itemId] || 0) < ing.qty) return prev;
        nextInventory[ing.itemId] = (nextInventory[ing.itemId] || 0) - ing.qty;
      }

      audioEngine.playSfx('click');
      pushToast(
        `Veredelung gestartet: ${outItem?.name || recipe.outputItemId}`,
        `Fertig in ${Math.round(recipe.durationMs / 1000)} Sek.`,
        'info'
      );
      return {
        ...prev,
        inventory: nextInventory,
        craftingJobs: [
          ...(prev.craftingJobs || []),
          {
            id: `craft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            recipeId: recipe.id,
            stationId: recipe.stationId,
            outputItemId: recipe.outputItemId,
            totalMs: recipe.durationMs,
            remainingMs: recipe.durationMs,
          },
        ],
      };
    });
  };

  const handleBuyStation = (stationId: CraftStationId) => {
    const item = CATALOG_BY_ID[stationId];
    const stMeta = CRAFT_STATIONS.find((s) => s.id === stationId);
    if (!item || !stMeta) return;
    setGameState((prev) => {
      if (prev.level < stMeta.unlockLevel || prev.coins < item.seedCost) return prev;
      audioEngine.playSfx('coin');
      pushToast(
        `${item.name} gekauft!`,
        'Klicke auf „Aus Rucksack auf Hof setzen“, um die Station zu platzieren.',
        'success'
      );
      return {
        ...prev,
        coins: prev.coins - item.seedCost,
        seeds: { ...prev.seeds, [stationId]: (prev.seeds[stationId] || 0) + 1 },
      };
    });
  };

  const handleEquipStation = (stationId: CraftStationId) => {
    const item = CATALOG_BY_ID[stationId];
    audioEngine.playSfx('click');
    setGameState((prev) => ({
      ...prev,
      selectedSeedId: stationId,
      selectedTool: 'build',
    }));
    if (item) {
      pushToast(`${item.name} ausgewählt`, 'Werkzeug „Bau“ aktiv: Klicke auf eine freie Wiese oder einen Hofweg.', 'info');
    }
  };

  const handleBuyMerchantOffer = (offerId: string) => {
    setGameState((prev) => {
      const m = prev.merchant;
      if (!m?.active) return prev;
      const offer = m.offers.find((o) => o.id === offerId);
      if (!offer || offer.stock <= 0 || prev.coins < offer.costCoins) return prev;

      audioEngine.playSfx('coin');
      const nextOffers = m.offers.map((o) => (o.id === offerId ? { ...o, stock: o.stock - 1 } : o));
      let nextBait = prev.fishingBaitCharges || 0;
      let nextElixir = prev.growthElixirCount || 0;
      let nextFert = prev.fertilizerCount;
      let nextSeeds = prev.seeds;

      if (offer.kind === 'bait') {
        nextBait += offer.qty;
        pushToast(`${offer.qty}× Profi-Angelköder gekauft!`, 'Wird automatisch beim nächsten Angeln eingesetzt.', 'success');
      } else if (offer.kind === 'fertilizer') {
        nextFert += offer.qty;
        pushToast(`${offer.qty}× Hof-Dünger gekauft!`, 'Mit Taste [4] auf Ackerfeldern einsetzbar.', 'success');
      } else if (offer.kind === 'item' && offer.itemId) {
        nextSeeds = { ...prev.seeds, [offer.itemId]: (prev.seeds[offer.itemId] || 0) + offer.qty };
        const meta = CATALOG_BY_ID[offer.itemId];
        pushToast(`${offer.qty}× ${meta?.name || offer.title} erhalten!`, 'Bereit zum Platzieren im Rucksack [I].', 'success');
      } else if (offer.kind === 'elixir') {
        nextElixir += offer.qty;
        pushToast(
          `${offer.qty}× Wachstums-Elixier erhalten!`,
          'Jetzt im Rucksack [I] gelagert — dort jederzeit mit Klick einsetzbar!',
          'success'
        );
      }

      return advanceQuestProgress(
        {
          ...prev,
          coins: prev.coins - offer.costCoins,
          fishingBaitCharges: nextBait,
          growthElixirCount: nextElixir,
          fertilizerCount: nextFert,
          seeds: nextSeeds,
          merchant: { ...m, offers: nextOffers },
          stats: {
            ...prev.stats,
            totalMerchantDeals: (prev.stats.totalMerchantDeals || 0) + 1,
          },
        },
        'merchant_interact',
        1
      );
    });
  };

  const handleUseGrowthElixir = () => {
    setGameState((prev) => {
      if ((prev.growthElixirCount || 0) <= 0) return prev;
      let boostedCount = 0;
      const nextTiles = prev.tiles.map((row) =>
        row.map((tile) => {
          const ent = tile.entity;
          if (!ent || ent.ready || ent.damaged || ent.withered) return tile;
          if (
            ent.category !== 'crop' &&
            ent.category !== 'mushroom' &&
            ent.category !== 'tree' &&
            ent.category !== 'animal'
          ) {
            return tile;
          }
          const item = CATALOG_BY_ID[ent.itemId];
          if (!item || item.growthMs <= 0) return tile;
          boostedCount += 1;
          const nextProg = Math.min(item.growthMs, ent.progressMs + Math.round(item.growthMs * 0.45));
          return {
            ...tile,
            entity: {
              ...ent,
              progressMs: nextProg,
              ready: nextProg >= item.growthMs,
            },
          };
        })
      );

      if (boostedCount === 0) {
        pushToast(
          'Keine wachsenden Kulturen vorhanden',
          'Das Wachstums-Elixier wurde nicht verbraucht. Säe oder setze zuerst etwas an!',
          'info'
        );
        return prev;
      }

      audioEngine.playSfx('levelup');
      spawnFloat(playerPosRef.current.x, playerPosRef.current.y, '✨ Elixier (+45 %)', '#c084fc', true);
      pushToast(
        'Wachstums-Elixier versprüht!',
        `${boostedCount} Kulturen & Tiere sind um +45 % gewachsen!`,
        'success'
      );

      return {
        ...prev,
        growthElixirCount: prev.growthElixirCount - 1,
        tiles: nextTiles,
      };
    });
  };

  const handleEatFeastDish = (itemId: string) => {
    const item = CATALOG_BY_ID[itemId];
    if (!item || !item.feastBuffMinutes) return;
    setGameState((prev) => {
      const owned = prev.inventory[itemId] || 0;
      if (owned <= 0) return prev;
      const nextInventory = { ...prev.inventory, [itemId]: owned - 1 };
      if (nextInventory[itemId] <= 0) delete nextInventory[itemId];
      const buffMs = item.feastBuffMinutes! * 60 * 1000;
      audioEngine.playSfx('levelup');
      spawnFloat(playerPosRef.current.x, playerPosRef.current.y, `🍖 ${item.produceName} (+Buff!)`, '#fbbf24', true);
      pushToast(
        `Festmahl genossen: ${item.produceName}!`,
        `${item.feastBuffMinutes} Min. Buff aktiv: +25 % Lauftempo & +20 % Wachstums-/Handwerkstempo.`,
        'success'
      );
      return {
        ...prev,
        inventory: nextInventory,
        feastBuff: {
          remainingMs: buffMs,
          dishId: item.id,
          dishName: item.produceName,
        },
      };
    });
  };

  const handleCompleteMerchantTrade = (tradeId: string) => {
    setGameState((prev) => {
      const m = prev.merchant;
      if (!m?.active) return prev;
      const trade = m.trades.find((t) => t.id === tradeId);
      if (!trade || trade.completed) return prev;
      const owned = prev.inventory[trade.giveItemId] || 0;
      if (owned < trade.giveQty) return prev;

      audioEngine.playSfx('levelup');
      const nextInventory = { ...prev.inventory, [trade.giveItemId]: owned - trade.giveQty };
      const nextTrades = m.trades.map((t) => (t.id === tradeId ? { ...t, completed: true } : t));

      let nextCoins = prev.coins;
      let nextBait = prev.fishingBaitCharges || 0;
      let nextFert = prev.fertilizerCount;
      let nextSeeds = prev.seeds;

      if (trade.rewardKind === 'bait') {
        nextBait += trade.rewardQty;
      } else if (trade.rewardKind === 'fertilizer') {
        nextFert += trade.rewardQty;
      } else if (trade.rewardKind === 'coins') {
        nextCoins += trade.rewardCoins || 0;
      } else if (trade.rewardKind === 'item' && trade.rewardItemId) {
        nextSeeds = {
          ...prev.seeds,
          [trade.rewardItemId]: (prev.seeds[trade.rewardItemId] || 0) + trade.rewardQty,
        };
      }

      pushToast('Tauschhandel abgeschlossen!', `Bruno bedankt sich für die frische Hofware.`, 'success');

      return advanceQuestProgress(
        {
          ...prev,
          coins: nextCoins,
          fishingBaitCharges: nextBait,
          fertilizerCount: nextFert,
          inventory: nextInventory,
          seeds: nextSeeds,
          merchant: { ...m, trades: nextTrades },
          stats: {
            ...prev.stats,
            totalMerchantDeals: (prev.stats.totalMerchantDeals || 0) + 1,
          },
        },
        'merchant_interact',
        1
      );
    });
  };

  const handleSubmitVillageFair = (showcaseItemId?: string) => {
    setGameState((prev) => {
      const dayInSeason = getDayInSeason(prev.day);
      const fairKey = getSeasonFairKey(prev.day, prev.season);
      if (dayInSeason !== DAYS_PER_SEASON) return prev;
      if ((prev.villageFair?.judgedSeasonKeys || []).includes(fairKey)) return prev;

      const result = evaluateVillageFair(prev, showcaseItemId);
      const nextInventory = { ...prev.inventory };
      if (result.submittedItemId && (nextInventory[result.submittedItemId] || 0) > 0) {
        nextInventory[result.submittedItemId] -= 1;
      }
      const nextSeeds = { ...prev.seeds };
      if (result.unlockedDecorId) {
        nextSeeds[result.unlockedDecorId] = (nextSeeds[result.unlockedDecorId] || 0) + 1;
      }

      const prevMedals = prev.villageFair?.medals || { bronze: 0, silver: 0, gold: 0 };
      const nextFair = {
        judgedSeasonKeys: [...(prev.villageFair?.judgedSeasonKeys || []), fairKey],
        medals: {
          ...prevMedals,
          [result.medal]: (prevMedals[result.medal] || 0) + 1,
        },
        lastResult: result,
      };

      const res = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins + result.rewardCoins,
          inventory: nextInventory,
          seeds: nextSeeds,
          villageFair: nextFair,
          eventState: {
            ...prev.eventState,
            points: prev.eventState.points + 35,
          },
        },
        result.rewardXp
      );

      audioEngine.playSfx('levelup');
      const medalLabel = result.medal === 'gold' ? 'Gold' : result.medal === 'silver' ? 'Silber' : 'Bronze';
      const decorName = result.unlockedDecorId ? CATALOG_BY_ID[result.unlockedDecorId]?.name : '';
      pushToast(
        `Dorffest-Bewertung: ${medalLabel} (${result.score} Pkt)!`,
        `+${result.rewardCoins.toLocaleString('de-DE')} M · +${result.rewardXp} XP${decorName ? ` · +1× ${decorName}` : ''}`,
        'success'
      );
      const afterQuest = advanceQuestProgress(
        advanceQuestProgress(res.state, 'enter_fair', 1),
        'event_points',
        35
      );
      const sparkRes = tryTriggerOrganicRomanceSpark(
        afterQuest,
        `${SEASON_LABELS[prev.season]}-Dorffest`,
        0.45
      );
      if (sparkRes.sparkedCandidate) {
        pushToast(
          `💘 Herzklopfen auf dem Dorffest: ${sparkRes.sparkedCandidate.name}!`,
          'Jemand aus dem Dorf möchte dich näher kennenlernen — öffne Nachbarn & Liebe!',
          'success'
        );
      }
      return sparkRes.state;
    });
  };

  // Romance & Marriage Handlers (Vorschlag 1)
  const handleAcceptRomanceSpark = () => {
    setGameState((prev) => {
      const res = acceptRomanceSpark(prev);
      if (res.candidate) {
        audioEngine.playSfx('levelup');
        pushToast(
          `Verabredet mit ${res.candidate.name}!`,
          'Schenke Lieblingsprodukte und plant Dates, bis die Zuneigung 100 % erreicht.',
          'success'
        );
      }
      return res.state;
    });
  };

  const handleDeclineRomanceSpark = () => {
    setGameState((prev) => declineRomanceSpark(prev));
    audioEngine.playSfx('click');
    pushToast('Höflich abgelehnt', 'Vielleicht funkt es auf einem späteren Fest mit jemand anderem.', 'info');
  };

  const handleGiveRomanceGift = (itemId: string) => {
    setGameState((prev) => {
      const res = giveRomanceFavoriteGift(prev, itemId);
      if (!res.ok) {
        pushToast('Nicht möglich', res.error || 'Geschenk fehlgeschlagen.', 'warning');
        return prev;
      }
      audioEngine.playSfx('harvest');
      const itemMeta = CATALOG_BY_ID[itemId];
      pushToast(
        `Lieblingsgeschenk überreicht: ${itemMeta?.produceName || itemId}`,
        `+${res.affectionGain || 18} % Zuneigung & Bonus-XP!`,
        'success'
      );
      return advanceQuestProgress(res.state, 'romance_act', 1);
    });
  };

  const handleGoOnRomanceDate = (dateId: RomanceDateId) => {
    setGameState((prev) => {
      const res = goOnRomanceDate(prev, dateId);
      if (!res.ok) {
        pushToast('Date nicht möglich', res.error || 'Fehlgeschlagen.', 'warning');
        return prev;
      }
      const dateSpec = ROMANCE_DATES.find((d) => d.id === dateId);
      audioEngine.playSfx('levelup');
      pushToast(
        `Wunderschönes Date: ${dateSpec?.title || ''}`,
        `+${res.affectionGain || 14} % Zuneigung · +${res.xpReward || 160} XP`,
        'success'
      );
      return advanceQuestProgress(res.state, 'romance_act', 1);
    });
  };

  const handleMarryPartner = () => {
    setGameState((prev) => {
      const res = marryRomancePartner(prev, false);
      if (!res.ok) {
        pushToast('Antrag noch nicht bereit', res.error || 'Zuneigung fehlt.', 'warning');
        return prev;
      }
      audioEngine.playSfx('levelup');
      pushToast(
        `💍 Traumhochzeit mit ${res.candidate?.name}!`,
        'Dein Partner zieht ins Bauernhaus ein und erscheint morgen im Sonnentaler Tagesblatt!',
        'success'
      );
      return res.state;
    });
  };

  const handleBreakupRomance = () => {
    setGameState((prev) => breakupRomance(prev));
    audioEngine.playSfx('click');
    pushToast('Freundschaftlich getrennt', 'Ihr bleibt gute Nachbarn im Sonnental.', 'info');
  };

  // Hofladen (Farm Shop) Handlers
  const handleStockShopItem = (itemId: string, qty: number) => {
    const item = CATALOG_BY_ID[itemId];
    if (!item || item.category !== 'artisan') return;
    setGameState((prev) => {
      const owned = prev.inventory[itemId] || 0;
      const moveQty = Math.min(owned, qty);
      if (moveQty <= 0) return prev;
      audioEngine.playSfx('click');
      return {
        ...prev,
        inventory: { ...prev.inventory, [itemId]: owned - moveQty },
        farmShop: {
          ...prev.farmShop,
          stock: {
            ...prev.farmShop.stock,
            [itemId]: (prev.farmShop.stock[itemId] || 0) + moveQty,
          },
        },
      };
    });
    pushToast(`${item.produceName} ausgelegt`, 'Steht jetzt für deine Hofladen-Besucher bereit!', 'success');
  };

  const handleUnstockShopItem = (itemId: string, qty: number) => {
    const item = CATALOG_BY_ID[itemId];
    setGameState((prev) => {
      const onShelf = prev.farmShop.stock[itemId] || 0;
      const moveQty = Math.min(onShelf, qty);
      if (moveQty <= 0) return prev;
      audioEngine.playSfx('click');
      return {
        ...prev,
        inventory: { ...prev.inventory, [itemId]: (prev.inventory[itemId] || 0) + moveQty },
        farmShop: {
          ...prev.farmShop,
          stock: {
            ...prev.farmShop.stock,
            [itemId]: onShelf - moveQty,
          },
        },
      };
    });
    if (item) {
      pushToast(`${item.produceName} zurückgelegt`, 'Wieder im Rucksack verstaut.', 'info');
    }
  };

  const handleStockAllShopArtisan = () => {
    setGameState((prev) => {
      const nextInventory = { ...prev.inventory };
      const nextStock = { ...(prev.farmShop.stock || {}) };
      let movedTotal = 0;
      CATALOG.filter((i) => i.category === 'artisan').forEach((item) => {
        const owned = nextInventory[item.id] || 0;
        if (owned > 0) {
          nextInventory[item.id] = 0;
          nextStock[item.id] = (nextStock[item.id] || 0) + owned;
          movedTotal += owned;
        }
      });
      if (movedTotal === 0) return prev;
      audioEngine.playSfx('harvest');
      pushToast(`${movedTotal}× Veredelungen ausgelegt`, 'Alle Spezialitäten stehen nun im Hofladen!', 'success');
      return {
        ...prev,
        inventory: nextInventory,
        farmShop: {
          ...prev.farmShop,
          stock: nextStock,
        },
      };
    });
  };

  const handleToggleAutoRestock = () => {
    setGameState((prev) => {
      const nextVal = !prev.farmShop.autoRestock;
      audioEngine.playSfx('click');
      const activeWorkers = (prev.workers || []).filter((w) => !w.onStrike).length;
      pushToast(
        nextVal ? 'Helfer-Nachfüllung aktiviert' : 'Helfer-Nachfüllung deaktiviert',
        nextVal
          ? activeWorkers > 0
            ? 'Deine Hofhelfer halten den Hofladen automatisch bis 6 Stück pro Fach gefüllt.'
            : 'Aktiviert – stelle noch mindestens 1 Hofhelfer ein, damit automatisch nachgelegt wird.'
          : 'Du bestückst den Hofladen wieder manuell.',
        'info'
      );
      return {
        ...prev,
        farmShop: {
          ...prev.farmShop,
          autoRestock: nextVal,
          autoRestockTarget: prev.farmShop.autoRestockTarget ?? 6,
        },
      };
    });
  };

  const handleFulfillSpecialOrder = () => {
    setGameState((prev) => {
      const order = prev.farmShop.specialOrder;
      if (!order || order.completed) return prev;
      const inInv = prev.inventory[order.itemId] || 0;
      const inShelf = prev.farmShop.stock[order.itemId] || 0;
      if (inInv + inShelf < order.qty) return prev;

      const takeInv = Math.min(inInv, order.qty);
      const takeShelf = order.qty - takeInv;
      const nextInv = { ...prev.inventory, [order.itemId]: inInv - takeInv };
      const nextStock = { ...prev.farmShop.stock, [order.itemId]: inShelf - takeShelf };

      const xpRes = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins + order.rewardCoins,
          inventory: nextInv,
        },
        order.rewardXp
      );
      const updatedWithQuest = advanceQuestProgress(
        advanceQuestProgress(
          {
            ...xpRes.state,
            farmShop: {
              ...prev.farmShop,
              stock: nextStock,
              todayRevenue: prev.farmShop.todayRevenue + order.rewardCoins,
              totalRevenue: prev.farmShop.totalRevenue + order.rewardCoins,
              totalSoldCount: prev.farmShop.totalSoldCount + order.qty,
              reputation: Math.min(100, (prev.farmShop.reputation ?? 10) + 5),
              specialOrder: { ...order, completed: true },
            },
            stats: {
              ...prev.stats,
              totalSoldCoins: prev.stats.totalSoldCoins + order.rewardCoins,
            },
          },
          'sell_coins',
          order.rewardCoins
        ),
        'shop_sell',
        order.qty
      );

      audioEngine.playSfx('coin');
      const itemMeta = CATALOG_BY_ID[order.itemId];
      pushToast(
        `Vorbestellung an ${order.customerName} übergeben!`,
        `${order.qty}× ${itemMeta?.produceName || order.itemId} · +${order.rewardCoins} M · +${order.rewardXp} XP · +5 Ruf`,
        'success'
      );
      return updatedWithQuest;
    });
  };

  const handleExportSave = (customFileName?: string) => {
    const now = Date.now();
    const updatedState = { ...gameState, savedAt: now };
    setGameState(updatedState);
    saveGameState(updatedState);

    const rawName = (customFileName || '').trim() || `sonnental-hof-tag-${gameState.day}`;
    const safeBase = rawName.replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, '-').replace(/\.json$/i, '');
    const finalName = `${safeBase || 'sonnental-hof'}.json`;

    const blob = new Blob([JSON.stringify(updatedState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Savegame gespeichert', `Datei „${finalName}“ heruntergeladen.`, 'success');
  };

  const handleImportSave = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<GameState>;
      const migrated = migrateGameState(parsed);
      if (!migrated || typeof migrated.coins !== 'number') {
        pushToast('Ungültige Datei', 'Konnte keinen gültigen Hof-Spielstand lesen.', 'warning');
        return;
      }
      setGameState(migrated);
      saveGameState(migrated);
      setSavedExists(true);
      setActiveModal('none');
      setPhase('PLAYING');
      pushToast('Spielstand geladen!', `Willkommen zurück auf ${migrated.avatar.farmName}.`, 'success');
    } catch {
      pushToast('Fehler beim Laden', 'Die gewählte JSON-Datei ist beschädigt.', 'warning');
    }
  };

  const handleResetGame = () => {
    clearSavedGame();
    const fresh = createInitialGameState(selectedTitlePet);
    setGameState(fresh);
    saveGameState(fresh);
    setSavedExists(true);
    setActiveModal('none');
    pushToast('Neuer Hof erstellt', 'Viel Freude beim Aufbau deines neuen Bauernhofs!', 'info');
  };

  const handleMailboxClick = () => {
    startMusicOnInteraction(settings);
    const p = playerPosRef.current;
    const dist = Math.hypot(p.x - 4, p.y - 3);
    if (dist > 2.7) {
      audioEngine.playSfx('click');
      pushToast(
        'Laufe zum Briefkasten!',
        'Gehe mit WASD / Pfeiltasten vor dein Bauernhaus, um die Post zu entnehmen.',
        'info'
      );
      spawnFloat(4, 3, 'Näher hingehen!', '#fca5a5', true);
      return;
    }
    audioEngine.playSfx('click');
    setActiveModal('mailbox');
  };

  const handleCollectMail = () => {
    const pending = gameStateRef.current.mailbox?.pendingMail;
    if (!pending) return;

    setGameState((prev) => {
      const pm = prev.mailbox?.pendingMail;
      if (!pm) return prev;
      let nextCoins = prev.coins;
      let nextFertilizer = prev.fertilizerCount;
      let nextBait = prev.fishingBaitCharges || 0;
      let nextElixir = prev.growthElixirCount || 0;
      const nextSeeds = { ...prev.seeds };
      let nextAlmanac = prev.almanac;

      pm.rewards.forEach((r) => {
        if (r.kind === 'seed' && r.itemId) {
          nextSeeds[r.itemId] = (nextSeeds[r.itemId] || 0) + r.qty;
          nextAlmanac = recordAlmanacDiscovery(nextAlmanac, r.itemId).almanac;
        } else if (r.kind === 'fertilizer') {
          nextFertilizer += r.qty;
        } else if (r.kind === 'bait') {
          nextBait += r.qty;
        } else if (r.kind === 'elixir') {
          nextElixir += r.qty;
        } else if (r.kind === 'coins') {
          nextCoins += r.qty;
        }
      });

      return {
        ...prev,
        coins: nextCoins,
        fertilizerCount: nextFertilizer,
        fishingBaitCharges: nextBait,
        growthElixirCount: nextElixir,
        seeds: nextSeeds,
        almanac: nextAlmanac,
        mailbox: {
          ...prev.mailbox,
          pendingMail: null,
        },
      };
    });

    audioEngine.playSfx('harvest');
    spawnFloat(4.0, 2.8, 'Post entnommen!', '#4ade80', true);
    pushToast(
      'Tagespost entnommen!',
      pending.rewards.map((r) => r.label).join(' · '),
      'success'
    );
  };

  const handlePurchaseVillageBusiness = (businessId: VillageBusinessId) => {
    const res = purchaseVillageBusiness(gameStateRef.current, businessId);
    if (!res.ok) {
      audioEngine.playSfx('alert');
      pushToast('Kauf nicht möglich', res.error || 'Voraussetzungen nicht erfüllt.', 'warning');
      return;
    }
    setGameState((prev) => {
      const nextRes = purchaseVillageBusiness(prev, businessId);
      return nextRes.ok ? nextRes.state : prev;
    });
    audioEngine.playSfx('levelup');
    if (res.spec) {
      spawnFloat(
        res.spec.doorX,
        res.spec.y + 0.4,
        `${res.spec.shortLabel} gekauft!`,
        '#4ade80',
        true
      );
      pushToast(
        `${res.spec.name} erworben!`,
        `Gewinne fließen ab sofort stündlich automatisch in deine Hofkasse (${res.spec.dailyProfitRangeLabel}).`,
        'success'
      );
    }
  };

  const handlePurchaseThemePark = () => {
    const res = purchaseThemePark(gameStateRef.current);
    if (!res.ok) {
      audioEngine.playSfx('alert');
      pushToast('Freizeitpark-Kauf nicht möglich', res.error || 'Voraussetzungen nicht erfüllt.', 'warning');
      return;
    }
    setGameState((prev) => {
      const nextRes = purchaseThemePark(prev);
      return nextRes.ok ? nextRes.state : prev;
    });
    audioEngine.playSfx('levelup');
    spawnFloat(
      THEME_PARK_BOUNDS.northGateX,
      THEME_PARK_BOUNDS.northGateY + 1.2,
      'Abenteuerpark eröffnet!',
      '#4ade80',
      true
    );
    pushToast(
      'Abenteuerpark Sonnental eröffnet!',
      `Kaufpreis ${THEME_PARK_BASE_COST.toLocaleString('de-DE')} M · Stündliche Parkgewinne & +2 Hofladen-Besucher aktiv!`,
      'success'
    );
  };

  const handleBuildThemeParkAttraction = (attractionId: ThemeParkAttractionId) => {
    const res = buildThemeParkAttraction(gameStateRef.current, attractionId);
    if (!res.ok) {
      audioEngine.playSfx('alert');
      pushToast('Ausbau nicht möglich', res.error || 'Voraussetzungen nicht erfüllt.', 'warning');
      return;
    }
    setGameState((prev) => {
      const nextRes = buildThemeParkAttraction(prev, attractionId);
      return nextRes.ok ? nextRes.state : prev;
    });
    audioEngine.playSfx('levelup');
    const spec = THEME_PARK_ATTRACTION_BY_ID[attractionId];
    if (spec) {
      spawnFloat(
        spec.plotX + spec.plotW / 2,
        spec.plotY + 0.8,
        `${spec.name} fertig!`,
        '#fde047',
        true
      );
      pushToast(
        `${spec.name} errichtet!`,
        `+${spec.hourlyProfitBonus.toLocaleString('de-DE')} M/Std. & +${spec.shopVisitorBonus} Hofladen-Besucher!`,
        'success'
      );
    }
  };

  const handleRepairVillageBusiness = (businessId: VillageBusinessId) => {
    const res = repairVillageBusiness(gameStateRef.current, businessId);
    if (!res.ok) {
      audioEngine.playSfx('alert');
      pushToast('Reparatur nicht möglich', res.error || 'Voraussetzungen nicht erfüllt.', 'warning');
      return;
    }
    setGameState((prev) => {
      const nextRes = repairVillageBusiness(prev, businessId);
      return nextRes.ok ? nextRes.state : prev;
    });
    audioEngine.playSfx('harvest');
    if (res.spec) {
      spawnFloat(res.spec.doorX, res.spec.y + 0.4, `${res.spec.shortLabel} repariert!`, '#4ade80', true);
      pushToast(
        `${res.spec.name} wieder in Betrieb!`,
        `Reparatur für ${res.cost?.toLocaleString('de-DE')} M abgeschlossen — Erträge laufen wieder.`,
        'success'
      );
    }
  };

  const handleRepairThemePark = () => {
    const res = repairThemePark(gameStateRef.current);
    if (!res.ok) {
      audioEngine.playSfx('alert');
      pushToast('Reparatur nicht möglich', res.error || 'Voraussetzungen nicht erfüllt.', 'warning');
      return;
    }
    setGameState((prev) => {
      const nextRes = repairThemePark(prev);
      return nextRes.ok ? nextRes.state : prev;
    });
    audioEngine.playSfx('harvest');
    spawnFloat(
      THEME_PARK_BOUNDS.northGateX,
      THEME_PARK_BOUNDS.northGateY + 1.2,
      'Park repariert!',
      '#4ade80',
      true
    );
    pushToast(
      'Abenteuerpark wieder geöffnet!',
      `Störung für ${res.cost?.toLocaleString('de-DE')} M behoben — Fahrgeschäfte & Einnahmen laufen wieder.`,
      'success'
    );
  };

  const handleDeliverVillageOrder = (orderId: string) => {
    const snap = gameStateRef.current;
    const snapBoard =
      snap.villageBoard || createInitialVillageBoardState(snap.day, snap.level, snap.season);
    const targetOrder = snapBoard.orders.find((o) => o.id === orderId);
    if (!targetOrder || targetOrder.completed) return;
    if ((snap.inventory[targetOrder.itemId] || 0) < targetOrder.qty) {
      pushToast('Ware fehlt', 'Du hast noch nicht genug im Hof-Lager.', 'info');
      return;
    }

    const dailyBonusEstimate = 150 + snap.level * 12;
    const completedAfter = snapBoard.orders.filter((o) => o.completed || o.id === orderId).length;
    const earnsDailyBonus =
      completedAfter === snapBoard.orders.length && snapBoard.dailyBonusClaimedDay !== snap.day;

    setGameState((prev) => {
      const board =
        prev.villageBoard || createInitialVillageBoardState(prev.day, prev.level, prev.season);
      const order = board.orders.find((o) => o.id === orderId);
      if (!order || order.completed) return prev;
      const owned = prev.inventory[order.itemId] || 0;
      if (owned < order.qty) return prev;

      const nextInv = { ...prev.inventory, [order.itemId]: owned - order.qty };
      if (nextInv[order.itemId] <= 0) delete nextInv[order.itemId];

      const nextOrders = board.orders.map((o) =>
        o.id === orderId ? { ...o, completed: true } : o
      );
      const allCompletedNow = nextOrders.every((o) => o.completed) && board.dailyBonusClaimedDay !== prev.day;
      const bonusCoins = allCompletedNow ? 150 + prev.level * 12 : 0;
      const totalCoinsGain = order.rewardCoins + bonusCoins;

      const nextSeeds = { ...prev.seeds };
      if (order.bonusItemId && order.bonusQty) {
        nextSeeds[order.bonusItemId] = (nextSeeds[order.bonusItemId] || 0) + order.bonusQty;
      }

      const nextNeighbors = order.neighborId
        ? prev.neighbors.map((n) =>
            n.id === order.neighborId
              ? { ...n, friendship: Math.min(100, n.friendship + 12) }
              : n
          )
        : prev.neighbors;

      const nextRep = Math.min(100, (prev.farmShop?.reputation ?? 10) + order.rewardReputation);

      const xpRes = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins + totalCoinsGain,
          inventory: nextInv,
          seeds: nextSeeds,
          neighbors: nextNeighbors,
          farmShop: {
            ...prev.farmShop,
            reputation: nextRep,
          },
          villageBoard: {
            ...board,
            orders: nextOrders,
            completedTotal: board.completedTotal + 1,
            dailyBonusClaimedDay: allCompletedNow ? prev.day : board.dailyBonusClaimedDay,
          },
          stats: {
            ...prev.stats,
            totalSoldCoins: prev.stats.totalSoldCoins + totalCoinsGain,
          },
        },
        order.rewardXp
      );
      return advanceQuestProgress(
        advanceQuestProgress(xpRes.state, 'sell_coins', totalCoinsGain),
        'village_board',
        1
      );
    });

    audioEngine.playSfx('coin');
    spawnFloat(12, -8, `+${targetOrder.rewardCoins} M`, '#fde047', true);
    const bonusItemName = targetOrder.bonusItemId
      ? CATALOG_BY_ID[targetOrder.bonusItemId]?.name
      : undefined;
    pushToast(
      `Dorf-Lieferung an ${targetOrder.residentName}!`,
      earnsDailyBonus
        ? `+${targetOrder.rewardCoins} M · Tages-Bonus +${dailyBonusEstimate} M · +${targetOrder.rewardReputation} Hofladen-Ruf`
        : `+${targetOrder.rewardCoins} M · +${targetOrder.rewardXp} XP · +${targetOrder.rewardReputation} Ruf${
            bonusItemName ? ` · +${targetOrder.bonusQty}× ${bonusItemName}` : ''
          }`,
      'success'
    );
  };

  const handleMineHitCell = (cellIdx: number) => {
    const snap = gameStateRef.current;
    const snapMine = snap.mine || createInitialMineState(snap.day, snap.level);
    const snapCell = snapMine.board[cellIdx];
    if (!snapCell || snapCell.kind === 'empty') return;

    if (snapCell.kind === 'ladder') {
      handleMineChangeFloor(snapMine.currentFloor + 1);
      return;
    }

    if (snapMine.stamina <= 0) {
      audioEngine.playSfx('click');
      pushToast(
        'Minen-Ausdauer erschöpft!',
        'Iss Proviant aus dem Hof-Vorrat oder warte bis zum neuen Tag (00:00 Uhr).',
        'info'
      );
      return;
    }

    const willBreak = snapCell.hp <= snapMine.pickaxeTier;
    const floor = snapMine.currentFloor;
    const yieldRoll = Math.random();
    const relicRoll = Math.random();

    audioEngine.playSfx('mine');

    if (willBreak) {
      let oreId: string | null = null;
      let qty = 1;
      if (snapCell.kind === 'copper_vein') {
        oreId = 'copper_ore';
        qty = 1 + (snapMine.pickaxeTier >= 2 && yieldRoll < 0.45 ? 1 : 0);
      } else if (snapCell.kind === 'iron_vein') {
        oreId = 'iron_ore';
        qty = 1 + (snapMine.pickaxeTier >= 3 && yieldRoll < 0.45 ? 1 : 0);
      } else if (snapCell.kind === 'silver_vein') {
        oreId = 'silver_ore';
        qty = 1 + (yieldRoll < 0.35 ? 1 : 0);
      } else if (snapCell.kind === 'amethyst_vein') {
        oreId = 'amethyst_crystal';
        qty = 1 + (yieldRoll < 0.25 ? 1 : 0);
      } else if (snapCell.kind === 'gold_vein') {
        oreId = 'gold_ore';
        qty = 1 + (yieldRoll < 0.3 ? 1 : 0);
      } else if (snapCell.kind === 'moonstone_vein') {
        oreId = 'moonstone';
        qty = 1;
      } else if (snapCell.kind === 'crystal_cache') {
        oreId = floor >= 8 ? 'moonstone' : floor >= 5 ? 'gold_ore' : floor >= 3 ? 'amethyst_crystal' : 'silver_ore';
        qty = 2;
      } else if (snapCell.kind === 'rock' && yieldRoll < 0.28) {
        oreId = floor >= 4 ? 'iron_ore' : 'copper_ore';
        qty = 1;
      }

      const eligibleRelics = MINE_RELICS.filter((r) => floor >= r.minFloor);
      const relicChance = snapCell.kind === 'crystal_cache' ? 0.32 : snapCell.kind === 'rock' ? 0.03 : 0.09;
      const foundRelic =
        eligibleRelics.length > 0 && relicRoll < relicChance * (snapMine.pickaxeTier >= 4 ? 2 : 1)
          ? eligibleRelics[Math.floor(Math.random() * eligibleRelics.length)]
          : null;

      if (snapCell.hasLadder) {
        pushToast('Leiter freigelegt!', `Der Abstieg zu Ebene ${floor + 1} liegt offen.`, 'success');
      } else if (foundRelic) {
        audioEngine.playSfx('levelup');
        pushToast(`Seltenes Relikt: ${foundRelic.name}!`, `Wert: ${foundRelic.sellPrice} Münzen in der Schatztruhe.`, 'success');
      } else if (oreId) {
        const resMeta = MINE_RESOURCE_BY_ID[oreId];
        spawnFloat(1.8, 11.4, `+${qty} ${resMeta?.name || oreId}`, resMeta?.color || '#fde047', true);
      }

      setGameState((prev) => {
        const mine = prev.mine || createInitialMineState(prev.day, prev.level);
        const cell = mine.board[cellIdx];
        if (!cell || cell.kind === 'empty' || cell.kind === 'ladder' || mine.stamina <= 0) return prev;

        const nextBoard = mine.board.map((c, idx) =>
          idx === cellIdx
            ? {
                ...c,
                hp: 0,
                kind: (c.hasLadder ? 'ladder' : 'empty') as 'ladder' | 'empty',
              }
            : c
        );

        const nextOres = { ...mine.ores };
        if (oreId) {
          nextOres[oreId] = (nextOres[oreId] || 0) + qty;
        }
        const nextRelics = { ...mine.relics };
        const nextDiscovered = [...mine.discoveredRelics];
        if (foundRelic) {
          nextRelics[foundRelic.id] = (nextRelics[foundRelic.id] || 0) + 1;
          if (!nextDiscovered.includes(foundRelic.id)) {
            nextDiscovered.push(foundRelic.id);
          }
        }

        const xpGain =
          (oreId ? (MINE_RESOURCE_BY_ID[oreId]?.xpReward || 12) * qty : 5) +
          (foundRelic ? foundRelic.xpReward : 0);

        const xpRes = addXpAndCheckLevelUp(
          {
            ...prev,
            mine: {
              ...mine,
              stamina: Math.max(0, mine.stamina - 1),
              ladderRevealed: mine.ladderRevealed || Boolean(cell.hasLadder),
              board: nextBoard,
              ores: nextOres,
              relics: nextRelics,
              discoveredRelics: nextDiscovered,
              totalRocksMined: mine.totalRocksMined + 1,
            },
          },
          xpGain
        );
        return advanceQuestProgress(xpRes.state, 'mine_rocks', 1);
      });
    } else {
      setGameState((prev) => {
        const mine = prev.mine || createInitialMineState(prev.day, prev.level);
        const cell = mine.board[cellIdx];
        if (!cell || cell.kind === 'empty' || cell.kind === 'ladder' || mine.stamina <= 0) return prev;
        const nextBoard = mine.board.map((c, idx) =>
          idx === cellIdx ? { ...c, hp: Math.max(0, c.hp - mine.pickaxeTier) } : c
        );
        return {
          ...prev,
          mine: {
            ...mine,
            stamina: Math.max(0, mine.stamina - 1),
            board: nextBoard,
          },
        };
      });
    }
  };

  const handleMineChangeFloor = (targetFloor: number) => {
    const safeFloor = Math.max(1, Math.min(25, targetFloor));
    audioEngine.playSfx('click');
    setGameState((prev) => {
      const mine = prev.mine || createInitialMineState(prev.day, prev.level);
      const nextUnlocked = Math.max(mine.unlockedFloor, safeFloor);
      return {
        ...prev,
        mine: {
          ...mine,
          currentFloor: safeFloor,
          unlockedFloor: nextUnlocked,
          ladderRevealed: false,
          board: generateMineBoard(safeFloor),
        },
      };
    });
  };

  const handleMineEatSnack = (itemId: string) => {
    const snack = MINE_SNACKS.find((s) => s.itemId === itemId);
    if (!snack) return;
    const snap = gameStateRef.current;
    const snapMine = snap.mine || createInitialMineState(snap.day, snap.level);
    if ((snap.inventory[itemId] || 0) <= 0 || snapMine.stamina >= snapMine.maxStamina) return;

    audioEngine.playSfx('harvest');
    setGameState((prev) => {
      const mine = prev.mine || createInitialMineState(prev.day, prev.level);
      const owned = prev.inventory[itemId] || 0;
      if (owned <= 0 || mine.stamina >= mine.maxStamina) return prev;
      const nextInv = { ...prev.inventory, [itemId]: owned - 1 };
      if (nextInv[itemId] <= 0) delete nextInv[itemId];
      return {
        ...prev,
        inventory: nextInv,
        mine: {
          ...mine,
          stamina: Math.min(mine.maxStamina, mine.stamina + snack.staminaGain),
        },
      };
    });
    const itemName = CATALOG_BY_ID[itemId]?.produceName || itemId;
    pushToast(`${itemName} genascht`, `+${snack.staminaGain} Minen-Ausdauer aufgefüllt!`, 'success');
  };

  const handleMineForgeRecipe = (recipeId: string) => {
    const recipe = MINE_FORGE_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    const snap = gameStateRef.current;
    const snapMine = snap.mine || createInitialMineState(snap.day, snap.level);
    if (snap.level < recipe.unlockLevel || snap.coins < recipe.coinsCost) return;
    if (
      recipe.kind === 'pickaxe' &&
      recipe.targetPickaxeTier !== undefined &&
      snapMine.pickaxeTier >= recipe.targetPickaxeTier
    ) {
      return;
    }
    const hasOres = recipe.ingredients.every((ing) => (snapMine.ores[ing.resourceId] || 0) >= ing.qty);
    if (!hasOres) return;

    audioEngine.playSfx('levelup');
    setGameState((prev) => {
      const mine = prev.mine || createInitialMineState(prev.day, prev.level);
      if (prev.level < recipe.unlockLevel || prev.coins < recipe.coinsCost) return prev;
      if (
        recipe.kind === 'pickaxe' &&
        recipe.targetPickaxeTier !== undefined &&
        mine.pickaxeTier >= recipe.targetPickaxeTier
      ) {
        return prev;
      }
      if (!recipe.ingredients.every((ing) => (mine.ores[ing.resourceId] || 0) >= ing.qty)) return prev;

      const nextOres = { ...mine.ores };
      recipe.ingredients.forEach((ing) => {
        nextOres[ing.resourceId] = Math.max(0, (nextOres[ing.resourceId] || 0) - ing.qty);
      });

      let nextPickaxeTier = mine.pickaxeTier;
      let nextMaxStamina = mine.maxStamina;
      let nextStamina = mine.stamina;
      const nextSeeds = { ...prev.seeds };
      let nextSelectedSeed = prev.selectedSeedId;
      let nextTool = prev.selectedTool;

      if (recipe.kind === 'pickaxe' && recipe.targetPickaxeTier) {
        nextPickaxeTier = recipe.targetPickaxeTier;
        nextMaxStamina = getMaxMineStamina(prev.level, nextPickaxeTier);
        nextStamina = nextMaxStamina;
      } else if (recipe.outputItemId) {
        nextSeeds[recipe.outputItemId] = (nextSeeds[recipe.outputItemId] || 0) + (recipe.outputQty || 1);
        nextSelectedSeed = recipe.outputItemId;
        nextTool = 'build';
      }

      const xpRes = addXpAndCheckLevelUp(
        {
          ...prev,
          coins: prev.coins - recipe.coinsCost,
          seeds: nextSeeds,
          selectedSeedId: nextSelectedSeed,
          selectedTool: nextTool,
          mine: {
            ...mine,
            ores: nextOres,
            pickaxeTier: nextPickaxeTier,
            maxStamina: nextMaxStamina,
            stamina: nextStamina,
          },
          stats: {
            ...prev.stats,
            totalMineForged: (prev.stats.totalMineForged || 0) + 1,
          },
        },
        recipe.xpReward
      );
      return advanceQuestProgress(xpRes.state, 'mine_forge', 1);
    });

    pushToast(
      `Geschmiedet: ${recipe.title}!`,
      recipe.kind === 'pickaxe'
        ? 'Deine neue Spitzhacke zertrümmert Felsen schneller & füllt deine Ausdauer auf!'
        : 'Liegt im Bau-Menü [9] bereit zum Aufstellen auf deinem Hof!',
      'success'
    );
  };

  const handleMineSellResource = (resourceId: string, qty: number) => {
    const resMeta = MINE_RESOURCE_BY_ID[resourceId];
    if (!resMeta || qty <= 0) return;
    const snap = gameStateRef.current;
    const snapMine = snap.mine || createInitialMineState(snap.day, snap.level);
    const bag = resMeta.kind === 'ore' ? snapMine.ores : snapMine.relics;
    const owned = bag[resourceId] || 0;
    const sellQty = Math.min(owned, qty);
    if (sellQty <= 0) return;
    const earned = sellQty * resMeta.sellPrice;

    audioEngine.playSfx('coin');
    setGameState((prev) => {
      const mine = prev.mine || createInitialMineState(prev.day, prev.level);
      const isOre = resMeta.kind === 'ore';
      const curBag = isOre ? { ...mine.ores } : { ...mine.relics };
      const curOwned = curBag[resourceId] || 0;
      const actual = Math.min(curOwned, qty);
      if (actual <= 0) return prev;
      const coinsEarned = actual * resMeta.sellPrice;
      curBag[resourceId] = curOwned - actual;
      if (curBag[resourceId] <= 0) delete curBag[resourceId];

      return advanceQuestProgress(
        {
          ...prev,
          coins: prev.coins + coinsEarned,
          mine: {
            ...mine,
            ores: isOre ? curBag : mine.ores,
            relics: isOre ? mine.relics : curBag,
          },
          stats: {
            ...prev.stats,
            totalSoldCoins: prev.stats.totalSoldCoins + coinsEarned,
          },
        },
        'sell_coins',
        coinsEarned
      );
    });
    pushToast(`${sellQty}× ${resMeta.name} verkauft`, `+${earned.toLocaleString('de-DE')} Münzen`, 'success');
  };

  const handleMineSellAllResources = () => {
    const snap = gameStateRef.current;
    const snapMine = snap.mine || createInitialMineState(snap.day, snap.level);
    let total = 0;
    Object.entries(snapMine.ores).forEach(([id, q]) => {
      total += (MINE_RESOURCE_BY_ID[id]?.sellPrice || 0) * q;
    });
    Object.entries(snapMine.relics).forEach(([id, q]) => {
      total += (MINE_RESOURCE_BY_ID[id]?.sellPrice || 0) * q;
    });
    if (total <= 0) return;

    audioEngine.playSfx('coin');
    setGameState((prev) => {
      const mine = prev.mine || createInitialMineState(prev.day, prev.level);
      let gain = 0;
      Object.entries(mine.ores).forEach(([id, q]) => {
        gain += (MINE_RESOURCE_BY_ID[id]?.sellPrice || 0) * q;
      });
      Object.entries(mine.relics).forEach(([id, q]) => {
        gain += (MINE_RESOURCE_BY_ID[id]?.sellPrice || 0) * q;
      });
      if (gain <= 0) return prev;
      return advanceQuestProgress(
        {
          ...prev,
          coins: prev.coins + gain,
          mine: {
            ...mine,
            ores: {},
            relics: {},
          },
          stats: {
            ...prev.stats,
            totalSoldCoins: prev.stats.totalSoldCoins + gain,
          },
        },
        'sell_coins',
        gain
      );
    });
    pushToast('Alle Minen-Schätze verkauft!', `+${total.toLocaleString('de-DE')} Münzen erhalten`, 'success');
  };

  if (phase === 'TITLE') {
    return (
      <>
        <TitleScreen
          hasSave={savedExists}
          avatar={gameState.avatar}
          selectedPet={selectedTitlePet}
          onSelectPet={setSelectedTitlePet}
          onContinue={() => {
            startMusicOnInteraction(settings);
            setPhase('PLAYING');
          }}
          onNewGame={() => {
            const fresh = createInitialGameState(selectedTitlePet);
            fresh.avatar = gameState.avatar;
            setGameState(fresh);
            saveGameState(fresh);
            setSavedExists(true);
            startMusicOnInteraction(settings);
            setPhase('PLAYING');
          }}
          onRandomizeAvatar={() => {
            setGameState((prev) => ({
              ...prev,
              avatar: createRandomAvatar(prev.avatar.farmerName, prev.avatar.farmName),
            }));
          }}
          onOpenOptions={() => setActiveModal('options')}
        />
        {activeModal === 'options' && (
          <Suspense fallback={null}>
            <OptionsModal
              settings={settings}
              defaultSaveName={`sonnental-hof-tag-${gameState.day}`}
              lastSavedAt={gameState.savedAt}
              onUpdateSettings={updateSettings}
              onClose={() => setActiveModal('none')}
              onManualSave={() => {
                const now = Date.now();
                const next = { ...gameState, savedAt: now };
                setGameState(next);
                saveGameState(next);
                pushToast('Gespeichert', 'Lokal gesichert.', 'success');
              }}
              onExportSave={handleExportSave}
              onImportSave={handleImportSave}
              onResetGame={handleResetGame}
            />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1b1612]">
      <Suspense fallback={null}>
        <FarmCanvas
        gameState={gameState}
        resolution={settings.resolution}
        graphicsQuality={settings.graphicsQuality ?? 'high'}
        showGrid={settings.showGrid}
        showTimers={settings.showTimers}
        floatingTexts={floatingTexts}
        playerPos={playerPos}
        fishingCast={fishingCast}
        ufoAbduction={ufoAbduction}
        movingDecoration={movingDecoration}
        actionBurstQueueRef={actionBurstQueueRef}
        onTileInteract={handleTileInteract}
        onRiverInteract={handleRiverInteract}
        onReelFishing={handleReelFishing}
        onCancelMoveDecoration={() => {
          setMovingDecoration(null);
          audioEngine.playSfx('click');
        }}
        onExpandClick={() => setActiveModal('market')}
        onHouseClick={() => {
          setGameState((s) => ({ ...s, tutorial: { ...s.tutorial, visitedHouseOrPet: true } }));
          setActiveModal('house');
        }}
        onShopClick={() => setActiveModal('shop')}
        onMailboxClick={handleMailboxClick}
        onPetClick={() => {
          setGameState((s) => ({ ...s, tutorial: { ...s.tutorial, visitedHouseOrPet: true } }));
          setActiveModal('pet');
        }}
        onWorkerClick={() => setActiveModal('workers')}
        onMerchantClick={() => setActiveModal('merchant')}
        onVillageBoardClick={() => {
          audioEngine.playSfx('click');
          setActiveModal('village_board');
        }}
        onVillageBusinessClick={(businessId) => {
          audioEngine.playSfx('click');
          setSelectedBusinessId(businessId);
          setActiveModal('village_business');
        }}
        onThemeParkClick={() => {
          audioEngine.playSfx('click');
          setActiveModal('theme_park');
        }}
        onVillageFireClick={() => {
          audioEngine.playSfx('click');
          setFireModalOpen(true);
        }}
        onMineClick={() => {
          audioEngine.playSfx('click');
          setActiveModal('mine');
        }}
        onFlyAgaricInteract={handleFlyAgaricInteract}
      />

      <HudBar
        gameState={gameState}
        settings={settings}
        activeModal={activeModal}
        onSelectTool={(tool: ToolType) => {
          audioEngine.playSfx('click');
          setMovingDecoration(null);
          setGameState((s) => {
            if (tool === 'plant') {
              const cur = CATALOG_BY_ID[s.selectedSeedId];
              const isPlantable = cur && (cur.category === 'crop' || cur.category === 'mushroom' || cur.category === 'tree');
              const nextSeedId = isPlantable && (s.seeds[cur.id] || 0) > 0
                ? s.selectedSeedId
                : CATALOG.find(
                    (i) => (i.category === 'crop' || i.category === 'mushroom' || i.category === 'tree') && (s.seeds[i.id] || 0) > 0
                  )?.id || s.selectedSeedId;
              return { ...s, selectedTool: tool, selectedSeedId: nextSeedId };
            }
            if (tool === 'build') {
              const cur = CATALOG_BY_ID[s.selectedSeedId];
              const isBuildable = cur && (cur.category === 'decoration' || cur.category === 'animal');
              const nextSeedId = isBuildable && (s.seeds[cur.id] || 0) > 0
                ? s.selectedSeedId
                : CATALOG.find(
                    (i) => (i.category === 'decoration' || i.category === 'animal') && (s.seeds[i.id] || 0) > 0
                  )?.id || s.selectedSeedId;
              return { ...s, selectedTool: tool, selectedSeedId: nextSeedId };
            }
            return { ...s, selectedTool: tool };
          });
        }}
        onSelectSeed={(seedId: string) => {
          audioEngine.playSfx('click');
          setMovingDecoration(null);
          const meta = CATALOG_BY_ID[seedId];
          const targetTool: ToolType =
            meta && (meta.category === 'decoration' || meta.category === 'animal') ? 'build' : 'plant';
          setGameState((s) => ({ ...s, selectedSeedId: seedId, selectedTool: targetTool }));
        }}
        onOpenModal={(m) => {
          startMusicOnInteraction(settings);
          audioEngine.playSfx('click');
          setMovingDecoration(null);
          if (m === 'craft') setCraftModalStation(undefined);
          if (m === 'neighbors') {
            setNeighborsInitialTab(gameStateRef.current.romance?.pendingSpark ? 'romance' : 'neighbors');
          }
          if (m === 'house' || m === 'pet') {
            setGameState((s) => ({ ...s, tutorial: { ...s.tutorial, visitedHouseOrPet: true } }));
          }
          setActiveModal(m);
        }}
        onOpenRomance={() => {
          audioEngine.playSfx('click');
          setNeighborsInitialTab('romance');
          setActiveModal('neighbors');
        }}
        onToggleMusic={() => {
          startMusicOnInteraction({ ...settings, musicPlaying: !settings.musicPlaying });
          updateSettings({ ...settings, musicPlaying: !settings.musicPlaying });
        }}
        onNextTrack={() => {
          const nextIdx = (settings.currentTrackIndex + 1) % MIDI_TRACKS.length;
          const nextSettings = { ...settings, currentTrackIndex: nextIdx, musicPlaying: true, muted: false };
          startMusicOnInteraction(nextSettings);
          updateSettings(nextSettings);
          pushToast('Nächstes Musikstück', MIDI_TRACKS[nextIdx].title, 'info');
        }}
        onToggleMute={() => updateSettings({ ...settings, muted: !settings.muted })}
        onOpenFireInfo={() => {
          audioEngine.playSfx('click');
          setFireModalOpen(true);
        }}
        onSecretAdminTrigger={
          import.meta.env.DEV
            ? () => {
                if (
                  typeof window === 'undefined' ||
                  window.location.protocol === 'file:' ||
                  navigator.userAgent.toLowerCase().includes('electron')
                ) {
                  return;
                }
                audioEngine.playSfx('click');
                setAdminModalOpen(true);
              }
            : undefined
        }
      />

      {/* Lvl 1-5 Tutorial Guide Widget / Post-Tutorial Quest Tracker */}
      <TutorialWidget
        gameState={gameState}
        onClaimStep={handleClaimTutorialStep}
        onDismiss={() => setGameState((s) => ({ ...s, tutorial: { ...s.tutorial, dismissed: true } }))}
        onOpenQuests={() => setActiveModal('quests')}
        onClaimQuest={handleClaimQuest}
      />
      </Suspense>

      {/* Non-Frustrating Disaster Recovery Report */}
      {gameState.lastDisasterReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
            <div className="bg-[#4a321f] px-5 py-4 text-[#faf6ee] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudLightning className="w-5 h-5 text-amber-300" />
                <h3 className="font-display font-bold text-base">
                  {gameState.lastDisasterReport.title} ({gameState.lastDisasterReport.severityLabel})
                </h3>
              </div>
              <button
                onClick={() => setGameState((s) => ({ ...s, lastDisasterReport: null }))}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>
                  {gameState.lastDisasterReport.protectedCount} geschützt ·{' '}
                  {gameState.lastDisasterReport.affectedCount} betroffen
                </span>
              </div>
              <p className="text-xs text-[#5c4632] leading-relaxed">
                {gameState.lastDisasterReport.title.includes('UFO')
                  ? 'Was für ein Lichtblitz am Himmel! Deine Nachbarn haben sofort ein kleines Hilfspaket vorbeigebracht. Tipp: Schutz-Pavillons & Vogelscheuchen schirmen auch Kühe vor UFOs ab!'
                  : 'Deine Nachbarn haben sofort ein Nachbarschafts-Hilfspaket vorbeigebracht! Betroffene Felder sind nun zusätzlich nährstoffreich (+50 % Wachstum).'}
              </p>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono-num space-y-1">
                <div>+ {gameState.lastDisasterReport.reliefCoins} Münzen Hof-Unterstützung</div>
                <div>+ {gameState.lastDisasterReport.reliefXp} Erfahrungspunkte</div>
                {gameState.lastDisasterReport.reliefSeeds.map((rs) => (
                  <div key={rs.itemId}>
                    + {rs.qty}× Ersatz-Saatgut ({CATALOG_BY_ID[rs.itemId]?.name})
                  </div>
                ))}
              </div>
              <button
                onClick={() => setGameState((s) => ({ ...s, lastDisasterReport: null }))}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
              >
                Weiter geht&apos;s!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Village Fire Brigade Emergency Modal (Lösung 2) */}
      {fireModalOpen && gameState.villageFire?.active && (() => {
        const fire = gameState.villageFire;
        const houseResidents = getResidentsForHouse(fire.houseId);
        const supplyItemEntry = Object.entries(gameState.inventory).find(([id, qty]) => {
          if (qty <= 0) return false;
          const cat = CATALOG_BY_ID[id]?.category;
          return cat === 'artisan' || cat === 'crop' || cat === 'tree';
        });
        const supplyItem = supplyItemEntry ? CATALOG_BY_ID[supplyItemEntry[0]] : null;
        const canSupportProvisions = Boolean(supplyItem) || gameState.coins >= 40;

        const handleHelp = (kind: 'water' | 'provisions') => {
          setGameState((prev) => {
            if (!prev.villageFire?.active || prev.villageFire.playerHelped) return prev;
            let nextInv = prev.inventory;
            let nextCoins = prev.coins;
            const cutMinutes = kind === 'provisions' ? 45 : 30;
            const xpGain = kind === 'provisions' ? 55 : 25;
            const repGain = kind === 'provisions' ? 4 : 2;
            const rewardCoins = kind === 'provisions' ? 65 : 0;

            if (kind === 'provisions') {
              const found = Object.entries(prev.inventory).find(([id, qty]) => {
                if (qty <= 0) return false;
                const cat = CATALOG_BY_ID[id]?.category;
                return cat === 'artisan' || cat === 'crop' || cat === 'tree';
              });
              if (found) {
                nextInv = { ...prev.inventory, [found[0]]: Math.max(0, found[1] - 1) };
              } else if (prev.coins >= 40) {
                nextCoins -= 40;
              } else {
                return prev;
              }
            }
            nextCoins += rewardCoins;

            const residents = getResidentsForHouse(prev.villageFire.houseId);
            const featuredIds = new Set(residents.map((r) => r.neighborId).filter(Boolean));
            const nextNeighbors = prev.neighbors.map((n) => ({
              ...n,
              friendship: Math.min(
                100,
                n.friendship + (featuredIds.has(n.id) ? (kind === 'provisions' ? 12 : 8) : kind === 'provisions' ? 3 : 2)
              ),
            }));

            const nextRemainingMs = Math.max(
              15_000,
              prev.villageFire.remainingMs - cutMinutes * REAL_MS_PER_INGAME_MINUTE
            );

            const baseRes = addXpAndCheckLevelUp(
              {
                ...prev,
                coins: nextCoins,
                inventory: nextInv,
                neighbors: nextNeighbors,
                farmShop: {
                  ...prev.farmShop,
                  reputation: Math.min(100, (prev.farmShop.reputation ?? 10) + repGain),
                },
                villageFire: {
                  ...prev.villageFire,
                  remainingMs: nextRemainingMs,
                  playerHelped: true,
                },
                stats: {
                  ...prev.stats,
                  totalFiresHelped: (prev.stats.totalFiresHelped || 0) + 1,
                },
              },
              xpGain
            );
            return baseRes.state;
          });

          audioEngine.playSfx('levelup');
          const fh = VILLAGE_HOUSE_BY_ID[fire.houseId];
          if (fh) {
            spawnFloat(fh.doorX, fh.y - 0.3, '🚒 Danke für die Hilfe!', '#4ade80', true);
          }
          pushToast(
            'Feuerwehr unterstützt!',
            kind === 'provisions'
              ? 'Löschzeit um ~45 Ingame-Min. verkürzt (+55 XP, +65 M Dankeschön & Ruf)!'
              : 'Löschzeit um ~30 Ingame-Min. verkürzt (+25 XP & Nachbarschafts-Ruf)!',
            'success'
          );
          setFireModalOpen(false);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
              <div className="bg-rose-900 px-5 py-4 text-[#faf6ee] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
                  <h3 className="font-display font-bold text-base">
                    Feuerwehreinsatz: {fire.houseName}
                  </h3>
                </div>
                <button
                  onClick={() => setFireModalOpen(false)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                  <div className="font-bold text-rose-900">
                    Verdacht: {fire.causeTitle}
                  </div>
                  <div className="text-[#5c4632] leading-relaxed">{fire.causeDetail}</div>
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-num text-rose-800">
                    <span>Ausbruch: {fire.startedAtTime} Uhr</span>
                    <span>Restliche Löschzeit: {formatDurationMs(fire.remainingMs)}</span>
                  </div>
                </div>

                <div className="text-[#4a321f]">
                  <strong>Bewohner ({houseResidents.length}):</strong>{' '}
                  {houseResidents.map((r) => r.name).join(', ')}
                  <div className="text-[11px] text-rose-700 font-semibold mt-0.5">
                    Während des Einsatzes können die Bewohner dieses Hauses nicht in deinem Hofladen einkaufen.
                  </div>
                </div>

                {fire.playerHelped ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                    Du hast die Feuerwehr bereits unterstützt! Dein Hof wird morgen im Zeitungsartikel lobend erwähnt.
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="font-display font-bold text-sm text-[#2b2118]">
                      Optional mithelfen (verkürzt Löschzeit):
                    </div>
                    <button
                      onClick={() => handleHelp('water')}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold transition-colors text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 shrink-0" />
                        <span>Mit Hof-Gießkanne kühlen (Kostenlos)</span>
                      </span>
                      <span className="font-mono-num text-[11px] text-sky-100 shrink-0">-30 Min · +25 XP</span>
                    </button>
                    <button
                      disabled={!canSupportProvisions}
                      onClick={() => handleHelp('provisions')}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-45 text-white font-semibold transition-colors text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 shrink-0" />
                        <span>
                          {supplyItem
                            ? `Einsatzkräfte stärken (1× ${supplyItem.produceName})`
                            : 'Einsatzkräfte verpflegen (40 M)'}
                        </span>
                      </span>
                      <span className="font-mono-num text-[11px] text-amber-100 shrink-0">-45 Min · +65 M</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setFireModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-[#efe6d5] hover:bg-[#e2d4bc] border border-[#cbb799] text-[#2b2118] font-semibold"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toasts */}
      <div className="fixed top-20 right-4 z-30 flex flex-col gap-2 pointer-events-none max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-xl px-3.5 py-2.5 shadow-lg text-[#2b2118] flex items-start gap-2.5"
          >
            {t.tone === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-display font-bold">{t.title}</div>
              {t.detail && <div className="text-[#5c4632] mt-0.5">{t.detail}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
      {activeModal === 'inventory' && (
        <InventoryModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onEquipPlaceable={(itemId) => {
            const item = CATALOG_BY_ID[itemId];
            const targetTool: ToolType =
              item && (item.category === 'decoration' || item.category === 'animal') ? 'build' : 'plant';
            audioEngine.playSfx('click');
            setGameState((prev) => ({
              ...prev,
              selectedSeedId: itemId,
              selectedTool: targetTool,
            }));
            if (item) {
              pushToast(
                `${item.name} ausgewählt`,
                item.category === 'crop' || item.category === 'mushroom'
                  ? 'Klicke auf ein freies Ackerfeld [2], um zu säen.'
                  : 'Klicke auf eine freie Wiese oder einen Weg, um zu setzen.',
                'info'
              );
            }
          }}
          onEquipFertilizer={() => {
            audioEngine.playSfx('click');
            setGameState((prev) => ({
              ...prev,
              selectedTool: 'fertilize',
            }));
            pushToast('Hof-Dünger ausgewählt', 'Klicke auf ein Ackerfeld, um es zu düngen.', 'info');
          }}
          onUseGrowthElixir={handleUseGrowthElixir}
          onSellProduct={handleSellItem}
          onSellAllProducts={handleSellAll}
          onEatFeastDish={handleEatFeastDish}
          onOpenMarket={() => setActiveModal('market')}
        />
      )}

      {activeModal === 'market' && (
        <MarketModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onSellItem={handleSellItem}
          onSellAll={handleSellAll}
          onCompleteOrder={handleCompleteOrder}
          onBuyItem={handleBuyItem}
          onBuyFertilizer={handleBuyFertilizer}
          onUpgradeWateringCan={handleUpgradeWateringCan}
          onExpandFarm={handleExpandFarm}
        />
      )}

      {activeModal === 'craft' && (
        <CraftModal
          gameState={gameState}
          initialStationId={craftModalStation}
          onClose={() => setActiveModal('none')}
          onStartCraft={handleStartCraft}
          onBuyStation={handleBuyStation}
          onEquipStation={handleEquipStation}
        />
      )}

      {activeModal === 'shop' && (
        <FarmShopModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onStockItem={handleStockShopItem}
          onUnstockItem={handleUnstockShopItem}
          onStockAll={handleStockAllShopArtisan}
          onToggleAutoRestock={handleToggleAutoRestock}
          onFulfillSpecialOrder={handleFulfillSpecialOrder}
          onOpenCraft={() => setActiveModal('craft')}
        />
      )}

      {activeModal === 'mailbox' && (
        <MailboxModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onCollectMail={handleCollectMail}
        />
      )}

      {activeModal === 'merchant' && (
        <MerchantModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onBuyOffer={handleBuyMerchantOffer}
          onCompleteTrade={handleCompleteMerchantTrade}
        />
      )}

      {activeModal === 'quests' && (
        <QuestsModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onClaimQuest={handleClaimQuest}
          onRerollQuest={handleRerollQuest}
          onClaimMilestone={handleClaimMilestone}
        />
      )}

      {activeModal === 'house' && (
        <HouseModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onUpgradeFloor={handleUpgradeFloor}
          onBuyExtra={handleBuyHouseExtra}
        />
      )}

      {activeModal === 'pet' && (
        <PetModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onPetInteract={handlePetInteract}
          onRenamePet={(nextName) => {
            setGameState((s) => ({ ...s, pet: { ...s.pet, name: nextName } }));
            pushToast('Haustier umbenannt', `Dein Gefährte heißt nun ${nextName}.`, 'success');
          }}
          onChangePetType={(nextType) => {
            const meta = PET_CATALOG[nextType];
            setGameState((s) => ({
              ...s,
              pet: { ...s.pet, type: nextType, name: meta.defaultName },
            }));
            pushToast(`Begleiter gewechselt`, `${meta.title} (${meta.defaultName}) hilft dir jetzt!`, 'info');
          }}
        />
      )}

      {activeModal === 'workers' && (
        <WorkersModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onHireWorker={handleHireWorker}
          onFireWorker={handleFireWorker}
          onToggleWorkerTask={handleToggleWorkerTask}
          onRenameWorker={handleRenameWorker}
          onPayWorkerArrears={handlePayWorkerArrears}
        />
      )}

      {activeModal === 'neighbors' && (
        <NeighborsModal
          gameState={gameState}
          initialTab={neighborsInitialTab}
          onClose={() => setActiveModal('none')}
          onHelpNeighbor={handleHelpNeighbor}
          onGiveGift={handleGiveGift}
          onFulfillNeighborRequest={handleFulfillNeighborRequest}
          onAcceptSpark={handleAcceptRomanceSpark}
          onDeclineSpark={handleDeclineRomanceSpark}
          onGiveRomanceGift={handleGiveRomanceGift}
          onGoOnDate={handleGoOnRomanceDate}
          onMarryPartner={handleMarryPartner}
          onBreakupRomance={handleBreakupRomance}
          onOpenHouse={() => {
            audioEngine.playSfx('click');
            setActiveModal('house');
          }}
        />
      )}

      {activeModal === 'events' && (
        <SeasonalEventModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onClaimTier={handleClaimEventTier}
        />
      )}

      {activeModal === 'almanac' && (
        <AlmanachModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'village_board' && (
        <VillageBoardModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onDeliverOrder={handleDeliverVillageOrder}
        />
      )}

      {activeModal === 'village_business' && (
        <VillageBusinessModal
          gameState={gameState}
          initialBusinessId={selectedBusinessId}
          onClose={() => setActiveModal('none')}
          onPurchaseBusiness={handlePurchaseVillageBusiness}
          onRepairBusiness={handleRepairVillageBusiness}
        />
      )}

      {activeModal === 'theme_park' && (
        <ThemeParkModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onPurchasePark={handlePurchaseThemePark}
          onBuildAttraction={handleBuildThemeParkAttraction}
          onRepairPark={handleRepairThemePark}
        />
      )}

      {activeModal === 'mine' && (
        <MineModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onHitCell={handleMineHitCell}
          onChangeFloor={handleMineChangeFloor}
          onEatSnack={handleMineEatSnack}
          onForgeRecipe={handleMineForgeRecipe}
          onSellMineResource={handleMineSellResource}
          onSellAllMineResources={handleMineSellAllResources}
        />
      )}

      {activeModal === 'fair' && (
        <VillageFairModal
          gameState={gameState}
          onClose={() => setActiveModal('none')}
          onSubmitFair={handleSubmitVillageFair}
        />
      )}

      {activeModal === 'avatar' && (
        <AvatarModal
          avatar={gameState.avatar}
          onSave={(nextAvatar: AvatarConfig) => {
            setGameState((prev) => ({ ...prev, avatar: nextAvatar }));
            pushToast('Avatar aktualisiert', `${nextAvatar.farmerName} · ${nextAvatar.farmName}`, 'success');
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'options' && (
        <OptionsModal
          settings={settings}
          defaultSaveName={`sonnental-hof-tag-${gameState.day}`}
          lastSavedAt={gameState.savedAt}
          onUpdateSettings={updateSettings}
          onClose={() => setActiveModal('none')}
          onManualSave={() => {
            const now = Date.now();
            const next = { ...gameState, savedAt: now };
            setGameState(next);
            saveGameState(next);
            pushToast('Spielstand gespeichert', 'Alles sicher lokal abgelegt.', 'success');
          }}
          onExportSave={handleExportSave}
          onImportSave={handleImportSave}
          onResetGame={handleResetGame}
        />
      )}

      {import.meta.env.DEV &&
        AdminEventModal &&
        adminModalOpen &&
        typeof window !== 'undefined' &&
        window.location.protocol !== 'file:' &&
        !navigator.userAgent.toLowerCase().includes('electron') && (
          <AdminEventModal
            gameState={gameState}
            eventContext={{
              state: gameState,
              setGameState,
              triggerUfoAt,
              spawnFloat,
              pushToast,
              playSfx: (kind) => audioEngine.playSfx(kind),
              openRomanceModal: () => {
                setNeighborsInitialTab('romance');
                setActiveModal('neighbors');
              },
            }}
            onClose={() => setAdminModalOpen(false)}
            onSetTimeOfDay={(targetMinutes, advanceOneDay) => {
              setGameState((prev) => {
                const nextDay = advanceOneDay ? prev.day + 1 : prev.day;
                return applyNewDayStateReset(prev, nextDay, targetMinutes);
              });
              audioEngine.playSfx('click');
              pushToast(
                advanceOneDay ? 'Tag & Uhrzeit vorgestellt' : 'Uhrzeit geändert',
                advanceOneDay
                  ? `Auf nächsten Tag (09:57 Uhr) gesprungen — Postbote & Zeitung starten gleich!`
                  : `Uhrzeit auf ${String(Math.floor(targetMinutes / 60)).padStart(2, '0')}:${String(targetMinutes % 60).padStart(2, '0')} Uhr gestellt.`,
                'info'
              );
              setAdminModalOpen(false);
            }}
            onFinishActiveFireNow={() => {
              setGameState((prev) => {
                if (!prev.villageFire?.active) return prev;
                return {
                  ...prev,
                  villageFire: {
                    ...prev.villageFire,
                    remainingMs: 1,
                  },
                };
              });
              audioEngine.playSfx('click');
              setAdminModalOpen(false);
            }}
            onGrantCoins={(amount) => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              const safeAmount = Math.max(0, Math.min(999_999_999, Math.floor(amount)));
              if (safeAmount <= 0) return;
              setGameState((prev) => ({
                ...prev,
                coins: prev.coins + safeAmount,
              }));
              audioEngine.playSfx('coin');
              spawnFloat(
                playerPosRef.current.x,
                playerPosRef.current.y - 0.3,
                `+${safeAmount.toLocaleString('de-DE')} M`,
                '#fde047',
                true
              );
              pushToast(
                'Vorschau-Münzen gutgeschrieben',
                `+${safeAmount.toLocaleString('de-DE')} M zum Testen hinzugefügt.`,
                'success'
              );
            }}
            onSetLevel={(targetLevel, syncPetAndFishing) => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(targetLevel)));
              setGameState((prev) => {
                const mine = prev.mine || createInitialMineState(prev.day, safeLevel);
                const nextMaxStamina = getMaxMineStamina(safeLevel, mine.pickaxeTier);
                return {
                  ...prev,
                  level: safeLevel,
                  xp: 0,
                  pet: syncPetAndFishing ? { ...prev.pet, level: safeLevel, xp: 0 } : prev.pet,
                  fishing: syncPetAndFishing
                    ? { ...prev.fishing, level: safeLevel, xp: 0 }
                    : prev.fishing,
                  mine: {
                    ...mine,
                    maxStamina: nextMaxStamina,
                    stamina: Math.max(mine.stamina, nextMaxStamina),
                  },
                };
              });
              audioEngine.playSfx('levelup');
              pushToast(
                `Vorschau-Level auf ${safeLevel} gesetzt`,
                syncPetAndFishing
                  ? 'Hof-, Haustier- & Angel-Level synchron angepasst.'
                  : 'Hof-Level direkt angepasst.',
                'success'
              );
            }}
            onSetSeason={(season) => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              const seasonIdxMap: Record<Season, number> = {
                spring: 0,
                summer: 1,
                autumn: 2,
                winter: 3,
              };
              setGameState((prev) => {
                const yearCycle = Math.floor((Math.max(1, prev.day) - 1) / (DAYS_PER_SEASON * 4));
                const nextDay = yearCycle * DAYS_PER_SEASON * 4 + seasonIdxMap[season] * DAYS_PER_SEASON + 1;
                return applyNewDayStateReset(prev, nextDay, prev.ingameMinutes, season);
              });
              audioEngine.playSfx('click');
              pushToast('Jahreszeit geändert', `${SEASON_LABELS[season]} aktiviert.`, 'info');
            }}
            onSetWeather={(weather) => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              setGameState((prev) => ({
                ...prev,
                weather,
                weatherRemainingMs: 30 * 60 * 1000,
              }));
              audioEngine.playSfx('click');
              pushToast('Wetter gesetzt', `${WEATHER_META[weather].label} (${WEATHER_META[weather].effectText}).`, 'info');
            }}
            onInstantHarvestReady={() => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              let count = 0;
              setGameState((prev) => {
                const nextTiles = prev.tiles.map((row) =>
                  row.map((tile) => {
                    const ent = tile.entity;
                    if (!ent || ent.withered || ent.damaged) return tile;
                    if (
                      ent.category !== 'crop' &&
                      ent.category !== 'mushroom' &&
                      ent.category !== 'tree' &&
                      ent.category !== 'animal'
                    ) {
                      return tile;
                    }
                    const item = CATALOG_BY_ID[ent.itemId];
                    if (!item || item.growthMs <= 0) return tile;
                    count += 1;
                    return {
                      ...tile,
                      watered: tile.ground === 'tilled' ? true : tile.watered,
                      wateredRemainingMs: tile.ground === 'tilled' ? MAX_MOISTURE_MS : tile.wateredRemainingMs,
                      dryMs: 0,
                      entity: {
                        ...ent,
                        progressMs: item.growthMs,
                        ready: true,
                      },
                    };
                  })
                );
                const nextJobs = (prev.craftingJobs || []).map((j) => ({
                  ...j,
                  remainingMs: 1,
                }));
                return {
                  ...prev,
                  tiles: nextTiles,
                  craftingJobs: nextJobs,
                };
              });
              audioEngine.playSfx('harvest');
              pushToast(
                'Sofort-Wachstum ausgeführt',
                `${count} Kulturen/Tiere & laufende Veredelungen sind jetzt bereit.`,
                'success'
              );
            }}
            onUnlockAllLand={() => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              setGameState((prev) => ({
                ...prev,
                unlockedRing: 6,
                tiles: prev.tiles.map((row, y) =>
                  row.map((tile, x) => ({
                    ...tile,
                    unlocked: isTileUnlockedForRing(x, y, 6),
                  }))
                ),
              }));
              audioEngine.playSfx('levelup');
              pushToast('20×20 Hofland freigeschaltet', 'Alle Hof-Erweiterungsringe sind sofort offen.', 'success');
            }}
            onRefillSuppliesAndStamina={() => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              setGameState((prev) => {
                const mine = prev.mine || createInitialMineState(prev.day, prev.level);
                const maxStam = getMaxMineStamina(prev.level, mine.pickaxeTier);
                const nextOres = { ...mine.ores };
                for (const resId of Object.keys(MINE_RESOURCE_BY_ID)) {
                  if (MINE_RESOURCE_BY_ID[resId]?.kind === 'ore') {
                    nextOres[resId] = (nextOres[resId] || 0) + 25;
                  }
                }
                return {
                  ...prev,
                  fertilizerCount: prev.fertilizerCount + 25,
                  fishingBaitCharges: (prev.fishingBaitCharges || 0) + 15,
                  growthElixirCount: (prev.growthElixirCount || 0) + 10,
                  mine: {
                    ...mine,
                    stamina: maxStam,
                    maxStamina: maxStam,
                    ores: nextOres,
                  },
                };
              });
              audioEngine.playSfx('harvest');
              pushToast(
                'Mine & Vorrat aufgefüllt',
                'Minen-Ausdauer voll, +25 Dünger/Erze, +15 Köder & +10 Elixier.',
                'success'
              );
            }}
            onApplyPreset={(preset) => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              setGameState((prev) => {
                const targetLevel =
                  preset === 'industry' ? 150 : preset === 'theme_park' ? 175 : MAX_LEVEL;
                const coinBonus =
                  preset === 'industry'
                    ? 10_000_000
                    : preset === 'theme_park'
                    ? 20_000_000
                    : 50_000_000;
                const mine = prev.mine || createInitialMineState(prev.day, targetLevel);
                const nextMaxStam = getMaxMineStamina(targetLevel, mine.pickaxeTier);
                const unlockFull = preset === 'max_farm';
                return {
                  ...prev,
                  level: Math.max(prev.level, targetLevel),
                  xp: 0,
                  coins: prev.coins + coinBonus,
                  pet: { ...prev.pet, level: Math.max(prev.pet.level, targetLevel), xp: 0 },
                  fishing: { ...prev.fishing, level: Math.max(prev.fishing.level, targetLevel), xp: 0 },
                  unlockedRing: unlockFull ? 6 : prev.unlockedRing,
                  tiles: unlockFull
                    ? prev.tiles.map((row, y) =>
                        row.map((tile, x) => ({
                          ...tile,
                          unlocked: isTileUnlockedForRing(x, y, 6),
                        }))
                      )
                    : prev.tiles,
                  house: unlockFull
                    ? {
                        floors: 4,
                        extras: HOUSE_EXTRAS.map((e) => e.id),
                      }
                    : prev.house,
                  mine: {
                    ...mine,
                    maxStamina: nextMaxStam,
                    stamina: nextMaxStam,
                  },
                };
              });
              audioEngine.playSfx('levelup');
              const label =
                preset === 'industry'
                  ? 'Industrie-Test (Lvl 150 + 10 Mio M)'
                  : preset === 'theme_park'
                  ? 'Freizeitpark-Test (Lvl 175 + 20 Mio M)'
                  : `Max-Hof Vollausbau (Lvl ${MAX_LEVEL} + 50 Mio M + 20×20 & 4. Etage)`;
              pushToast('Testszenario aktiviert', label, 'success');
            }}
            onTriggerRomanceSpark={() => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              const sparked = triggerRomanceSparkForced(gameStateRef.current, 'Saison-Dorffest (Vorschau-Test)');
              setGameState((prev) => ({
                ...prev,
                level: Math.max(prev.level, 80),
                romance: sparked.state.romance,
              }));
              audioEngine.playSfx('levelup');
              pushToast(
                `Herzklopfen ausgelöst: ${sparked.candidate.name}`,
                'Öffne Herzenssache, um den Antrag/Flirt fortzusetzen.',
                'success'
              );
              setAdminModalOpen(false);
              setNeighborsInitialTab('romance');
              setActiveModal('neighbors');
            }}
            onMaxRomanceAffection={() => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              setGameState((prev) => {
                const cur = prev.romance || createInitialRomanceState();
                const partnerId = cur.partnerId || cur.pendingSpark?.candidateId || ROMANCE_CANDIDATES[0].id;
                return {
                  ...prev,
                  level: Math.max(prev.level, 80),
                  romance: {
                    ...cur,
                    status: cur.status === 'married' ? 'married' : 'crush',
                    pendingSpark: null,
                    partnerId,
                    affection: 100,
                  },
                };
              });
              audioEngine.playSfx('levelup');
              pushToast('Zuneigung auf 100 %', 'Hochzeitsantrag ist jetzt sofort bereit!', 'success');
            }}
            onMarryPartnerAdmin={() => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              let marriedName = '';
              setGameState((prev) => {
                const leveled = prev.level < 80 ? { ...prev, level: 80 } : prev;
                const res = marryRomancePartner(leveled, true);
                if (res.candidate) marriedName = res.candidate.name;
                return res.state;
              });
              audioEngine.playSfx('levelup');
              pushToast(
                `💍 Verheiratet mit ${marriedName || 'Partner'}!`,
                'Partner läuft jetzt über den Hof & Zeitungsmeldung ist vorgemerkt.',
                'success'
              );
              setAdminModalOpen(false);
            }}
            onResetRomanceAdmin={() => {
              if (
                !import.meta.env.DEV ||
                typeof window === 'undefined' ||
                window.location.protocol === 'file:' ||
                navigator.userAgent.toLowerCase().includes('electron')
              ) {
                return;
              }
              setGameState((prev) => ({
                ...prev,
                romance: createInitialRomanceState(),
              }));
              audioEngine.playSfx('click');
              pushToast('Beziehung zurückgesetzt', 'Spieler ist wieder Single.', 'info');
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
