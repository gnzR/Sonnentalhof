import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, Gift, ScrollText } from 'lucide-react';
import { TUTORIAL_STEPS } from '../data/catalog';
import { isTutorialFinished } from '../engine/gameLogic';
import { GameState } from '../types/game';

interface TutorialWidgetProps {
  gameState: GameState;
  onClaimStep: (stepIndex: number) => void;
  onDismiss: () => void;
  onOpenQuests: () => void;
  onClaimQuest: (questId: string) => void;
}

export const TutorialWidget: React.FC<TutorialWidgetProps> = ({
  gameState,
  onClaimStep,
  onDismiss,
  onOpenQuests,
  onClaimQuest,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const tutorialDone = isTutorialFinished(gameState);

  if (tutorialDone) {
    const readyCount = gameState.quests.active.filter((q) => q.progress >= q.target).length;
    const featured =
      gameState.quests.active.find((q) => q.progress >= q.target) || gameState.quests.active[0];

    if (!featured) return null;
    const pct = Math.min(100, Math.round((featured.progress / Math.max(1, featured.target)) * 100));
    const ready = featured.progress >= featured.target;

    return (
      <aside className="fixed top-20 left-3 z-20 w-72 bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-xl shadow-lg text-[#2b2118] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-[#4a321f] text-[#faf6ee]">
          <button
            onClick={onOpenQuests}
            className="flex items-center gap-1.5 text-xs font-display font-bold hover:text-amber-200 transition-colors"
          >
            <ScrollText className="w-3.5 h-3.5 text-amber-300" />
            <span>Aktive Quests ({gameState.quests.active.length})</span>
            {readyCount > 0 && (
              <span className="font-mono-num bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px]">
                {readyCount} fertig
              </span>
            )}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-white/10"
            title={collapsed ? 'Ausklappen' : 'Einklappen'}
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!collapsed && (
          <div className="p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="font-display font-bold text-sm truncate">{featured.title}</div>
              <span className="font-mono-num text-[11px] font-semibold text-[#6e4a2e] whitespace-nowrap">
                {featured.progress}/{featured.target}
              </span>
            </div>
            <p className="text-[#4a321f] leading-relaxed">{featured.description}</p>
            <div className="h-2 bg-[#e8decb] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${ready ? 'bg-emerald-600' : 'bg-amber-600'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              {ready ? (
                <button
                  onClick={() => onClaimQuest(featured.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-colors"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Abholen (+{featured.rewardCoins} M)</span>
                </button>
              ) : (
                <button
                  onClick={onOpenQuests}
                  className="flex-1 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e2d3ba] text-[#2b2118] font-semibold transition-colors"
                >
                  Alle {gameState.quests.active.length} Quests ansehen
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    );
  }

  // Determine next uncompleted step
  const nextStep =
    TUTORIAL_STEPS.find((s) => !gameState.tutorial.completedSteps.includes(s.stepIndex)) ||
    TUTORIAL_STEPS[0];

  // Check if step condition is fulfilled
  const isStepReady = (() => {
    const tut = gameState.tutorial;
    switch (nextStep.stepIndex) {
      case 0:
        return gameState.stats.totalHarvested >= 1 && tut.plantedCount >= 1;
      case 1:
        return tut.wateredCount >= 1;
      case 2:
        return tut.soldCount >= 1 && tut.mushroomPlanted;
      case 3:
        return tut.visitedHouseOrPet;
      case 4:
        return tut.helpedNeighbor && gameState.level >= 5;
      default:
        return false;
    }
  })();

  return (
    <aside className="fixed top-20 left-3 z-20 w-72 bg-[#faf6ee]/95 border-2 border-[#6e4a2e] rounded-xl shadow-lg text-[#2b2118] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#4a321f] text-[#faf6ee]">
        <div className="flex items-center gap-1.5 text-xs font-display font-bold">
          <BookOpen className="w-3.5 h-3.5 text-amber-300" />
          <span>Hof-Leitfaden (Lvl 1–5)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-white/10"
            title={collapsed ? 'Ausklappen' : 'Einklappen'}
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between font-mono-num text-[11px] text-[#6e4a2e]">
            <span>
              Schritt {nextStep.stepIndex + 1} von {TUTORIAL_STEPS.length}
            </span>
            <span>
              +{nextStep.rewardCoins} M · +{nextStep.rewardXp} XP
            </span>
          </div>

          <div className="font-display font-bold text-sm">{nextStep.title}</div>
          <p className="text-[#4a321f] leading-relaxed">{nextStep.instruction}</p>

          <div className="flex items-center justify-between gap-2 pt-1">
            {isStepReady ? (
              <button
                onClick={() => onClaimStep(nextStep.stepIndex)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-colors"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Belohnung abholen</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-[#6e4a2e] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 opacity-60" />
                <span>Aufgabe aktiv...</span>
              </div>
            )}

            <button
              onClick={onDismiss}
              className="px-2 py-1.5 rounded text-[11px] text-[#7c664e] hover:text-[#2b2118]"
            >
              Ausblenden
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
