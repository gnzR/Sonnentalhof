import React, { useEffect, useState } from 'react';
import {
  Clock,
  CloudSun,
  Coins,
  Flame,
  Hammer,
  Heart,
  Maximize2,
  Play,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  TrendingUp,
  X,
} from 'lucide-react';
import { MAX_LEVEL, SEASON_LABELS, WEATHER_META } from '../data/catalog';
import {
  GAME_EVENT_CATEGORY_LABELS,
  GAME_EVENTS,
  GameEventCategory,
  GameEventContext,
  GameEventDefinition,
} from '../events/eventRegistry';
import { formatDurationMs, formatIngameTime } from '../engine/gameLogic';
import { GameState, Season, WeatherType } from '../types/game';

export type AdminSandboxPresetId = 'industry' | 'theme_park' | 'max_farm';

interface AdminEventModalProps {
  gameState: GameState;
  eventContext: GameEventContext;
  onClose: () => void;
  onSetTimeOfDay: (minutes: number, advanceOneDay?: boolean) => void;
  onFinishActiveFireNow: () => void;
  onGrantCoins: (amount: number) => void;
  onSetLevel: (targetLevel: number, syncPetAndFishing: boolean) => void;
  onSetSeason: (season: Season) => void;
  onSetWeather: (weather: WeatherType) => void;
  onInstantHarvestReady: () => void;
  onUnlockAllLand: () => void;
  onRefillSuppliesAndStamina: () => void;
  onApplyPreset: (preset: AdminSandboxPresetId) => void;
  onTriggerRomanceSpark: () => void;
  onMaxRomanceAffection: () => void;
  onMarryPartnerAdmin: () => void;
  onResetRomanceAdmin: () => void;
}

const CATEGORY_ORDER: GameEventCategory[] = ['hof', 'dorf', 'fest'];
const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const WEATHER_ORDER: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'foggy', 'windy', 'stormy', 'frost'];
const LEVEL_MILESTONES: Array<{ level: number; label: string }> = [
  { level: 1, label: 'Lvl 1 (Start)' },
  { level: 15, label: 'Lvl 15 (Angeln)' },
  { level: 18, label: 'Lvl 18 (Personal)' },
  { level: 80, label: 'Lvl 80 (Liebe)' },
  { level: 150, label: 'Lvl 150 (Industrie)' },
  { level: 175, label: 'Lvl 175 (Freizeitpark)' },
  { level: 200, label: 'Lvl 200 (Krise)' },
  { level: MAX_LEVEL, label: `Lvl ${MAX_LEVEL} (Max)` },
];

