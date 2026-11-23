import React, { useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  FerrisWheel,
  Ghost,
  Lock,
  Sparkles,
  Ticket,
  TowerControl,
  TrendingUp,
  Users,
  Waves,
  Wrench,
  X,
} from 'lucide-react';
import {
  getThemeParkMetrics,
  THEME_PARK_ATTRACTIONS,
  THEME_PARK_BASE_COST,
  THEME_PARK_BASE_HOURLY_PROFIT,
  THEME_PARK_BASE_VISITOR_BONUS,
  THEME_PARK_UNLOCK_LEVEL,
} from '../data/themePark';
import { GameState, ThemeParkAttractionId } from '../types/game';

interface ThemeParkModalProps {
  gameState: GameState;
  onClose: () => void;
  onPurchasePark: () => void;
  onBuildAttraction: (attractionId: ThemeParkAttractionId) => void;
  onRepairPark: () => void;
}

function AttractionIcon({ id, className }: { id: ThemeParkAttractionId; className?: string }) {
  switch (id) {
    case 'ferris_wheel':
      return <FerrisWheel className={className} />;
    case 'roller_coaster':
      return <Sparkles className={className} />;
    case 'water_flume':
      return <Waves className={className} />;
    case 'sky_tower':
      return <TowerControl className={className} />;
    case 'ghost_train':
      return <Ghost className={className} />;
  }
}

