import React from 'react';
import { ArrowLeftRight, Check, Clock, Coins, Compass, Fish, Package, Sparkles, X } from 'lucide-react';
import { CATALOG_BY_ID } from '../data/catalog';
import { formatDurationMs } from '../engine/gameLogic';
import { GameState } from '../types/game';

interface MerchantModalProps {
  gameState: GameState;
  onClose: () => void;
  onBuyOffer: (offerId: string) => void;
  onCompleteTrade: (tradeId: string) => void;
}

export const MerchantModal: React.FC<MerchantModalProps> = ({
  gameState,
  onClose,
  onBuyOffer,
  onCompleteTrade,
}) => {
  const merchant = gameState.merchant;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-3">
            <Compass className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold">Wanderhändler Bruno an der Brücke</h2>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {merchant?.active
                  ? `Noch ${formatDurationMs(merchant.remainingMs)} am Dorfeingang · Kapital: ${gameState.coins.toLocaleString('de-DE')} Münzen`
                  : `Bruno ist gerade weitergezogen · Nächster Besuch in ${formatDurationMs(merchant?.cooldownMs ?? 0)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Wanderhändler schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!merchant?.active ? (
            <div className="p-8 rounded-2xl bg-white border border-[#d6c7ae] text-center space-y-3">
              <Compass className="w-10 h-10 text-amber-600 mx-auto" />
              <h3 className="font-display font-bold text-lg">Brunos Planwagen ist unterwegs</h3>
              <p className="text-sm text-[#5c4632] max-w-md mx-auto">
                Bruno zieht durch die umliegenden Täler und macht alle paar Minuten an der südlichen Holzbrücke halt.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-mono-num font-bold">
                <Clock className="w-4 h-4" />
                <span>Nächste Ankunft in {formatDurationMs(merchant?.cooldownMs ?? 0)}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Active Status Banner */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-amber-950 space-y-0.5">
                  <div className="font-display font-bold text-sm">
                    „Willkommen am Wagen! Schau dir meine seltenen Mitbringsel an.“
                  </div>
                  <div>
                    Aktuell im Rucksack:{' '}
                    <strong className="font-mono-num">{gameState.fishingBaitCharges || 0}× Profi-Angelköder</strong>
                    {' · '}
                    <strong className="font-mono-num">{gameState.growthElixirCount || 0}× Wachstums-Elixier</strong>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-mono-num font-bold text-amber-900">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDurationMs(merchant.remainingMs)}</span>
                </div>
              </div>

              {/* Special Offers for Coins */}
              <section className="space-y-3">
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Seltene Reise-Angebote (Gegen Münzen)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {merchant.offers.map((offer) => {
                    const soldOut = offer.stock <= 0;
                    const canAfford = gameState.coins >= offer.costCoins && !soldOut;
                    const itemMeta = offer.itemId ? CATALOG_BY_ID[offer.itemId] : null;
                    return (
                      <div
                        key={offer.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                          soldOut ? 'bg-[#f1ece1] border-[#d6c7ae] opacity-70' : 'bg-white border-[#d6c7ae]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-lg border-2 border-black/15 shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor:
                                itemMeta?.pixelColor ||
                                (offer.kind === 'bait'
                                  ? '#0284c7'
                                  : offer.kind === 'elixir'
                                  ? '#a855f7'
                                  : '#16a34a'),
                            }}
                          >
                            {offer.kind === 'bait' ? (
                              <Fish className="w-5 h-5 text-white" />
                            ) : (
                              <Sparkles className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-display font-bold text-sm truncate">{offer.title}</h4>
                              <span className="font-mono-num text-[11px] font-semibold text-[#5c4632] shrink-0">
                                Vorrat: {offer.stock}
                              </span>
                            </div>
                            <p className="text-xs text-[#5c4632] mt-1 leading-snug">{offer.description}</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#efe6d5] flex items-center justify-between gap-2">
                          <span className="font-mono-num text-xs font-bold flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-600" />
                            {offer.costCoins.toLocaleString('de-DE')} Münzen
                          </span>
                          <button
                            disabled={!canAfford}
                            onClick={() => onBuyOffer(offer.id)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              soldOut
                                ? 'bg-[#dfd4bf] text-[#7c664e]'
                                : canAfford
                                ? 'bg-[#4a321f] hover:bg-[#3a2617] text-white'
                                : 'bg-[#e8decb] text-[#8f7758] cursor-not-allowed'
                            }`}
                          >
                            {soldOut ? 'Ausverkauft' : 'Kaufen'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Barter Trades */}
              <section className="space-y-3">
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-emerald-700" />
                  <span>Tauschhandel am Planwagen</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {merchant.trades.map((trade) => {
                    const giveMeta = CATALOG_BY_ID[trade.giveItemId];
                    const owned = gameState.inventory[trade.giveItemId] || 0;
                    const canTrade = !trade.completed && owned >= trade.giveQty;

                    const rewardLabel =
                      trade.rewardKind === 'bait'
                        ? `${trade.rewardQty}× Profi-Angelköder`
                        : trade.rewardKind === 'fertilizer'
                        ? `${trade.rewardQty}× Hof-Dünger`
                        : trade.rewardKind === 'coins'
                        ? `${trade.rewardCoins || 0} Münzen`
                        : `${trade.rewardQty}× ${CATALOG_BY_ID[trade.rewardItemId || '']?.name || 'Hofobjekt'}`;

                    return (
                      <div
                        key={trade.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                          trade.completed
                            ? 'bg-emerald-50/70 border-emerald-200 opacity-75'
                            : 'bg-white border-[#d6c7ae]'
                        }`}
                      >
                        <div>
                          <div className="font-display font-bold text-sm">{trade.title}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#f5efe3] border border-[#d6c7ae]">
                              <Package className="w-3.5 h-3.5 text-[#6e4a2e]" />
                              <span>
                                Gib: <strong>{trade.giveQty}× {giveMeta?.produceName || trade.giveItemId}</strong>
                              </span>
                            </span>
                            <span className="text-[#6e4a2e] font-bold">→</span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
                              {rewardLabel}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono-num text-[#5c4632] mt-2">
                            In deinem Vorrat: {owned}/{trade.giveQty}
                          </div>
                        </div>

                        <button
                          disabled={!canTrade}
                          onClick={() => onCompleteTrade(trade.id)}
                          className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            trade.completed
                              ? 'bg-emerald-100 text-emerald-800'
                              : canTrade
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-[#e8decb] text-[#8f7758] cursor-not-allowed'
                          }`}
                        >
                          {trade.completed ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Eingetauscht
                            </>
                          ) : (
                            <>
                              <ArrowLeftRight className="w-3.5 h-3.5" /> Jetzt tauschen
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
