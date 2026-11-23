import React, { useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  Check,
  Coins,
  Medal,
  Sparkles,
  Trees,
  X,
} from 'lucide-react';
import {
  CATALOG_BY_ID,
  DAYS_PER_SEASON,
  FAIR_MEDAL_THRESHOLDS,
  SEASON_LABELS,
} from '../data/catalog';
import {
  calculateFarmCharm,
  evaluateVillageFair,
  getDayInSeason,
  getSeasonFairKey,
} from '../engine/gameLogic';
import { FairMedal, GameState } from '../types/game';

interface VillageFairModalProps {
  gameState: GameState;
  onClose: () => void;
  onSubmitFair: (showcaseItemId?: string) => void;
}

const MEDAL_META: Record<FairMedal, { label: string; badgeClass: string; decorId: string }> = {
  bronze: {
    label: 'Bronze-Medaille',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    decorId: 'fair_pennant',
  },
  silver: {
    label: 'Silber-Medaille',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    decorId: 'fair_beer_table',
  },
  gold: {
    label: 'Gold-Medaille',
    badgeClass: 'bg-yellow-100 text-yellow-900 border-yellow-400',
    decorId: 'fair_trophy',
  },
};

export const VillageFairModal: React.FC<VillageFairModalProps> = ({
  gameState,
  onClose,
  onSubmitFair,
}) => {
  const inventoryItems = useMemo(
    () =>
      Object.entries(gameState.inventory)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ item: CATALOG_BY_ID[id], qty }))
        .filter((entry) => Boolean(entry.item))
        .sort((a, b) => (b.item?.sellPrice || 0) - (a.item?.sellPrice || 0)),
    [gameState.inventory]
  );

  const [selectedShowcaseId, setSelectedShowcaseId] = useState<string>(
    () => inventoryItems[0]?.item.id || ''
  );

  const activeShowcaseId =
    selectedShowcaseId && (gameState.inventory[selectedShowcaseId] || 0) > 0
      ? selectedShowcaseId
      : '';

  const dayInSeason = getDayInSeason(gameState.day);
  const fairKey = getSeasonFairKey(gameState.day, gameState.season);
  const alreadyJudged = (gameState.villageFair?.judgedSeasonKeys || []).includes(fairKey);
  const isFairDay = dayInSeason === DAYS_PER_SEASON;
  const canJudgeNow = isFairDay && !alreadyJudged;

  const farmCharm = useMemo(() => calculateFarmCharm(gameState.tiles), [gameState.tiles]);
  const preview = useMemo(
    () => evaluateVillageFair(gameState, activeShowcaseId || undefined),
    [gameState, activeShowcaseId]
  );

  const medals = gameState.villageFair?.medals || { bronze: 0, silver: 0, gold: 0 };
  const lastResult = gameState.villageFair?.lastResult;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold">
                Sonnental-Dorffest &amp; Hof-Bewertung
              </h2>
              <p className="text-xs text-amber-200/90 mt-0.5 font-mono-num">
                {SEASON_LABELS[gameState.season]} · Saisontag {dayInSeason}/{DAYS_PER_SEASON} (Tag {gameState.day}) · Jury: Nachbarn &amp; Bruno
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Dorffest schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Medal Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#efe6d5] border-b border-[#d6c7ae]">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-[#6e4a2e]" />
            <span>
              {isFairDay
                ? alreadyJudged
                  ? 'Die diesjährige Saison-Bewertung wurde bereits abgeschlossen!'
                  : 'Heute ist Festtag! Stelle deine beste Ernte aus und lass deinen Hof bewerten.'
                : `Das nächste Dorffest öffnet an Saisontag ${DAYS_PER_SEASON}/${DAYS_PER_SEASON} (${SEASON_LABELS[gameState.season]}).`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono-num font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-900">
              Gold: {medals.gold}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-800">
              Silber: {medals.silver}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900">
              Bronze: {medals.bronze}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Live Score Breakdown */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-white border border-[#d6c7ae]">
              <div className="text-xs font-semibold text-[#5c4632] flex items-center gap-1.5">
                <Trees className="w-4 h-4 text-emerald-700" />
                <span>Hof-Charme &amp; Gestaltung</span>
              </div>
              <div className="font-mono-num text-2xl font-bold text-[#2b2118] mt-1">
                {preview.charmScore} <span className="text-xs font-normal text-[#785c42]">/ 180 Pkt</span>
              </div>
              <div className="text-[11px] text-[#5c4632] mt-1">
                Aktueller Hof-Charme: {farmCharm} Pkt (Deko, Obstbäume &amp; Festschmuck)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#d6c7ae]">
              <div className="text-xs font-semibold text-[#5c4632] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-700" />
                <span>Sauberkeit &amp; Pflege</span>
              </div>
              <div className="font-mono-num text-2xl font-bold text-[#2b2118] mt-1">
                {preview.cleanlinessScore} <span className="text-xs font-normal text-[#785c42]">/ 60 Pkt</span>
              </div>
              <div className="text-[11px] text-[#5c4632] mt-1">
                Bonus für gesunde Felder &amp; Tiere; Abzug für verdorrte/beschädigte Kulturen.
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#d6c7ae]">
              <div className="text-xs font-semibold text-[#5c4632] flex items-center gap-1.5">
                <Medal className="w-4 h-4 text-amber-600" />
                <span>Prachtstück-Ausstellung</span>
              </div>
              <div className="font-mono-num text-2xl font-bold text-[#2b2118] mt-1">
                {preview.produceScore} <span className="text-xs font-normal text-[#785c42]">/ 130 Pkt</span>
              </div>
              <div className="text-[11px] text-[#5c4632] mt-1">
                Veredelungen, Obst &amp; Saisonware bringen besonders viele Jury-Punkte!
              </div>
            </div>
          </section>

          {/* Showcase Selection */}
          <section className="p-4 rounded-xl bg-white border border-[#d6c7ae] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-sm">
                  Schaustück aus deinem Vorrat auswählen (1× wird für den Wettbewerb ausgestellt)
                </h3>
                <p className="text-xs text-[#5c4632]">
                  Optional: Ohne Schaustück zählt nur die Hof-Bewertung.
                </p>
              </div>
              {activeShowcaseId && (
                <button
                  onClick={() => setSelectedShowcaseId('')}
                  className="px-2.5 py-1 rounded-lg bg-[#efe6d5] hover:bg-[#e2d4bc] text-xs font-semibold"
                >
                  Kein Schaustück wählen
                </button>
              )}
            </div>

            {inventoryItems.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#f3ecde] text-xs text-[#5c4632] text-center">
                Du hast aktuell keine geernteten Produkte oder Veredelungen im Rucksack.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                {inventoryItems.map(({ item, qty }) => {
                  const selected = activeShowcaseId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedShowcaseId(item.id)}
                      className={`p-2.5 rounded-xl border text-left transition-colors flex items-center gap-2 ${
                        selected
                          ? 'bg-amber-50 border-amber-600 shadow-xs'
                          : 'bg-[#faf6ee] border-[#d6c7ae] hover:bg-[#efe6d5]'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-md border border-black/20 shrink-0"
                        style={{ backgroundColor: item.pixelColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{item.produceName}</div>
                        <div className="text-[10px] font-mono-num text-[#6e4a2e]">
                          ×{qty} · {item.sellPrice} M
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Prediction & Submit Box */}
          <section className="p-5 rounded-xl bg-amber-50/80 border border-amber-300 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#5c4632] font-mono-num">
                Voraussichtliche Gesamtwertung: <strong className="text-base text-[#2b2118]">{preview.score} Punkte</strong>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded border font-bold ${MEDAL_META[preview.medal].badgeClass}`}>
                  {MEDAL_META[preview.medal].label}
                </span>
                <span className="font-mono-num text-[#4a321f] font-semibold">
                  +{preview.rewardCoins.toLocaleString('de-DE')} Münzen · +{preview.rewardXp} XP
                </span>
                {preview.unlockedDecorId && CATALOG_BY_ID[preview.unlockedDecorId] && (
                  <span className="text-emerald-800 font-semibold">
                    + 1× {CATALOG_BY_ID[preview.unlockedDecorId].name}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#6e4a2e] font-mono-num">
                Schwellen: Bronze &lt; {FAIR_MEDAL_THRESHOLDS.silver} Pkt · Silber ab {FAIR_MEDAL_THRESHOLDS.silver} Pkt · Gold ab {FAIR_MEDAL_THRESHOLDS.gold} Pkt
              </div>
            </div>

            <button
              disabled={!canJudgeNow}
              onClick={() => onSubmitFair(activeShowcaseId || undefined)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
                canJudgeNow
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
                  : 'bg-[#ded3be] text-[#785c42] cursor-not-allowed'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>
                {alreadyJudged
                  ? 'Saison bereits bewertet'
                  : isFairDay
                  ? 'Hof jetzt bewerten lassen!'
                  : `Erst an Saisontag ${DAYS_PER_SEASON}`}
              </span>
            </button>
          </section>

          {/* Exclusive Fair Decor Overview */}
          <section className="space-y-2">
            <h3 className="font-display font-bold text-sm">Exklusive Fest-Dekorationen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['fair_pennant', 'fair_beer_table', 'fair_trophy'] as const).map((decorId) => {
                const item = CATALOG_BY_ID[decorId];
                if (!item) return null;
                const tierLabel =
                  decorId === 'fair_trophy' ? 'Ab Gold' : decorId === 'fair_beer_table' ? 'Ab Silber' : 'Ab Bronze';
                return (
                  <div key={decorId} className="p-3 rounded-xl bg-white border border-[#d6c7ae] flex items-start gap-2.5">
                    <span
                      className="w-8 h-8 rounded-lg border border-black/20 shrink-0"
                      style={{ backgroundColor: item.pixelColor }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs">{item.name}</div>
                      <div className="text-[10px] font-semibold text-amber-800">
                        {tierLabel} · +{item.charmPoints} Charme
                      </div>
                      <div className="text-[11px] text-[#5c4632] mt-0.5 leading-snug">{item.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {lastResult && (
            <section className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Letzte Bewertung ({SEASON_LABELS[lastResult.season]}, Tag {lastResult.day}):{' '}
                  <strong>{lastResult.score} Punkte</strong> ({MEDAL_META[lastResult.medal].label})
                </span>
              </div>
              <span className="font-mono-num text-emerald-800 font-semibold">
                +{lastResult.rewardCoins.toLocaleString('de-DE')} M
              </span>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