export const ThemeParkModal: React.FC<ThemeParkModalProps> = ({
  gameState,
  onClose,
  onPurchasePark,
  onBuildAttraction,
  onRepairPark,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const park = gameState.themePark;
  const metrics = getThemeParkMetrics(park);
  const ownedAttractions = park?.attractions || [];
  const levelMet = gameState.level >= THEME_PARK_UNLOCK_LEVEL;
  const canAffordBase = gameState.coins >= THEME_PARK_BASE_COST;

  const earnedToday = park?.todayEarned ?? 0;
  const earnedTotal = park?.totalEarned ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="bg-[#4a321f] px-5 py-4 text-[#faf6ee] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Ticket className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display font-bold text-base leading-tight truncate">
                Abenteuerpark Sonnental
              </h2>
              <p className="text-[11px] text-[#e7d7bf]">
                Freizeitpark ab Hof-Level {THEME_PARK_UNLOCK_LEVEL} · Grundpark mit Nostalgie-Karussell + {THEME_PARK_ATTRACTIONS.length} Großattraktionen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Freizeitpark-Menü schließen"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Park Overview Card */}
          <div className="bg-white border border-[#d6c7ae] rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8f7758]">
                  {metrics.owned
                    ? `In deinem Besitz · ${metrics.attractionCount} / ${THEME_PARK_ATTRACTIONS.length} Ausbauten`
                    : `Freizeit-Projekt · Freischaltung ab Level ${THEME_PARK_UNLOCK_LEVEL}`}
                </div>
                <h3 className="font-display font-bold text-lg text-[#2b2118] leading-snug mt-0.5">
                  Grundpark &amp; Nostalgie-Karussell
                </h3>
                <p className="text-xs text-[#5c4632] leading-relaxed mt-1 max-w-xl">
                  Der Abenteuerpark liegt direkt südlich des Westviertels mit Zugang vom Dorfplatz und deinem Hofweg.
                  Mit jeder Attraktion steigen deine stündlichen Park-Einnahmen sowie die täglichen Besucher in deinem Hofladen.
                </p>
              </div>
              <div className="text-right font-mono-num shrink-0">
                <div className="text-[11px] text-[#6e4a2e]">Kontostand</div>
                <div className="text-base font-bold text-[#2b2118]">
                  {gameState.coins.toLocaleString('de-DE')} M
                </div>
              </div>
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-lg bg-[#faf6ee] border border-[#e2d6c1] p-3">
                <div className="text-[11px] text-[#6e4a2e] flex items-center gap-1.5 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  Tagesertrag (ca.)
                </div>
                <div className="font-mono-num font-bold text-sm text-emerald-800 mt-1">
                  {metrics.owned
                    ? `${metrics.estimatedDailyMin.toLocaleString('de-DE')} – ${metrics.estimatedDailyMax.toLocaleString('de-DE')} M`
                    : '320.000 – 375.000 M (Basis)'}
                </div>
                <div className="text-[11px] text-[#6e5a44] font-mono-num mt-0.5">
                  ~{(metrics.owned ? metrics.hourlyProfitBase : THEME_PARK_BASE_HOURLY_PROFIT).toLocaleString('de-DE')} M / Ingame-Std.
                </div>
              </div>

              <div className="rounded-lg bg-[#faf6ee] border border-[#e2d6c1] p-3">
                <div className="text-[11px] text-[#6e4a2e] flex items-center gap-1.5 font-semibold">
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  Hofladen-Synergie
                </div>
                <div className="font-display font-bold text-sm text-[#2b2118] mt-1">
                  +{metrics.owned ? metrics.shopVisitorBonus : THEME_PARK_BASE_VISITOR_BONUS} Besucher / Tag
                </div>
                <div className="text-[11px] text-[#6e5a44] mt-0.5">
                  Maximal +{THEME_PARK_BASE_VISITOR_BONUS + THEME_PARK_ATTRACTIONS.reduce((sum, a) => sum + a.shopVisitorBonus, 0)} Besucher bei Vollausbau
                </div>
              </div>

              <div className="rounded-lg bg-[#faf6ee] border border-[#e2d6c1] p-3">
                <div className="text-[11px] text-[#6e4a2e] flex items-center gap-1.5 font-semibold">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  Park-Kasse
                </div>
                <div className="font-mono-num font-bold text-sm text-[#2b2118] mt-1">
                  Heute: +{earnedToday.toLocaleString('de-DE')} M
                </div>
                <div className="text-[11px] text-[#6e5a44] font-mono-num mt-0.5">
                  Gesamt: +{earnedTotal.toLocaleString('de-DE')} M
                </div>
              </div>
            </div>

            {/* Primary Purchase Action if not yet owned */}
            {!metrics.owned ? (
              <div className="rounded-xl bg-[#f3ead9] border border-[#d6c7ae] p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-2 font-semibold">
                    {levelMet ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-rose-700 shrink-0" />
                    )}
                    <span className={levelMet ? 'text-emerald-900' : 'text-rose-800'}>
                      Ab Hof-Level {THEME_PARK_UNLOCK_LEVEL} erwerbbar (aktuell Level {gameState.level})
                    </span>
                  </div>
                  <div className="text-[#5c4632]">
                    Enthält Parkmauer, Kassenhäuschen, Snacks &amp; Nostalgie-Karussell · Stündliche Ausschüttung in deine Hofkasse
                  </div>
                </div>
                <button
                  onClick={onPurchasePark}
                  disabled={!levelMet || !canAffordBase}
                  className={`px-4 py-2.5 rounded-xl text-sm font-display font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
                    levelMet && canAffordBase
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow'
                      : 'bg-[#d6c7ae] text-[#6e5a44] cursor-not-allowed'
                  }`}
                >
                  {!levelMet ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Ab Level {THEME_PARK_UNLOCK_LEVEL}</span>
                    </>
                  ) : !canAffordBase ? (
                    <>
                      <Coins className="w-4 h-4" />
                      <span>{THEME_PARK_BASE_COST.toLocaleString('de-DE')} M fehlen</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      <span>Grundpark kaufen ({THEME_PARK_BASE_COST.toLocaleString('de-DE')} M)</span>
                    </>
                  )}
                </button>
              </div>
            ) : park?.breakdown ? (
              <div className="rounded-xl bg-rose-50 border-2 border-rose-400 p-3.5 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-display font-bold text-sm text-rose-950">
                      Park-Panne: {park.breakdown.reason}
                    </div>
                    <p className="text-rose-900 mt-0.5">
                      Alle Fahrgeschäfte stehen vorübergehend still. Stündliche Einnahmen und Besucher-Boni sind pausiert!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRepairPark}
                  disabled={gameState.coins < park.breakdown.repairCost}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-display font-bold flex items-center justify-center gap-2 transition-colors ${
                    gameState.coins >= park.breakdown.repairCost
                      ? 'bg-rose-700 hover:bg-rose-800 text-white shadow'
                      : 'bg-[#d6c7ae] text-[#6e5a44] cursor-not-allowed'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>
                    {gameState.coins >= park.breakdown.repairCost
                      ? `Park reparieren (${park.breakdown.repairCost.toLocaleString('de-DE')} M)`
                      : `Noch ${(park.breakdown.repairCost - gameState.coins).toLocaleString('de-DE')} M fehlen (${park.breakdown.repairCost.toLocaleString('de-DE')} M)`}
                  </span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Der Abenteuerpark ist geöffnet! Dorfbewohner besuchen die Attraktionen und deine Einnahmen werden alle 60 Ingame-Minuten verbucht.
                </span>
              </div>
            )}
          </div>

          {/* Modular Attractions Section */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display font-bold text-sm text-[#2b2118]">
                Park-Erweiterungen &amp; Großattraktionen
              </h3>
              <span className="text-xs text-[#6e5a44]">
                Einzeln erweiterbar · Sofort im Freizeitpark sichtbar und animiert
              </span>
            </div>

            <div className="space-y-2.5">
              {THEME_PARK_ATTRACTIONS.map((attr) => {
                const isBuilt = ownedAttractions.includes(attr.id);
                const attrMinLevel = Math.max(THEME_PARK_UNLOCK_LEVEL, attr.minLevel ?? THEME_PARK_UNLOCK_LEVEL);
                const attrLevelMet = gameState.level >= attrMinLevel;
                const canAffordAttr = gameState.coins >= attr.cost;
                const canBuild = metrics.owned && attrLevelMet && !isBuilt && canAffordAttr;

                return (
                  <div
                    key={attr.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isBuilt
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-white border-[#d6c7ae]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                            isBuilt
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                              : 'bg-[#efe6d5] border-[#c7b392] text-[#6e4a2e]'
                          }`}
                        >
                          <AttractionIcon id={attr.id} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="text-[11px] font-semibold text-[#8f7758]">
                            {attr.subtitle}{attrMinLevel > THEME_PARK_UNLOCK_LEVEL ? ` · Ab Level ${attrMinLevel}` : ''}
                          </div>
                          <h4 className="font-display font-bold text-sm text-[#2b2118]">
                            {attr.name}
                          </h4>
                          <p className="text-xs text-[#5c4632] leading-relaxed">
                            {attr.description}
                          </p>
                          <div className="text-[11px] text-[#4a321f] font-mono-num pt-0.5">
                            {attr.dailyProfitRangeLabel} · +{attr.hourlyProfitBonus.toLocaleString('de-DE')} M / Std. · +{attr.shopVisitorBonus} Hofladen-Besucher
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 sm:pl-2">
                        {isBuilt ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-display font-bold whitespace-nowrap">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>In Betrieb</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onBuildAttraction(attr.id)}
                            disabled={!canBuild}
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                              canBuild
                                ? 'bg-[#6e4a2e] hover:bg-[#573821] text-white shadow'
                                : 'bg-[#e7dcc9] text-[#7a644d] cursor-not-allowed'
                            }`}
                          >
                            {!metrics.owned ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Zuerst Grundpark ({attr.cost.toLocaleString('de-DE')} M)</span>
                              </>
                            ) : !attrLevelMet ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Ab Level {attrMinLevel}</span>
                              </>
                            ) : !canAffordAttr ? (
                              <>
                                <Coins className="w-3.5 h-3.5" />
                                <span>{attr.cost.toLocaleString('de-DE')} M (fehlt)</span>
                              </>
                            ) : (
                              <>
                                <Coins className="w-3.5 h-3.5" />
                                <span>Bauen ({attr.cost.toLocaleString('de-DE')} M)</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f3ead9] border-t border-[#d6c7ae] flex flex-wrap items-center justify-between gap-2 text-xs text-[#4a321f] shrink-0">
          <div>
            Ausbaustatus:{' '}
            <strong className="font-mono-num">
              {metrics.owned ? `Grundpark + ${metrics.attractionCount}/${THEME_PARK_ATTRACTIONS.length} Attraktionen` : 'Noch im Bau-Plan'}
            </strong>
          </div>
          <div className="font-mono-num">
            {metrics.owned ? (
              <>
                Aktueller Ertrag:{' '}
                <strong>~{metrics.hourlyProfitBase.toLocaleString('de-DE')} M / Std.</strong> · Hofladen{' '}
                <strong>+{metrics.shopVisitorBonus} Besucher</strong>
              </>
            ) : (
              <>
                Freischaltung ab Hof-Level <strong>{THEME_PARK_UNLOCK_LEVEL}</strong>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
