import React from 'react';
import { Award, Check, Gift, Sparkles, Trophy, X } from 'lucide-react';
import { CATALOG_BY_ID, SEASON_LABELS, SEASONAL_EVENTS } from '../data/catalog';
import { GameState } from '../types/game';

interface SeasonalEventModalProps {
  gameState: GameState;
  onClose: () => void;
  onClaimTier: (tierIndex: number) => void;
}

export const SeasonalEventModal: React.FC<SeasonalEventModalProps> = ({
  gameState,
  onClose,
  onClaimTier,
}) => {
  const activeEvent = SEASONAL_EVENTS[gameState.season];
  const maxPoints = activeEvent.tiers[activeEvent.tiers.length - 1].points;
  const pct = Math.min(100, Math.round((gameState.eventState.points / maxPoints) * 100));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div>
            <h2 className="font-display text-xl font-bold">{activeEvent.title}</h2>
            <p className="text-xs text-amber-200/90 mt-0.5">
              Aktive Saison: {SEASON_LABELS[gameState.season]} · {activeEvent.subtitle}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Progress Banner */}
          <div className="p-5 rounded-xl bg-white border border-[#d6c7ae] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-display font-bold text-base">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <span>Deine Festpunkte</span>
              </div>
              <span className="font-mono-num text-sm font-bold text-emerald-800">
                {gameState.eventState.points} / {maxPoints} Punkte
              </span>
            </div>
            <div className="w-full h-3 bg-[#efe6d5] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-[#5c4632]">{activeEvent.description}</p>
          </div>

          {/* Milestone Tiers */}
          <section className="space-y-3">
            <h3 className="font-display font-bold text-base">Event-Meilensteine & Exklusive Belohnungen</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeEvent.tiers.map((tier, idx) => {
                const claimed = gameState.eventState.claimedTiers.includes(idx);
                const unlocked = gameState.eventState.points >= tier.points;
                const rewardCatalogItem = tier.rewardItem ? CATALOG_BY_ID[tier.rewardItem.itemId] : null;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex flex-col justify-between ${
                      claimed
                        ? 'bg-emerald-50 border-emerald-300'
                        : unlocked
                        ? 'bg-amber-50 border-amber-400'
                        : 'bg-white border-[#d6c7ae]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono-num font-bold text-[#6e4a2e]">
                        <span>Stufe {idx + 1}</span>
                        <span>Ab {tier.points} Pkt.</span>
                      </div>
                      <div className="text-sm font-display font-bold">
                        +{tier.rewardCoins} Münzen
                      </div>
                      {rewardCatalogItem && tier.rewardItem && (
                        <div className="text-xs text-[#4a321f] flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            {tier.rewardItem.qty}× {rewardCatalogItem.name}
                          </span>
                        </div>
                      )}
                      {tier.trophyName && (
                        <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{tier.trophyName}</span>
                        </div>
                      )}
                    </div>

                    <button
                      disabled={claimed || !unlocked}
                      onClick={() => onClaimTier(idx)}
                      className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        claimed
                          ? 'bg-emerald-700 text-white'
                          : unlocked
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-[#e8decb] text-[#8f7758] cursor-not-allowed'
                      }`}
                    >
                      {claimed ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Eingesammelt
                        </>
                      ) : unlocked ? (
                        'Belohnung abholen'
                      ) : (
                        `Noch ${tier.points - gameState.eventState.points} Pkt.`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trophy Cabinet */}
          <section className="p-4 rounded-xl bg-[#f3ecde] border border-[#d6c7ae]">
            <div className="flex items-center gap-2 font-display font-bold text-sm mb-2">
              <Award className="w-4 h-4 text-amber-700" />
              <span>Deine gesammelten Saison-Trophäen ({gameState.unlockedTrophies.length}/4)</span>
            </div>
            {gameState.unlockedTrophies.length === 0 ? (
              <p className="text-xs text-[#5c4632]">
                Schließe Stufe 3 eines Saison-Events ab, um dauerhafte Hof-Trophäen zu sammeln.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-amber-900">
                {gameState.unlockedTrophies.map((tid) => (
                  <span key={tid} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-amber-300">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    {tid === 'spring_crown' && 'Blütenkranz-Trophäe'}
                    {tid === 'summer_sun' && 'Goldene Ähre'}
                    {tid === 'autumn_mushroom' && 'Goldener Steinpilz'}
                    {tid === 'winter_star' && 'Polarstern-Laterne'}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
