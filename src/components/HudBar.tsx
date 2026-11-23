import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Backpack,
  BookOpen,
  Building2,
  Calendar,
  ChefHat,
  ChevronDown,
  ClipboardList,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Coins,
  Compass,
  FerrisWheel,
  Fish,
  Flame,
  Heart,
  Home,
  Lock,
  Mail,
  Moon,
  Mountain,
  Music,
  PawPrint,
  ScrollText,
  Settings,
  SkipForward,
  Snowflake,
  Sparkles,
  Store,
  Sun,
  Sunrise,
  Sunset,
  Trophy,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { MIDI_TRACKS } from '../audio/midiEngine';
import {
  CATALOG,
  CATALOG_BY_ID,
  DAYS_PER_SEASON,
  FISHING_UNLOCK_LEVEL,
  getMaxWorkersForLevel,
  MAX_LEVEL,
  SEASON_LABELS,
  WATERING_CAN_TIERS,
  WEATHER_META,
  WORKERS_UNLOCK_LEVEL,
  xpRequiredForLevel,
} from '../data/catalog';
import { ROMANCE_CANDIDATE_BY_ID } from '../data/romance';
import { THEME_PARK_ATTRACTIONS, THEME_PARK_UNLOCK_LEVEL } from '../data/themePark';
import { VILLAGE_BUSINESS_UNLOCK_LEVEL, VILLAGE_BUSINESSES } from '../data/village';
import {
  formatDurationMs,
  formatIngameTime,
  getAlmanacBonuses,
  getDayInSeason,
  getReadyMilestonesCount,
  getSeasonFairKey,
  isTutorialFinished,
} from '../engine/gameLogic';
import { DayNightAtmosphere, getDayNightAtmosphere } from '../graphics/pixelSprites';
import { GameSettings, GameState, ModalType, ToolType, WeatherType } from '../types/game';
import { PixelAvatarCanvas } from './PixelAvatarCanvas';
import { PixelToolIcon } from './PixelToolIcon';

interface HudBarProps {
  gameState: GameState;
  settings: GameSettings;
  activeModal: ModalType;
  onSelectTool: (tool: ToolType) => void;
  onSelectSeed: (seedId: string) => void;
  onOpenModal: (modal: ModalType) => void;
  onToggleMusic: () => void;
  onNextTrack: () => void;
  onToggleMute: () => void;
  onOpenFireInfo?: () => void;
  onOpenRomance?: () => void;
  onSecretAdminTrigger?: () => void;
}

function WeatherIcon({ weather }: { weather: WeatherType }) {
  switch (weather) {
    case 'sunny':
      return <Sun className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'cloudy':
      return <CloudSun className="w-4 h-4 text-slate-500 shrink-0" />;
    case 'rainy':
      return <CloudRain className="w-4 h-4 text-sky-600 shrink-0" />;
    case 'foggy':
      return <CloudFog className="w-4 h-4 text-teal-600 shrink-0" />;
    case 'windy':
      return <Wind className="w-4 h-4 text-emerald-600 shrink-0" />;
    case 'stormy':
      return <CloudLightning className="w-4 h-4 text-indigo-600 shrink-0" />;
    case 'frost':
      return <Snowflake className="w-4 h-4 text-sky-500 shrink-0" />;
  }
}

function DayPhaseIcon({ phase }: { phase: DayNightAtmosphere['phase'] }) {
  switch (phase) {
    case 'night':
      return <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
    case 'dawn':
      return <Sunrise className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
    case 'day':
      return <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case 'dusk':
      return <Sunset className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  }
}

type DockMenuGroupId = 'farm' | 'world' | 'goals';

