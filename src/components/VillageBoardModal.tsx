import React from 'react';
import { Award, Check, ClipboardList, Coins, Home, Package, Sparkles, Store, X } from 'lucide-react';
import { CATALOG_BY_ID } from '../data/catalog';
import { VILLAGE_HOUSES } from '../data/village';
import { createInitialVillageBoardState } from '../engine/gameLogic';
import { GameState } from '../types/game';

interface VillageBoardModalProps {
  gameState: GameState;
  onClose: () => void;
  onDeliverOrder: (orderId: string) => void;
}

export const VillageBoardModal: React.FC<VillageBoardModalProps> = ({
  gameState,
  onClose,
  onDeliverOrder,
}) => {
  const board =
    gameState.villageBoard ||
    createInitialVillageBoardState(gameState.day, gameState.level, gameState.season);
  const completedToday = board.orders.filter((o) => o.completed).length;
  const shopRep = Math.round(gameState.farmShop?.reputation ?? 10);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-3 min-w-0">
            <ClipboardList className="w-6 h-6 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold truncate">
                Schwarzes Brett am Dorfplatz
              </h2>
              <p className="text-xs text-amber-200/90 mt-0.5 font-mono-num truncate">
                Tag {gameState.day} · {completedToday}/{board.orders.length} heutige Lieferungen · Hofladen-Ruf {shopRep}/100 · Gesamt: {board.completedTotal}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Schwarzes Brett schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Progress Banner */}
        <div className="px-6 py-3.5 bg-[#efe6d5] border-b border-[#d6c7ae] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#4a321f] leading-relaxed">
            <strong>Direkte Dorf-Bestellungen:</strong> Einwohner aus den {VILLAGE_HOUSES.length} Häusern von Sonnental-Dorf bestellen täglich frische Hofwaren. Lieferungen bringen <strong>+48 % Bonus-Erlös</strong>, Hof-XP und steigern deinen <strong>Hofladen-Ruf</strong>.
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 font-mono-num whitespace-nowrap">
            <Award className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Tages-Bonus (3/3): +{150 + gameState.level * 12} Münzen</span>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {board.orders.map((order, idx) => {
              const item = CATALOG_BY_ID[order.itemId];
              const bonusItem = order.bonusItemId ? CATALOG_BY_ID[order.bonusItemId] : null;
              const owned = gameState.inventory[order.itemId] || 0;
              const canDeliver = !order.completed && owned >= order.qty;

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-colors ${
                    order.completed
                      ? 'bg-emerald-50/75 border-emerald-300 opacity-85'
                      : 'bg-white border-[#d6c7ae]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-[#785c42]">
                          Aushang {idx + 1} · {order.houseName}
                        </div>
                        <h3 className="font-display font-bold text-base text-[#2b2118] truncate mt-0.5">
                          {order.residentName}
                        </h3>
                      </div>
                      <Home className="w-4 h-4 text-[#8f7758] shrink-0 mt-1" />
                    </div>

                    <div className="p-3 rounded-lg bg-[#f6efe2] border border-[#e3d5be] flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border-2 border-black/15 shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: item?.pixelColor || '#94a3b8' }}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20"
                          style={{ backgroundColor: item?.accentColor || '#ffffff' }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm truncate">
                          {order.qty}× {item?.produceName || order.itemId}
                        </div>
                        <div
                          className={`text-xs font-mono-num ${
                            owned >= order.qty ? 'text-emerald-800 font-semibold' : 'text-[#5c4632]'
                          }`}
                        >
                          Vorrat: {owned} / {order.qty}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-[#4a321f] font-mono-num">
                      <div className="flex items-center justify-between">
                        <span className="text-[#5c4632] flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-600" />
                          Belohnung:
                        </span>
                        <strong>{order.rewardCoins.toLocaleString('de-DE')} M</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#5c4632] flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          Erfahrung:
                        </span>
                        <strong>+{order.rewardXp} XP</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#5c4632] flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-rose-700" />
                          Hofladen-Ruf:
                        </span>
                        <strong>+{order.rewardReputation} Ruf</strong>
                      </div>
                      {order.neighborId && (
                        <div className="text-[11px] text-sky-800 font-sans pt-0.5">
                          +12 Freundschaft mit {order.residentName}
                        </div>
                      )}
                      {bonusItem && order.bonusQty && (
                        <div className="text-[11px] text-emerald-800 font-sans pt-0.5 flex items-center gap-1">
                          <Package className="w-3 h-3 shrink-0" />
                          <span>Extra: +{order.bonusQty}× {bonusItem.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#efe6d5]">
                    {order.completed ? (
                      <div className="w-full py-2.5 px-4 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <Check className="w-4 h-4" />
                        <span>Geliefert</span>
                      </div>
                    ) : (
                      <button
                        disabled={!canDeliver}
                        onClick={() => onDeliverOrder(order.id)}
                        className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                          canDeliver
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                            : 'bg-[#e8decb] text-[#8f7758] cursor-not-allowed'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        <span>{canDeliver ? 'Bestellung ausliefern' : 'Ware fehlt im Lager'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