export const AdminEventModal: React.FC<AdminEventModalProps> = ({
  gameState,
  eventContext,
  onClose,
  onSetTimeOfDay,
  onFinishActiveFireNow,
  onGrantCoins,
  onSetLevel,
  onSetSeason,
  onSetWeather,
  onInstantHarvestReady,
  onUnlockAllLand,
  onRefillSuppliesAndStamina,
  onApplyPreset,
  onTriggerRomanceSpark,
  onMaxRomanceAffection,
  onMarryPartnerAdmin,
  onResetRomanceAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'sandbox'>('events');
  const [closeOnTrigger, setCloseOnTrigger] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<GameEventCategory | 'all'>('all');
  const [coinAmountInput, setCoinAmountInput] = useState('7000000');
  const [levelInput, setLevelInput] = useState(String(gameState.level));
  const [syncPetAndFishing, setSyncPetAndFishing] = useState(true);

  useEffect(() => {
    setLevelInput(String(gameState.level));
  }, [gameState.level]);

  const parsedCoinAmount = (() => {
    const digitsOnly = coinAmountInput.replace(/[^0-9]/g, '');
    if (!digitsOnly) return 0;
    const val = Number.parseInt(digitsOnly, 10);
    return Number.isFinite(val) ? Math.min(999_999_999, Math.max(0, val)) : 0;
  })();

  const parsedLevel = (() => {
    const digitsOnly = levelInput.replace(/[^0-9]/g, '');
    if (!digitsOnly) return 0;
    const val = Number.parseInt(digitsOnly, 10);
    return Number.isFinite(val) ? Math.min(MAX_LEVEL, Math.max(1, val)) : 0;
  })();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleTrigger = (ev: GameEventDefinition) => {
    ev.trigger(eventContext);
    if (closeOnTrigger) {
      onClose();
    }
  };

  const categoriesToShow =
    categoryFilter === 'all' ? CATEGORY_ORDER : CATEGORY_ORDER.filter((c) => c === categoryFilter);

  const fire = gameState.villageFire;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-2xl max-h-[88vh] bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="bg-[#4a321f] px-5 py-4 text-[#faf6ee] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display font-bold text-base leading-tight">
                Admin-Menü · Vorschau Event-Labor
              </h2>
              <p className="text-[11px] text-[#e7d7bf]">
                Nur im Vorschau-Modus aktiv · Wird niemals im fertigen Client ausgeführt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Admin-Menü schließen"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Navigation Tabs: Events & Zeit | Sandbox & Level */}
        <div className="px-5 py-2.5 bg-[#ebe0cb] border-b border-[#d6c7ae] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold inline-flex items-center gap-1.5 transition-colors ${
                activeTab === 'events'
                  ? 'bg-[#4a321f] text-[#faf6ee] shadow-sm'
                  : 'bg-[#faf6ee] text-[#4a321f] border border-[#c7b392] hover:bg-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Events &amp; Zeit ({GAME_EVENTS.length})
            </button>
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold inline-flex items-center gap-1.5 transition-colors ${
                activeTab === 'sandbox'
                  ? 'bg-[#4a321f] text-[#faf6ee] shadow-sm'
                  : 'bg-[#faf6ee] text-[#4a321f] border border-[#c7b392] hover:bg-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Sandbox &amp; Level
            </button>
          </div>

          <div className="hidden sm:block font-mono-num text-[11px] text-[#4a321f]">
            Lvl <strong>{gameState.level}</strong> · <strong>{gameState.coins.toLocaleString('de-DE')} M</strong>
          </div>
        </div>

        {activeTab === 'events' ? (
          <>
            {/* Filter + Option Bar */}
            <div className="px-5 py-3 bg-[#f3ead9] border-b border-[#d6c7ae] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === 'all'
                      ? 'bg-[#6e4a2e] text-[#faf6ee]'
                      : 'bg-[#faf6ee] text-[#4a321f] border border-[#d6c7ae] hover:bg-white'
                  }`}
                >
                  Alle ({GAME_EVENTS.length})
                </button>
                {CATEGORY_ORDER.map((cat) => {
                  const count = GAME_EVENTS.filter((ev) => ev.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        categoryFilter === cat
                          ? 'bg-[#6e4a2e] text-[#faf6ee]'
                          : 'bg-[#faf6ee] text-[#4a321f] border border-[#d6c7ae] hover:bg-white'
                      }`}
                    >
                      {GAME_EVENT_CATEGORY_LABELS[cat]} ({count})
                    </button>
                  );
                })}
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-[#4a321f] font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={closeOnTrigger}
                  onChange={(e) => setCloseOnTrigger(e.target.checked)}
                  className="rounded border-[#8f7758] text-emerald-700 focus:ring-emerald-600"
                />
                Nach Klick direkt schließen
              </label>
            </div>

            {/* Scrollable Event List */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {categoriesToShow.map((cat) => {
                const eventsInCategory = GAME_EVENTS.filter((ev) => ev.category === cat);
                if (eventsInCategory.length === 0) return null;

                return (
                  <section key={cat} className="space-y-2.5">
                    <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#6e4a2e]">
                      {GAME_EVENT_CATEGORY_LABELS[cat]}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {eventsInCategory.map((ev) => {
                        const active = ev.isActive ? ev.isActive(gameState) : false;
                        return (
                          <div
                            key={ev.id}
                            className={`rounded-xl border-2 p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                              active
                                ? 'bg-amber-50 border-amber-500 shadow-sm'
                                : 'bg-white/90 border-[#d6c7ae] hover:border-[#8f7758]'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl leading-none" aria-hidden="true">
                                    {ev.icon}
                                  </span>
                                  <div>
                                    <div className="font-display font-bold text-sm text-[#2b2118]">
                                      {ev.name}
                                    </div>
                                    <div className="font-mono-num text-[10px] text-[#8f7758]">
                                      Event-ID: {ev.id}
                                    </div>
                                  </div>
                                </div>
                                {active && (
                                  <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold uppercase shrink-0">
                                    Läuft
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#5c4632] leading-relaxed">
                                {ev.description}
                              </p>
                            </div>

                            <button
                              onClick={() => handleTrigger(ev)}
                              className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Event auslösen
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {/* Time & Testing Helpers */}
              <section className="pt-3 border-t border-[#d6c7ae] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#6e4a2e] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Zeit- &amp; Test-Helfer für Events
                  </h3>
                  <span className="font-mono-num text-[11px] text-[#5c4632]">
                    Aktuell: Tag {gameState.day} · {formatIngameTime(gameState.ingameMinutes)} Uhr
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => onSetTimeOfDay(22 * 60, false)}
                    className="px-3 py-2 rounded-lg bg-[#efe6d5] hover:bg-[#e5d8c0] border border-[#c7b392] text-xs font-semibold text-[#3d291a] flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Nacht (22:00 Uhr)
                  </button>
                  <button
                    onClick={() => onSetTimeOfDay(597, false)}
                    className="px-3 py-2 rounded-lg bg-[#efe6d5] hover:bg-[#e5d8c0] border border-[#c7b392] text-xs font-semibold text-[#3d291a] flex items-center justify-center gap-1.5"
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                    Vor Post (09:57 Uhr)
                  </button>
                  <button
                    onClick={() => onSetTimeOfDay(597, true)}
                    className="px-3 py-2 rounded-lg bg-[#efe6d5] hover:bg-[#e5d8c0] border border-[#c7b392] text-xs font-semibold text-[#3d291a] flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    +1 Tag (09:57 Uhr)
                  </button>
                </div>

                {fire?.active && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-rose-900">
                      <strong>Aktiver Brand:</strong> {fire.houseName} (Restzeit ca.{' '}
                      {formatDurationMs(fire.remainingMs)})
                    </div>
                    <button
                      onClick={onFinishActiveFireNow}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold inline-flex items-center gap-1.5"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      Brand sofort löschen &amp; Zeitungsbericht vormerken
                    </button>
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          /* Sandbox & Level Tab */
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* 1. Hof-Level Changer */}
            <section className="rounded-xl bg-white border border-[#d6c7ae] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#6e4a2e] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  Hof-Level direkt setzen (1 – {MAX_LEVEL})
                </h3>
                <span className="font-mono-num text-[11px] text-[#5c4632]">
                  Aktuell: <strong>Lvl {gameState.level}</strong> (Angel {gameState.fishing.level} · Tier {gameState.pet.level})
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (parsedLevel >= 1) {
                    onSetLevel(parsedLevel, syncPetAndFishing);
                  }
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Ziel-Level eingeben"
                  value={levelInput}
                  onChange={(e) => setLevelInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={`1 – ${MAX_LEVEL}`}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#faf6ee] border border-[#cbb799] font-mono-num text-sm text-[#2b2118] focus:outline-none focus:border-[#6e4a2e]"
                />
                <button
                  type="submit"
                  disabled={parsedLevel < 1}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-[#d6c7ae] disabled:text-[#6e5a44] text-white text-xs font-display font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  {parsedLevel >= 1 ? `Auf Level ${parsedLevel} setzen` : 'Level eingeben'}
                </button>
              </form>

              <label className="inline-flex items-center gap-2 text-xs text-[#4a321f] font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncPetAndFishing}
                  onChange={(e) => setSyncPetAndFishing(e.target.checked)}
                  className="rounded border-[#8f7758] text-emerald-700 focus:ring-emerald-600"
                />
                Angel- &amp; Haustier-Level direkt auf das gleiche Level mitsetzen
              </label>

              <div className="flex flex-wrap gap-1.5">
                {LEVEL_MILESTONES.map((m) => (
                  <button
                    key={m.level}
                    type="button"
                    onClick={() => onSetLevel(m.level, syncPetAndFishing)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono-num font-semibold transition-colors ${
                      gameState.level === m.level
                        ? 'bg-[#4a321f] border-[#4a321f] text-[#faf6ee]'
                        : 'bg-[#efe6d5] hover:bg-[#e5d8c0] border-[#c7b392] text-[#3d291a]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 2. Money Cheat */}
            <section className="rounded-xl bg-white border border-[#d6c7ae] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#6e4a2e] flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  Geld-Cheat · Nur Live-Vorschau
                </h3>
                <span className="font-mono-num text-[11px] text-[#5c4632]">
                  Kontostand: <strong>{gameState.coins.toLocaleString('de-DE')} M</strong>
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (parsedCoinAmount > 0) {
                    onGrantCoins(parsedCoinAmount);
                  }
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Münzbetrag zum Gutschreiben"
                  value={coinAmountInput}
                  onChange={(e) => setCoinAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="z.B. 7000000"
                  className="flex-1 px-3 py-2 rounded-lg bg-[#faf6ee] border border-[#cbb799] font-mono-num text-sm text-[#2b2118] focus:outline-none focus:border-[#6e4a2e]"
                />
                <button
                  type="submit"
                  disabled={parsedCoinAmount <= 0}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-[#d6c7ae] disabled:text-[#6e5a44] text-white text-xs font-display font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm transition-colors"
                >
                  <Coins className="w-3.5 h-3.5" />
                  {parsedCoinAmount > 0
                    ? `+${parsedCoinAmount.toLocaleString('de-DE')} M gutschreiben`
                    : 'Betrag eingeben'}
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5">
                {[100_000, 1_000_000, 7_000_000, 25_000_000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onGrantCoins(preset)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e5d8c0] border border-[#c7b392] text-[11px] font-mono-num font-semibold text-[#3d291a]"
                  >
                    +{preset.toLocaleString('de-DE')} M
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Season, Weather & Instant Farm Helpers */}
            <section className="rounded-xl bg-white border border-[#d6c7ae] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#6e4a2e] flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-sky-600" />
                  Jahreszeit, Wetter &amp; Hof-Werkzeuge
                </h3>
                <span className="font-mono-num text-[11px] text-[#5c4632]">
                  {SEASON_LABELS[gameState.season]} · {WEATHER_META[gameState.weather].label}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[#5c4632]">Jahreszeit umschalten:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {SEASON_ORDER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSetSeason(s)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        gameState.season === s
                          ? 'bg-[#6e4a2e] border-[#6e4a2e] text-[#faf6ee]'
                          : 'bg-[#faf6ee] hover:bg-[#efe6d5] border-[#d6c7ae] text-[#3d291a]'
                      }`}
                    >
                      {SEASON_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[#5c4632]">Wetter sofort setzen:</div>
                <div className="flex flex-wrap gap-1.5">
                  {WEATHER_ORDER.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => onSetWeather(w)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                        gameState.weather === w
                          ? 'bg-sky-700 border-sky-700 text-white'
                          : 'bg-[#faf6ee] hover:bg-[#efe6d5] border-[#d6c7ae] text-[#3d291a]'
                      }`}
                    >
                      {WEATHER_META[w].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onInstantHarvestReady}
                  className="px-3 py-2 rounded-lg bg-[#efe6d5] hover:bg-[#e5d8c0] border border-[#c7b392] text-xs font-semibold text-[#3d291a] inline-flex items-center justify-center gap-1.5"
                >
                  <Sprout className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Alles erntereif</span>
                </button>
                <button
                  type="button"
                  onClick={onUnlockAllLand}
                  className="px-3 py-2 rounded-lg bg-[#efe6d5] hover:bg-[#e5d8c0] border border-[#c7b392] text-xs font-semibold text-[#3d291a] inline-flex items-center justify-center gap-1.5"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>20×20 Land frei</span>
                </button>
                <button
                  type="button"
                  onClick={onRefillSuppliesAndStamina}
                  className="px-3 py-2 rounded-lg bg-[#efe6d5] hover:bg-[#e5d8c0] border border-[#c7b392] text-xs font-semibold text-[#3d291a] inline-flex items-center justify-center gap-1.5"
                >
                  <Hammer className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <span>Mine &amp; Vorrat füllen</span>
                </button>
              </div>
            </section>

            {/* 4. One-Click Test Scenarios */}
            <section className="rounded-xl bg-[#f3ead9] border border-[#d6c7ae] p-4 space-y-2.5">
              <div>
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#6e4a2e]">
                  1-Klick-Testszenarien (Vorschau-Profile)
                </h3>
                <p className="text-[11px] text-[#5c4632] mt-0.5">
                  Richtet Level, Münzen und optional Land &amp; Haus sofort für große Funktions-Tests ein.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onApplyPreset('industry')}
                  className="p-3 rounded-xl bg-white hover:bg-amber-50 border border-[#cbb799] text-left transition-colors space-y-0.5"
                >
                  <div className="font-display font-bold text-xs text-[#2b2118]">Industrie-Test</div>
                  <div className="font-mono-num text-[11px] text-emerald-800 font-semibold">
                    Lvl 150 · +10.000.000 M
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onApplyPreset('theme_park')}
                  className="p-3 rounded-xl bg-white hover:bg-amber-50 border border-[#cbb799] text-left transition-colors space-y-0.5"
                >
                  <div className="font-display font-bold text-xs text-[#2b2118]">Freizeitpark-Test</div>
                  <div className="font-mono-num text-[11px] text-emerald-800 font-semibold">
                    Lvl 175 · +20.000.000 M
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onApplyPreset('max_farm')}
                  className="p-3 rounded-xl bg-white hover:bg-amber-50 border border-[#cbb799] text-left transition-colors space-y-0.5"
                >
                  <div className="font-display font-bold text-xs text-[#2b2118]">Max-Hof Vollausbau</div>
                  <div className="font-mono-num text-[11px] text-emerald-800 font-semibold">
                    Lvl {MAX_LEVEL} · +50 Mio · 20×20 &amp; 4. Etage
                  </div>
                </button>
              </div>
            </section>

            {/* 5. Social & Romance Test Lab (Level 80+) */}
            <section className="rounded-xl bg-rose-50/70 border border-rose-300 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                  Social &amp; Liebe testen (ab Lvl 80)
                </h3>
                <span className="font-mono-num text-[11px] text-rose-900">
                  Status: <strong>{gameState.romance?.status || 'single'}</strong> ·{' '}
                  <strong>{gameState.romance?.affection || 0} %</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onTriggerRomanceSpark}
                  className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>Herzklopfen-Moment auslösen</span>
                </button>
                <button
                  type="button"
                  onClick={onMaxRomanceAffection}
                  className="px-3 py-2 rounded-lg bg-white hover:bg-rose-100 border border-rose-300 text-xs font-semibold text-rose-900 inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>Zuneigung auf 100 % setzen</span>
                </button>
                <button
                  type="button"
                  onClick={onMarryPartnerAdmin}
                  className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sofort verheiraten (+Einzug)</span>
                </button>
                <button
                  type="button"
                  onClick={onResetRomanceAdmin}
                  className="px-3 py-2 rounded-lg bg-[#efe6d5] hover:bg-[#e5d8c0] border border-[#c7b392] text-xs font-semibold text-[#3d291a] inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Beziehung zurücksetzen (Single)</span>
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