export const HudBar: React.FC<HudBarProps> = ({
  gameState,
  settings,
  activeModal,
  onSelectTool,
  onSelectSeed,
  onOpenModal,
  onToggleMusic,
  onNextTrack,
  onToggleMute,
  onOpenFireInfo,
  onOpenRomance,
  onSecretAdminTrigger,
}) => {
  const secretClickRef = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [openGroup, setOpenGroup] = useState<DockMenuGroupId | null>(null);

  useEffect(() => {
    if (!openGroup) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpenGroup(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [openGroup]);

  useEffect(() => {
    if (activeModal !== 'none') {
      setOpenGroup(null);
    }
  }, [activeModal]);

  const handleFarmNameSecretClick = () => {
    if (!import.meta.env.DEV || !onSecretAdminTrigger) return;
    const now = Date.now();
    const prev = secretClickRef.current;
    const nextCount = now - prev.lastAt <= 2000 ? prev.count + 1 : 1;
    if (nextCount >= 5) {
      secretClickRef.current = { count: 0, lastAt: 0 };
      onSecretAdminTrigger();
    } else {
      secretClickRef.current = { count: nextCount, lastAt: now };
    }
  };
  const neededXp = xpRequiredForLevel(gameState.level);
  const xpPct = gameState.level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((gameState.xp / Math.max(1, neededXp)) * 100));
  const weatherMeta = WEATHER_META[gameState.weather];
  const currentTrack = MIDI_TRACKS[settings.currentTrackIndex % MIDI_TRACKS.length];

  const ownedSeedItems = CATALOG.filter((item) => (gameState.seeds[item.id] || 0) > 0);
  const plantableSeedItems = ownedSeedItems.filter(
    (item) => item.category === 'crop' || item.category === 'mushroom' || item.category === 'tree'
  );
  const buildableDecorItems = ownedSeedItems.filter(
    (item) => item.category === 'decoration' || item.category === 'animal'
  );
  const totalInventoryCount = Object.values(gameState.inventory).reduce((a, b) => a + b, 0);
  const totalBackpackCount =
    totalInventoryCount +
    Object.values(gameState.seeds).reduce((a, b) => a + b, 0) +
    gameState.fertilizerCount;
  const totalShopStock = Object.values(gameState.farmShop?.stock || {}).reduce((a, b) => a + b, 0);

  const fishingUnlocked = gameState.level >= FISHING_UNLOCK_LEVEL;
  const readyQuestsCount =
    (isTutorialFinished(gameState)
      ? gameState.quests.active.filter((q) => q.progress >= q.target).length
      : 0) + getReadyMilestonesCount(gameState);
  const selectedSeedColor = CATALOG_BY_ID[gameState.selectedSeedId]?.pixelColor || '#4ade80';
  const canTierMeta = WATERING_CAN_TIERS[gameState.wateringCanTier || 1];
  const dayNight = getDayNightAtmosphere(gameState.ingameMinutes);
  const psyRemainingMs = gameState.mushroomEffect?.psychedelicRemainingMs ?? 0;
  const luckRemainingMs = gameState.mushroomEffect?.luckBuffRemainingMs ?? 0;
  const feastRemainingMs = gameState.feastBuff?.remainingMs ?? 0;
  const feastDishName = gameState.feastBuff?.dishName || 'Festmahl';
  const workersList = gameState.workers || [];
  const maxWorkers = getMaxWorkersForLevel(gameState.level);
  const workersUnlocked = gameState.level >= WORKERS_UNLOCK_LEVEL;
  const hasStrikingWorker = workersList.some((w) => w.onStrike);
  const dayInSeason = getDayInSeason(gameState.day);
  const fairKey = getSeasonFairKey(gameState.day, gameState.season);
  const fairReadyToday =
    dayInSeason === DAYS_PER_SEASON &&
    !(gameState.villageFair?.judgedSeasonKeys || []).includes(fairKey);
  const almanacBonuses = getAlmanacBonuses(gameState.almanac);
  const openBoardOrders = (gameState.villageBoard?.orders || []).filter((o) => !o.completed).length;
  const mineFloor = gameState.mine?.currentFloor ?? 1;
  const mineUnlockedFloor = gameState.mine?.unlockedFloor ?? 1;
  const hasPendingMail = Boolean(gameState.mailbox?.pendingMail);
  const craftingCount = gameState.craftingJobs?.length || 0;
  const ownedBusinessCount = gameState.villageBusinesses?.ownedIds?.length || 0;
  const brokenBusinessIds = Object.keys(gameState.villageBusinesses?.brokenById || {});
  const brokenBusinessCount = brokenBusinessIds.length;
  const parkOwned = Boolean(gameState.themePark?.owned);
  const parkAttractionsCount = gameState.themePark?.attractions?.length || 0;
  const hasParkBreakdown = Boolean(gameState.themePark?.breakdown);
  const repairAlertCount = brokenBusinessCount + (hasParkBreakdown ? 1 : 0);
  const crashedCount = gameState.marketCrashedItems?.length || 0;
  const pendingRomanceSpark = gameState.romance?.pendingSpark || null;
  const sparkCandidateSpec = pendingRomanceSpark
    ? ROMANCE_CANDIDATE_BY_ID[pendingRomanceSpark.candidateId]
    : null;
  const marriageReady =
    gameState.romance?.status === 'crush' && (gameState.romance?.affection || 0) >= 100;
  const romanceAlertCount = (pendingRomanceSpark ? 1 : 0) + (marriageReady ? 1 : 0);

  const tools: { id: ToolType; label: string; keyHint: string; icon: React.ReactNode; locked?: boolean; tooltip?: string }[] = [
    {
      id: 'hand',
      label: 'Ernten',
      keyHint: settings.keybinds.toolHand,
      icon: <PixelToolIcon tool="hand" />,
    },
    {
      id: 'hoe',
      label: 'Acker',
      keyHint: settings.keybinds.toolHoe,
      icon: <PixelToolIcon tool="hoe" />,
    },
    {
      id: 'water',
      label: 'Gießen',
      keyHint: settings.keybinds.toolWater,
      icon: <PixelToolIcon tool="water" wateringCanTier={gameState.wateringCanTier || 1} />,
      tooltip: `Gießkanne (${canTierMeta.reachLabel})`,
    },
    {
      id: 'fertilize',
      label: `Dünger (${gameState.fertilizerCount})`,
      keyHint: settings.keybinds.toolFertilize,
      icon: <PixelToolIcon tool="fertilize" />,
    },
    {
      id: 'plant',
      label: 'Säen',
      keyHint: settings.keybinds.toolPlant,
      icon: <PixelToolIcon tool="plant" seedColor={selectedSeedColor} />,
    },
    {
      id: 'build',
      label: 'Bau',
      keyHint: settings.keybinds.toolBuild || '9',
      icon: <PixelToolIcon tool="build" />,
    },
    {
      id: 'move',
      label: 'Bewegen',
      keyHint: '8',
      icon: <PixelToolIcon tool="move" />,
      tooltip: 'Dekoobjekt auf dem Hof anklicken und direkt auf ein freies Feld verschieben [8]',
    },
    {
      id: 'remove',
      label: 'Räumen',
      keyHint: settings.keybinds.toolRemove,
      icon: <PixelToolIcon tool="remove" />,
    },
    {
      id: 'fishing',
      label: fishingUnlocked ? 'Angel' : `Angel (${FISHING_UNLOCK_LEVEL})`,
      keyHint: '7',
      icon: fishingUnlocked ? <PixelToolIcon tool="fishing" /> : <Lock className="w-3.5 h-3.5" />,
      locked: !fishingUnlocked,
      tooltip: fishingUnlocked
        ? `Angel (Lvl ${gameState.fishing.level}) — Laufe zum Fluss am rechten Rand und klicke ins Wasser!`
        : `Angeln wird ab Hof-Level ${FISHING_UNLOCK_LEVEL} freigeschaltet`,
    },
  ];

  return (
    <>
      {/* TOP HUD BAR */}
      <header className="fixed top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-xl px-3 py-2 shadow-lg">
          <button
            onClick={() => onOpenModal('avatar')}
            title="Pixel-Avatar anpassen"
            className="rounded-lg overflow-hidden border-2 border-[#8f7758] hover:border-amber-600 transition-colors shrink-0"
          >
            <PixelAvatarCanvas avatar={gameState.avatar} size={44} />
          </button>

          <div className="min-w-[140px]">
            <div className="flex items-center gap-2 text-sm font-display font-bold text-[#2b2118]">
              <span
                onClick={import.meta.env.DEV ? handleFarmNameSecretClick : undefined}
                className="truncate max-w-[130px] select-none"
              >
                {gameState.avatar.farmName}
              </span>
              <span className="text-[#8f7758]" aria-hidden="true">·</span>
              <span className="font-mono-num text-emerald-800 whitespace-nowrap">
                Lvl {gameState.level}/{MAX_LEVEL}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="w-28 h-2 bg-[#e2d6c1] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 transition-all duration-200" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="font-mono-num text-[11px] text-[#5c4632] whitespace-nowrap">
                {gameState.level >= MAX_LEVEL ? 'MAX' : `${gameState.xp}/${neededXp} XP`}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-[#d6c7ae] mx-1" />

          <div className="flex items-center gap-1.5 pr-1">
            <Coins className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-mono-num text-base font-bold text-[#2b2118] whitespace-nowrap">
              {gameState.coins.toLocaleString('de-DE')}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3 bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-xl px-3.5 py-2 shadow-lg text-xs text-[#2b2118]">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="w-4 h-4 text-[#6e4a2e] shrink-0" />
            <span className="font-display font-bold">{SEASON_LABELS[gameState.season]}</span>
            <span className="text-[#8f7758]" aria-hidden="true">·</span>
            <span className="font-mono-num font-semibold">
              Tag {gameState.day} ({dayInSeason}/{DAYS_PER_SEASON})
            </span>
            <span className="text-[#8f7758]" aria-hidden="true">·</span>
            <span className="font-mono-num font-bold text-[#4a321f]" title="1 Ingame-Tag = 2 Stunden Echtzeit">
              {formatIngameTime(gameState.ingameMinutes)}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#efe6d5] text-[#4a321f] font-semibold text-[11px]">
              <DayPhaseIcon phase={dayNight.phase} />
              <span>{dayNight.phaseLabel}</span>
            </span>
          </div>

          <div className="h-5 w-px bg-[#d6c7ae]" />

          <div className="flex items-center gap-2 whitespace-nowrap">
            <WeatherIcon weather={gameState.weather} />
            <span className="font-semibold">{weatherMeta.label}</span>
            <span className="hidden xl:inline text-[#5c4632]">— {weatherMeta.effectText}</span>
          </div>

          {psyRemainingMs > 0 && (
            <>
              <div className="h-5 w-px bg-[#d6c7ae]" />
              <span
                title="Gleich danach startet dein 15-Minuten-Glückseffekt!"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-fuchsia-100 text-fuchsia-800 font-semibold whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Pilz-Traum {Math.ceil(psyRemainingMs / 1000)}s</span>
              </span>
            </>
          )}

          {psyRemainingMs <= 0 && luckRemainingMs > 0 && (
            <>
              <div className="h-5 w-px bg-[#d6c7ae]" />
              <span
                title="Erfolgreicheres Angeln & +20 % Chance auf doppelte Ernte & doppelten Fisch!"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold font-mono-num whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Pilz-Glück {formatDurationMs(luckRemainingMs)} (+20%)</span>
              </span>
            </>
          )}

          {feastRemainingMs > 0 && (
            <>
              <div className="h-5 w-px bg-[#d6c7ae]" />
              <span
                title={`${feastDishName}: +25 % Lauftempo & +20 % schnelleres Wachstum und Handwerk!`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold font-mono-num whitespace-nowrap"
              >
                <Flame className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>Festmahl {formatDurationMs(feastRemainingMs)} (+25% Lauf / +20% Tempo)</span>
              </span>
            </>
          )}

          {(gameState.fishingBaitCharges || 0) > 0 && (
            <>
              <div className="h-5 w-px bg-[#d6c7ae]" />
              <span
                title="Profi-Angelköder vom Wanderhändler: erhöht Bisschance, Tempo & Seltenheit!"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-semibold font-mono-num whitespace-nowrap"
              >
                <Fish className="w-3.5 h-3.5 shrink-0" />
                <span>Köder ×{gameState.fishingBaitCharges}</span>
              </span>
            </>
          )}

          {gameState.villageFire?.active && (
            <>
              <div className="h-5 w-px bg-[#d6c7ae]" />
              <button
                type="button"
                onClick={() => onOpenFireInfo?.()}
                title={`Brand im Dorfhaus „${gameState.villageFire.houseName}“! Klicken für Einsatzdetails & Hilfs-Optionen.`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold whitespace-nowrap transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-orange-600 animate-pulse shrink-0" />
                <span>Feuerwehr: {gameState.villageFire.houseName}</span>
              </button>
            </>
          )}

          {repairAlertCount > 0 && (
            <>
              <div className="h-5 w-px bg-[#d6c7ae]" />
              <button
                type="button"
                onClick={() => onOpenModal(brokenBusinessCount > 0 ? 'village_business' : 'theme_park')}
                title="Betrieb oder Abenteuerpark pausiert bis zur Reparatur — klicken zum Beheben"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold whitespace-nowrap transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                <span>Störung ({repairAlertCount})</span>
              </button>
            </>
          )}

          {crashedCount > 0 && (
            <>
              <div className="h-5 w-px bg-[#d6c7ae]" />
              <button
                type="button"
                onClick={() => onOpenModal('market')}
                title="Markt-Preissturz (-30 % Erlös) bei ausgewählten Produkten"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold whitespace-nowrap transition-colors"
              >
                <Coins className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                <span>Preissturz ({crashedCount})</span>
              </button>
            </>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2 bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-xl px-3 py-1.5 shadow-lg">
          <button
            onClick={onToggleMusic}
            title={settings.musicPlaying ? 'Musik pausieren' : 'Musik abspielen'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#2b2118] hover:bg-[#ede2cf] transition-colors whitespace-nowrap shrink-0"
          >
            <Music className="w-4 h-4 text-emerald-700" />
            <span className="hidden md:inline max-w-[140px] truncate">
              {settings.musicPlaying && !settings.muted ? currentTrack.title : 'Musik pausiert'}
            </span>
          </button>

          <button
            onClick={onNextTrack}
            title="Nächstes ruhiges MIDI-Stück"
            className="p-2 rounded-lg text-[#4a321f] hover:bg-[#ede2cf] transition-colors shrink-0"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleMute}
            title={settings.muted ? 'Ton einschalten' : 'Stummschalten'}
            className="p-2 rounded-lg text-[#4a321f] hover:bg-[#ede2cf] transition-colors shrink-0"
          >
            {settings.muted ? <VolumeX className="w-4 h-4 text-rose-700" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div className="h-5 w-px bg-[#d6c7ae]" />

          <button
            onClick={() => onOpenModal('options')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4a321f] text-[#faf6ee] text-xs font-semibold hover:bg-[#3a2617] transition-colors whitespace-nowrap shrink-0"
          >
            <Settings className="w-4 h-4" />
            <span>Optionen</span>
          </button>
        </div>
      </header>

      {/* DISASTER WARNING BANNER */}
      {gameState.disasterWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 bg-amber-950/95 text-amber-50 border-2 border-amber-400 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3 max-w-xl">
          <CloudLightning className="w-5 h-5 text-amber-300 shrink-0" />
          <div className="text-xs leading-snug">
            <div className="font-display font-bold text-sm">
              {gameState.disasterWarning.title} · {gameState.disasterWarning.severityLabel} ({Math.ceil(gameState.disasterWarning.countdownMs / 1000)}s)
            </div>
            <div className="text-amber-100">{gameState.disasterWarning.message}</div>
          </div>
        </div>
      )}

      {/* ROMANCE SPARK BANNER (LEVEL 80+) */}
      {!gameState.disasterWarning && pendingRomanceSpark && sparkCandidateSpec && (
        <button
          type="button"
          onClick={() => onOpenRomance?.()}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-20 bg-rose-950/95 hover:bg-rose-900 text-rose-50 border-2 border-rose-400 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3 max-w-xl text-left transition-colors"
        >
          <Heart className="w-5 h-5 text-rose-300 fill-rose-400 shrink-0" />
          <div className="text-xs leading-snug">
            <div className="font-display font-bold text-sm">
              Herzklopfen-Moment mit {sparkCandidateSpec.name}!
            </div>
            <div className="text-rose-100">
              Ausgelöst bei „{pendingRomanceSpark.eventLabel}“ — Klicken zum Kennenlernen oder Antworten
            </div>
          </div>
        </button>
      )}

      {/* BOTTOM ACTION DOCK */}
      <footer className="fixed bottom-3 left-3 right-3 z-20 flex flex-col items-center gap-2 pointer-events-none">
        {gameState.selectedTool === 'plant' && (
          <div className="pointer-events-auto flex items-center gap-1.5 bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-xl px-2.5 py-2 shadow-lg max-w-[95vw] overflow-x-auto">
            {plantableSeedItems.length === 0 ? (
              <div className="flex items-center gap-3 px-2 text-xs text-[#5c4632]">
                <span>Kein Saatgut, Pilze oder Obstbäume im Vorrat.</span>
                <button
                  onClick={() => onOpenModal('market')}
                  className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 whitespace-nowrap"
                >
                  Saatgut kaufen
                </button>
              </div>
            ) : (
              plantableSeedItems.map((item) => {
                const count = gameState.seeds[item.id] || 0;
                const active = gameState.selectedSeedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSeed(item.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                      active
                        ? 'bg-[#4a321f] text-[#faf6ee] border-[#2b2118]'
                        : 'bg-[#f1e9da] text-[#2b2118] border-[#d6c7ae] hover:bg-[#e5d9c3]'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-xs shrink-0 border border-black/20"
                      style={{ backgroundColor: item.pixelColor }}
                    />
                    <span>{item.name}</span>
                    <span className="font-mono-num opacity-80">×{count}</span>
                  </button>
                );
              })
            )}
            <button
              onClick={() => onOpenModal('inventory')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e3d5be] text-[#2b2118] border border-[#cbb799] text-xs font-semibold whitespace-nowrap shrink-0"
              title="Alle Saatgut-Vorräte im Inventar ansehen [I]"
            >
              <Backpack className="w-3.5 h-3.5 text-[#6e4a2e]" />
              <span>Inventar [I]</span>
            </button>
          </div>
        )}

        {gameState.selectedTool === 'build' && (
          <div className="pointer-events-auto flex items-center gap-1.5 bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-xl px-2.5 py-2 shadow-lg max-w-[95vw] overflow-x-auto">
            {buildableDecorItems.length === 0 ? (
              <div className="flex items-center gap-3 px-2 text-xs text-[#5c4632]">
                <span>Keine Deko oder Tiere im Bauvorrat.</span>
                <button
                  onClick={() => onOpenModal('market')}
                  className="px-3 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 whitespace-nowrap"
                >
                  Deko & Tiere auf dem Markt kaufen
                </button>
              </div>
            ) : (
              buildableDecorItems.map((item) => {
                const count = gameState.seeds[item.id] || 0;
                const active = gameState.selectedSeedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSeed(item.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                      active
                        ? 'bg-[#4a321f] text-[#faf6ee] border-[#2b2118]'
                        : 'bg-[#f1e9da] text-[#2b2118] border-[#d6c7ae] hover:bg-[#e5d9c3]'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-xs shrink-0 border border-black/20"
                      style={{ backgroundColor: item.pixelColor }}
                    />
                    <span>{item.name}</span>
                    <span className="font-mono-num opacity-80">×{count}</span>
                  </button>
                );
              })
            )}
            <button
              onClick={() => onOpenModal('inventory')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e3d5be] text-[#2b2118] border border-[#cbb799] text-xs font-semibold whitespace-nowrap shrink-0"
              title="Alle Dekoartikel & Tiere im Inventar ansehen [I]"
            >
              <Backpack className="w-3.5 h-3.5 text-[#6e4a2e]" />
              <span>Inventar [I]</span>
            </button>
          </div>
        )}

        {/* Main Compact Bottom Dock: 9 Tools + Inventar + Bauernmarkt + 3 Category Drawers */}
        <div
          ref={dockRef}
          className="pointer-events-auto relative flex flex-wrap items-center justify-center gap-1.5 bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-xl px-2.5 py-2 shadow-xl max-w-[98vw]"
        >
          {/* Compact 9-Tool Strip */}
          <div className="flex flex-wrap items-center justify-center gap-1">
            {tools.map((t) => {
              const active = gameState.selectedTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.locked) return;
                    setOpenGroup(null);
                    onSelectTool(t.id);
                  }}
                  title={t.tooltip}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    t.locked
                      ? 'bg-[#e6dcc9] text-[#8f7758] opacity-75 cursor-not-allowed'
                      : active
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-[#efe6d5] text-[#2b2118] hover:bg-[#e3d5be]'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  {!t.locked && <span className="font-mono-num text-[10px] opacity-70 uppercase">[{t.keyHint}]</span>}
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-[#d6c7ae] mx-0.5 hidden xl:block" />

          {/* 2 Direct Primary Buttons + 3 Organized Logic Categories */}
          {(() => {
            const handleOpenFromDock = (modal: ModalType) => {
              setOpenGroup(null);
              onOpenModal(activeModal === modal ? 'none' : modal);
            };

            const farmModals: ModalType[] = ['craft', 'shop', 'house', 'pet', 'workers', 'mailbox'];
            const worldModals: ModalType[] = [
              'merchant',
              'village_board',
              'neighbors',
              'mine',
              'village_business',
              'theme_park',
            ];
            const goalModals: ModalType[] = ['quests', 'events', 'fair', 'almanac'];

            const isFarmActive = farmModals.includes(activeModal);
            const isWorldActive = worldModals.includes(activeModal);
            const isGoalActive = goalModals.includes(activeModal);

            const farmAlertCount =
              (hasStrikingWorker ? 1 : 0) + (hasPendingMail ? 1 : 0) + craftingCount;
            const worldAlertCount =
              openBoardOrders + (gameState.merchant?.active ? 1 : 0) + romanceAlertCount + repairAlertCount;
            const goalAlertCount = readyQuestsCount + (fairReadyToday ? 1 : 0);

            type MenuEntry = {
              modal: ModalType;
              label: string;
              detail: string;
              icon: React.ReactNode;
              badge?: string;
              tone?: 'amber' | 'emerald' | 'rose';
            };

            const farmEntries: MenuEntry[] = [
              {
                modal: 'craft',
                label: 'Veredelung',
                detail: craftingCount > 0 ? `${craftingCount} in Arbeit` : 'Käserei, Mühle & Küche',
                icon: <ChefHat className="w-4 h-4 text-orange-700" />,
                badge: craftingCount > 0 ? String(craftingCount) : undefined,
                tone: craftingCount > 0 ? 'amber' : undefined,
              },
              {
                modal: 'shop',
                label: 'Hofladen',
                detail: `${gameState.farmShop.visitorsToday}/${gameState.farmShop.dailyTargetVisitors} Besucher · ${totalShopStock} im Regal`,
                icon: <Store className="w-4 h-4 text-rose-700" />,
                badge: totalShopStock > 0 ? String(totalShopStock) : undefined,
              },
              {
                modal: 'house',
                label: 'Bauernhaus',
                detail: `${gameState.house.floors}. Etage · Ausbau & Extras`,
                icon: <Home className="w-4 h-4 text-[#6e4a2e]" />,
              },
              {
                modal: 'pet',
                label: `${gameState.pet.name} (Haustier)`,
                detail: `Level ${gameState.pet.level} · Pflegen & Wechseln`,
                icon: <PawPrint className="w-4 h-4 text-rose-700" />,
              },
              {
                modal: 'workers',
                label: 'Personal',
                detail: hasStrikingWorker
                  ? 'Achtung: Personal im Streik!'
                  : workersUnlocked
                  ? `${workersList.length}/${maxWorkers} angestellt`
                  : `Ab Level ${WORKERS_UNLOCK_LEVEL}`,
                icon: workersUnlocked ? (
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Lock className="w-4 h-4 text-[#8f7758]" />
                ),
                badge: hasStrikingWorker ? '!' : workersUnlocked ? `${workersList.length}/${maxWorkers}` : undefined,
                tone: hasStrikingWorker ? 'rose' : undefined,
              },
              {
                modal: 'mailbox',
                label: 'Briefkasten & Tagesblatt',
                detail: hasPendingMail ? 'Neue Tagespost & Belohnung warten!' : 'Post & Zeitungsarchiv',
                icon: <Mail className="w-4 h-4 text-amber-700" />,
                badge: hasPendingMail ? 'Neu!' : undefined,
                tone: hasPendingMail ? 'emerald' : undefined,
              },
            ];

            const worldEntries: MenuEntry[] = [
              {
                modal: 'merchant',
                label: 'Wanderhändler Bruno',
                detail: gameState.merchant?.active ? 'Steht jetzt an der Süd-Brücke!' : 'Seltene Deko & Elixiere',
                icon: <Compass className={`w-4 h-4 ${gameState.merchant?.active ? 'text-amber-700' : 'text-[#8f7758]'}`} />,
                badge: gameState.merchant?.active ? 'Da!' : undefined,
                tone: gameState.merchant?.active ? 'amber' : undefined,
              },
              {
                modal: 'village_board',
                label: 'Schwarzes Brett',
                detail: openBoardOrders > 0 ? `${openBoardOrders}/3 Dorf-Bestellungen offen` : 'Alle Bestellungen erledigt',
                icon: <ClipboardList className="w-4 h-4 text-amber-700" />,
                badge: openBoardOrders > 0 ? String(openBoardOrders) : undefined,
                tone: openBoardOrders > 0 ? 'emerald' : undefined,
              },
              {
                modal: 'neighbors',
                label: `Nachbarn & Liebe [${settings.keybinds.openNeighbors.toUpperCase()}]`,
                detail: pendingRomanceSpark && sparkCandidateSpec
                  ? `Herzklopfen: ${sparkCandidateSpec.name} wartet!`
                  : marriageReady
                  ? '100 % Zuneigung — Hochzeitsantrag möglich!'
                  : 'Freundschaft, Bitten & Herzenssache',
                icon: <Users className="w-4 h-4 text-sky-700" />,
                badge: romanceAlertCount > 0 ? '!' : undefined,
                tone: romanceAlertCount > 0 ? 'rose' : undefined,
              },
              {
                modal: 'mine',
                label: 'Alte Waldmine',
                detail: `Ebene ${mineFloor} (Rekord ${mineUnlockedFloor}) · Schmiede`,
                icon: <Mountain className="w-4 h-4 text-slate-700" />,
                badge: `Eb.${mineFloor}`,
              },
              {
                modal: 'village_business',
                label: 'Westviertel-Betriebe',
                detail:
                  brokenBusinessCount > 0
                    ? `Achtung: ${brokenBusinessCount} Betrieb(e) gestört — Reparatur nötig!`
                    : gameState.level >= VILLAGE_BUSINESS_UNLOCK_LEVEL
                    ? `Bäckerei, Supermarkt, Zulieferer, Molkerei & Export (${ownedBusinessCount}/${VILLAGE_BUSINESSES.length})`
                    : `Kauf ab Hof-Level ${VILLAGE_BUSINESS_UNLOCK_LEVEL}`,
                icon: <Building2 className={`w-4 h-4 ${brokenBusinessCount > 0 ? 'text-rose-700' : 'text-[#6e4a2e]'}`} />,
                badge: brokenBusinessCount > 0 ? '!' : `${ownedBusinessCount}/${VILLAGE_BUSINESSES.length}`,
                tone: brokenBusinessCount > 0 ? 'rose' : ownedBusinessCount > 0 ? 'emerald' : undefined,
              },
              {
                modal: 'theme_park',
                label: 'Abenteuerpark Sonnental',
                detail: hasParkBreakdown
                  ? 'Park-Panne! Betrieb pausiert bis Reparatur'
                  : parkOwned
                  ? `Eröffnet · ${parkAttractionsCount}/${THEME_PARK_ATTRACTIONS.length} Attraktionen`
                  : gameState.level >= THEME_PARK_UNLOCK_LEVEL
                  ? 'Freizeitpark zum Kauf bereit!'
                  : `Ab Hof-Level ${THEME_PARK_UNLOCK_LEVEL}`,
                icon: <FerrisWheel className={`w-4 h-4 ${hasParkBreakdown ? 'text-rose-700' : 'text-rose-600'}`} />,
                badge: hasParkBreakdown
                  ? '!'
                  : parkOwned
                  ? `${parkAttractionsCount}/${THEME_PARK_ATTRACTIONS.length}`
                  : `Lvl ${THEME_PARK_UNLOCK_LEVEL}`,
                tone: hasParkBreakdown ? 'rose' : parkOwned ? 'emerald' : undefined,
              },
            ];

            const goalEntries: MenuEntry[] = [
              {
                modal: 'quests',
                label: 'Quests & Meilensteine',
                detail: readyQuestsCount > 0 ? `${readyQuestsCount} Belohnung(en) abholbereit!` : 'Aufgaben & Hof-Ziele',
                icon: <ScrollText className="w-4 h-4 text-amber-700" />,
                badge: readyQuestsCount > 0 ? String(readyQuestsCount) : undefined,
                tone: readyQuestsCount > 0 ? 'emerald' : undefined,
              },
              {
                modal: 'events',
                label: `Saison-Event [${settings.keybinds.openEvents.toUpperCase()}]`,
                detail: `${SEASON_LABELS[gameState.season]}-Trophäen & Punkte`,
                icon: <Trophy className="w-4 h-4 text-amber-600" />,
              },
              {
                modal: 'fair',
                label: 'Saison-Dorffest',
                detail: fairReadyToday
                  ? 'Heute geöffnet! Hof bewerten lassen'
                  : `Immer an Saisontag ${DAYS_PER_SEASON}/${DAYS_PER_SEASON}`,
                icon: <Award className={`w-4 h-4 ${fairReadyToday ? 'text-amber-700' : 'text-[#6e4a2e]'}`} />,
                badge: fairReadyToday ? 'Heute!' : undefined,
                tone: fairReadyToday ? 'amber' : undefined,
              },
              {
                modal: 'almanac',
                label: 'Hof-Almanach',
                detail: `${almanacBonuses.unlockedCount}/${almanacBonuses.totalCount} Einträge & Fisch-Rekorde`,
                icon: <BookOpen className="w-4 h-4 text-emerald-700" />,
                badge: `${almanacBonuses.unlockedCount}/${almanacBonuses.totalCount}`,
              },
            ];

            const renderCategoryDropdown = (
              groupId: DockMenuGroupId,
              entries: MenuEntry[],
              alignClass: string
            ) => {
              if (openGroup !== groupId) return null;
              return (
                <div
                  role="menu"
                  className={`absolute bottom-full mb-2.5 ${alignClass} w-72 max-w-[92vw] max-h-[65vh] overflow-y-auto bg-[#faf6ee] border-2 border-[#4a321f] rounded-xl shadow-2xl p-1.5 space-y-1 z-30`}
                >
                  {entries.map((entry) => {
                    const isActive = activeModal === entry.modal;
                    return (
                      <button
                        key={entry.modal}
                        role="menuitem"
                        onClick={() => handleOpenFromDock(entry.modal)}
                        className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                          isActive
                            ? 'bg-[#4a321f] text-[#faf6ee]'
                            : 'hover:bg-[#efe6d5] text-[#2b2118]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-white/15' : 'bg-[#f1e9da] border border-[#d6c7ae]'
                            }`}
                          >
                            {entry.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-display font-bold truncate">
                              {entry.label}
                            </div>
                            <div
                              className={`text-[10px] truncate ${
                                isActive
                                  ? 'text-[#e7d7bf]'
                                  : entry.tone === 'rose'
                                  ? 'text-rose-700 font-semibold'
                                  : 'text-[#6e5a44]'
                              }`}
                            >
                              {entry.detail}
                            </div>
                          </div>
                        </div>
                        {entry.badge && (
                          <span
                            className={`font-mono-num text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : entry.tone === 'rose'
                                ? 'bg-rose-600 text-white'
                                : entry.tone === 'emerald'
                                ? 'bg-emerald-700 text-white'
                                : entry.tone === 'amber'
                                ? 'bg-amber-600 text-white'
                                : 'bg-[#e2d6c1] text-[#3d291a]'
                            }`}
                          >
                            {entry.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            };

            return (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {/* Direct Button 1: Inventar */}
                <button
                  onClick={() => handleOpenFromDock('inventory')}
                  title="Rucksack & Hof-Lager öffnen [I]"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeModal === 'inventory'
                      ? 'bg-emerald-800 text-white ring-2 ring-emerald-300'
                      : 'bg-emerald-700 text-white hover:bg-emerald-800'
                  }`}
                >
                  <Backpack className="w-3.5 h-3.5" />
                  <span>Inventar [I]</span>
                  {totalBackpackCount > 0 && (
                    <span className="font-mono-num bg-emerald-950/40 px-1.5 py-0.5 rounded text-[10px]">
                      {totalBackpackCount}
                    </span>
                  )}
                </button>

                {/* Direct Button 2: Bauernmarkt */}
                <button
                  onClick={() => handleOpenFromDock('market')}
                  title={`Bauernmarkt öffnen: Saatgut, Tiere, Preise & Hof-Erweiterung [${settings.keybinds.openMarket.toUpperCase()}]`}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeModal === 'market'
                      ? 'bg-amber-700 text-white ring-2 ring-amber-300'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Bauernmarkt [{settings.keybinds.openMarket.toUpperCase()}]</span>
                  {totalInventoryCount > 0 && (
                    <span className="font-mono-num bg-amber-950/35 px-1.5 py-0.5 rounded text-[10px]">
                      {totalInventoryCount}
                    </span>
                  )}
                </button>

                {/* Category 1: Hof & Team */}
                <div className="relative">
                  {renderCategoryDropdown('farm', farmEntries, 'left-0 sm:left-1/2 sm:-translate-x-1/2')}
                  <button
                    aria-expanded={openGroup === 'farm'}
                    onClick={() => setOpenGroup((g) => (g === 'farm' ? null : 'farm'))}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      openGroup === 'farm' || isFarmActive
                        ? 'bg-[#4a321f] text-[#faf6ee]'
                        : 'bg-[#efe6d5] text-[#2b2118] hover:bg-[#e3d5be]'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Hof &amp; Team</span>
                    {farmAlertCount > 0 && (
                      <span
                        className={`font-mono-num px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          hasStrikingWorker
                            ? 'bg-rose-600 text-white'
                            : hasPendingMail
                            ? 'bg-emerald-700 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {hasStrikingWorker ? '!' : farmAlertCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${openGroup === 'farm' ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {/* Category 2: Dorf & Welt */}
                <div className="relative">
                  {renderCategoryDropdown('world', worldEntries, 'left-1/2 -translate-x-1/2')}
                  <button
                    aria-expanded={openGroup === 'world'}
                    onClick={() => setOpenGroup((g) => (g === 'world' ? null : 'world'))}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      openGroup === 'world' || isWorldActive
                        ? 'bg-[#4a321f] text-[#faf6ee]'
                        : 'bg-[#efe6d5] text-[#2b2118] hover:bg-[#e3d5be]'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Dorf &amp; Welt</span>
                    {worldAlertCount > 0 && (
                      <span
                        className={`font-mono-num px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                          repairAlertCount > 0 || romanceAlertCount > 0 ? 'bg-rose-600' : 'bg-emerald-700'
                        }`}
                      >
                        {worldAlertCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${openGroup === 'world' ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {/* Category 3: Ziele & Feste */}
                <div className="relative">
                  {renderCategoryDropdown('goals', goalEntries, 'right-0')}
                  <button
                    aria-expanded={openGroup === 'goals'}
                    onClick={() => setOpenGroup((g) => (g === 'goals' ? null : 'goals'))}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      openGroup === 'goals' || isGoalActive
                        ? 'bg-[#4a321f] text-[#faf6ee]'
                        : fairReadyToday
                        ? 'bg-amber-100 text-amber-950 border border-amber-400 hover:bg-amber-200'
                        : 'bg-[#efe6d5] text-[#2b2118] hover:bg-[#e3d5be]'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Ziele &amp; Feste</span>
                    {goalAlertCount > 0 && (
                      <span
                        className={`font-mono-num px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                          fairReadyToday ? 'bg-amber-600' : 'bg-emerald-700'
                        }`}
                      >
                        {goalAlertCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${openGroup === 'goals' ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </footer>
    </>
  );
};
