import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Fish,
  Gift,
  Lock,
  RefreshCw,
  ScrollText,
  Sparkles,
  X,
} from 'lucide-react';
import { CATALOG_BY_ID, QUEST_MILESTONES } from '../data/catalog';
import { getMilestoneProgress, getReadyMilestonesCount, isTutorialFinished } from '../engine/gameLogic';
import { GameState } from '../types/game';

interface QuestsModalProps {
  gameState: GameState;
  onClose: () => void;
  onClaimQuest: (questId: string) => void;
  onRerollQuest: (questId: string) => void;
  onClaimMilestone: (milestoneId: string) => void;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({
  gameState,
  onClose,
  onClaimQuest,
  onRerollQuest,
  onClaimMilestone,
}) => {
  const tutorialDone = isTutorialFinished(gameState);
  const readyActiveCount = tutorialDone
    ? gameState.quests.active.filter((q) => q.progress >= q.target).length
    : 0;
  const readyMilestonesCount = getReadyMilestonesCount(gameState);

  const [tab, setTab] = useState<'active' | 'milestones'>(() =>
    !tutorialDone || (readyActiveCount === 0 && readyMilestonesCount > 0) ? 'milestones' : 'active'
  );
  const [milestoneFilter, setMilestoneFilter] = useState<'all' | 'ready' | 'open' | 'locked' | 'done'>('all');

  const claimedSet = new Set(gameState.quests.claimedMilestones || []);

  const classifiedMilestones = QUEST_MILESTONES.map((ms) => {
    const isClaimed = claimedSet.has(ms.id);
    const isUnlocked = gameState.level >= ms.minLevel;
    const rawProgress = getMilestoneProgress(ms.id, gameState);
    const isReady = !isClaimed && isUnlocked && rawProgress >= ms.target;
    const status: 'ready' | 'open' | 'locked' | 'done' = isClaimed
      ? 'done'
      : isReady
      ? 'ready'
      : isUnlocked
      ? 'open'
      : 'locked';
    return { ms, isClaimed, isUnlocked, rawProgress, isReady, status };
  });

  const filterCounts = {
    all: classifiedMilestones.length,
    ready: classifiedMilestones.filter((c) => c.status === 'ready').length,
    open: classifiedMilestones.filter((c) => c.status === 'open').length,
    locked: classifiedMilestones.filter((c) => c.status === 'locked').length,
    done: classifiedMilestones.filter((c) => c.status === 'done').length,
  };

  const statusOrder: Record<'ready' | 'open' | 'locked' | 'done', number> = {
    ready: 0,
    open: 1,
    locked: 2,
    done: 3,
  };

  const visibleMilestones = classifiedMilestones
    .filter((entry) => milestoneFilter === 'all' || entry.status === milestoneFilter)
    .sort((a, b) => {
      const sDiff = statusOrder[a.status] - statusOrder[b.status];
      if (sDiff !== 0) return sDiff;
      if (a.ms.minLevel !== b.ms.minLevel) return a.ms.minLevel - b.ms.minLevel;
      return a.ms.chapter - b.ms.chapter;
    });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-2.5">
            <ScrollText className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-display text-xl font-bold">Hof-Quests &amp; Kapitel</h2>
              <p className="text-xs text-amber-200/90 mt-0.5 font-mono-num">
                Abgeschlossene Aufträge: {gameState.quests.completedTotal} · Kapitel: {claimedSet.size}/{QUEST_MILESTONES.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Quests schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 px-6 pt-3 pb-2 bg-[#efe6d5] border-b border-[#d6c7ae]">
          <button
            onClick={() => setTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              tab === 'active'
                ? 'bg-[#4a321f] text-[#faf6ee]'
                : 'bg-[#faf6ee] text-[#4a321f] hover:bg-[#e5d9c3]'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Laufende Aufträge</span>
            {readyActiveCount > 0 && (
              <span className="font-mono-num bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px]">
                {readyActiveCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('milestones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              tab === 'milestones'
                ? 'bg-[#4a321f] text-[#faf6ee]'
                : 'bg-[#faf6ee] text-[#4a321f] hover:bg-[#e5d9c3]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Hof-Kapitel ({claimedSet.size}/{QUEST_MILESTONES.length})</span>
            {readyMilestonesCount > 0 && (
              <span className="font-mono-num bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px]">
                {readyMilestonesCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'active' ? (
            !tutorialDone ? (
              <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 text-sm text-[#4a321f] space-y-2">
                <div className="font-display font-bold text-base">Zuerst den Hof-Leitfaden abschließen</div>
                <p className="text-xs leading-relaxed">
                  Die laufenden Dorf- und Veredelungs-Aufträge schalten sich direkt nach dem Tutorial (Level 1–5 Leitfaden oben links) frei. Schau solange gerne schon in den Reiter „Hof-Kapitel“!
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#5c4632]">
                  Abwechslungsreiche Acker-, Mine-, Hofladen-, Dorf-, Veredelungs- und Angler-Aufträge passend zu deinem Hof-Level. Nach jeder Belohnung erscheint automatisch ein frischer Auftrag!
                </p>

                <div className="space-y-3">
                  {gameState.quests.active.map((q) => {
                    const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.target)) * 100));
                    const ready = q.progress >= q.target;
                    const targetItem = q.targetItemId ? CATALOG_BY_ID[q.targetItemId] : undefined;

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border-2 transition-colors ${
                          ready ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-[#d6c7ae]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            {targetItem && (
                              <span
                                className="w-4 h-4 rounded-sm border border-black/20 mt-1 shrink-0"
                                style={{ backgroundColor: targetItem.pixelColor }}
                                title={targetItem.name}
                              />
                            )}
                            <div>
                              <h3 className="font-display font-bold text-base">{q.title}</h3>
                              <p className="text-xs text-[#5c4632] mt-0.5">{q.description}</p>
                            </div>
                          </div>
                          <span className="font-mono-num text-xs font-bold text-[#4a321f] whitespace-nowrap">
                            {q.progress.toLocaleString('de-DE')} / {q.target.toLocaleString('de-DE')}
                          </span>
                        </div>

                        <div className="mt-3 h-2.5 bg-[#e8decb] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              ready ? 'bg-emerald-600' : 'bg-amber-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono-num font-semibold text-[#4a321f]">
                            <span>+{q.rewardCoins.toLocaleString('de-DE')} Münzen</span>
                            <span>· +{q.rewardXp.toLocaleString('de-DE')} XP</span>
                            {q.rewardFertilizer && q.rewardFertilizer > 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-800">
                                · <Sparkles className="w-3.5 h-3.5" /> +{q.rewardFertilizer} Dünger
                              </span>
                            ) : null}
                            {q.rewardBait && q.rewardBait > 0 ? (
                              <span className="inline-flex items-center gap-1 text-sky-800">
                                · <Fish className="w-3.5 h-3.5" /> +{q.rewardBait} Profi-Köder
                              </span>
                            ) : null}
                          </div>

                          {ready ? (
                            <button
                              onClick={() => onClaimQuest(q.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                            >
                              <Gift className="w-4 h-4" />
                              <span>Belohnung abholen</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs text-[#7c664e]">
                                <CheckCircle2 className="w-3.5 h-3.5 opacity-60" /> In Arbeit
                              </span>
                              <button
                                onClick={() => onRerollQuest(q.id)}
                                title="Durch einen anderen Auftrag ersetzen"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e2d3ba] text-[11px] font-semibold text-[#4a321f] whitespace-nowrap shrink-0 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Tauschen</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          ) : (
            <>
              <p className="text-xs text-[#5c4632]">
                82 Hof-Kapitel begleiten deinen gesamten Weg vom ersten Acker bis zum Groß-Imperium und Level 249. Bereite Kapitel stehen automatisch ganz oben.
              </p>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#efe6d5] rounded-xl border border-[#d6c7ae]">
                {(
                  [
                    { id: 'all', label: `Alle (${filterCounts.all})` },
                    { id: 'ready', label: `Bereit (${filterCounts.ready})` },
                    { id: 'open', label: `Offen (${filterCounts.open})` },
                    { id: 'locked', label: `Ab höherem Lvl (${filterCounts.locked})` },
                    { id: 'done', label: `Erledigt (${filterCounts.done})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setMilestoneFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      milestoneFilter === f.id
                        ? f.id === 'ready' && filterCounts.ready > 0
                          ? 'bg-emerald-700 text-white'
                          : 'bg-[#4a321f] text-[#faf6ee]'
                        : f.id === 'ready' && filterCounts.ready > 0
                        ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                        : 'text-[#4a321f] hover:bg-[#e5d9c3]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {visibleMilestones.length === 0 ? (
                <div className="p-5 rounded-xl bg-white border border-[#d6c7ae] text-center text-xs text-[#5c4632]">
                  In dieser Ansicht gibt es aktuell keine Hof-Kapitel.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleMilestones.map(({ ms, isClaimed, isUnlocked, rawProgress, isReady }) => {
                    const shownProgress = isClaimed ? ms.target : Math.min(ms.target, rawProgress);
                    const pct = Math.min(100, Math.round((shownProgress / Math.max(1, ms.target)) * 100));
                    const rewardItemMeta = ms.rewardItem ? CATALOG_BY_ID[ms.rewardItem.itemId] : undefined;

                    return (
                      <div
                        key={ms.id}
                        className={`p-4 rounded-xl border-2 transition-colors ${
                          isClaimed
                            ? 'bg-[#f1eadb] border-[#d6c7ae] opacity-80'
                            : !isUnlocked
                            ? 'bg-[#f4eee2] border-[#ddd0b8] opacity-85'
                            : isReady
                            ? 'bg-emerald-50 border-emerald-500'
                            : 'bg-white border-[#d6c7ae]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display font-bold text-base">{ms.title}</h3>
                              {!isUnlocked && (
                                <span className="inline-flex items-center gap-1 text-[#6b533c] text-[11px] font-semibold">
                                  <Lock className="w-3 h-3" /> Ab Level {ms.minLevel}
                                </span>
                              )}
                              {isClaimed && (
                                <span className="inline-flex items-center gap-1 text-emerald-800 text-[11px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3" /> Abgeschlossen
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#5c4632] mt-0.5">{ms.description}</p>
                          </div>

                          <span className="font-mono-num text-xs font-bold text-[#4a321f] whitespace-nowrap">
                            {shownProgress.toLocaleString('de-DE')} / {ms.target.toLocaleString('de-DE')}
                          </span>
                        </div>

                        <div className="mt-3 h-2.5 bg-[#e8decb] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isClaimed || isReady ? 'bg-emerald-600' : !isUnlocked ? 'bg-[#b8a58b]' : 'bg-amber-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono-num font-semibold text-[#4a321f]">
                            <span>+{ms.rewardCoins.toLocaleString('de-DE')} Münzen</span>
                            {ms.rewardXp > 0 && <span>· +{ms.rewardXp.toLocaleString('de-DE')} XP</span>}
                            {ms.rewardFertilizer && ms.rewardFertilizer > 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-800">
                                · <Sparkles className="w-3.5 h-3.5" /> +{ms.rewardFertilizer} Dünger
                              </span>
                            ) : null}
                            {ms.rewardBait && ms.rewardBait > 0 ? (
                              <span className="inline-flex items-center gap-1 text-sky-800">
                                · <Fish className="w-3.5 h-3.5" /> +{ms.rewardBait} Profi-Köder
                              </span>
                            ) : null}
                            {ms.rewardItem && rewardItemMeta ? (
                              <span className="inline-flex items-center gap-1 text-amber-900">
                                · <Gift className="w-3.5 h-3.5 text-amber-700" /> +{ms.rewardItem.qty}× {rewardItemMeta.name}
                              </span>
                            ) : null}
                          </div>

                          {isReady ? (
                            <button
                              onClick={() => onClaimMilestone(ms.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                            >
                              <Gift className="w-4 h-4" />
                              <span>Kapitel abschließen</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
