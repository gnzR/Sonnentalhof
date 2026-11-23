import React, { useState } from 'react';
import { Check, Coins, Droplets, Lock, MapPin, Package, ShoppingBag, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react';
import { CATALOG, CATALOG_BY_ID, SEASON_LABELS, WATERING_CAN_TIERS } from '../data/catalog';
import { EXPANSION_COSTS, formatDurationMs, getAlmanacBonuses, getHouseBonuses, getMarketCrashMult, getPartnerBonuses } from '../engine/gameLogic';
import { GameState, ItemCategory } from '../types/game';

interface MarketModalProps {
  gameState: GameState;
  onClose: () => void;
  onSellItem: (itemId: string, qty: number) => void;
  onSellAll: () => void;
  onCompleteOrder: (orderId: string) => void;
  onBuyItem: (itemId: string, qty: number) => void;
  onBuyFertilizer: (qty: number) => void;
  onUpgradeWateringCan: (tier: 2 | 3 | 4) => void;
  onExpandFarm: (nextRing: number) => void;
}

export const MarketModal: React.FC<MarketModalProps> = ({
  gameState,
  onClose,
  onSellItem,
  onSellAll,
  onCompleteOrder,
  onBuyItem,
  onBuyFertilizer,
  onUpgradeWateringCan,
  onExpandFarm,
}) => {
  const [tab, setTab] = useState<'sell' | 'buy' | 'expand'>('sell');
  const [buyFilter, setBuyFilter] = useState<'all' | ItemCategory>('all');

  const inventoryEntries = Object.entries(gameState.inventory).filter(([, qty]) => qty > 0);
  const hotSet = new Set(gameState.marketHotItems);
  const crashedItems = gameState.marketCrashedItems || [];
  const crashedSet = new Set(crashedItems);
  const houseBonuses = getHouseBonuses(gameState.house);
  const almanacBonuses = getAlmanacBonuses(gameState.almanac);
  const partnerBonuses = getPartnerBonuses(gameState.romance);

  const getPrice = (itemId: string) => {
    const base = CATALOG_BY_ID[itemId]?.sellPrice || 0;
    const hotMult = hotSet.has(itemId) ? 1.3 : 1;
    const crashMult = getMarketCrashMult(gameState, itemId);
    return Math.round(
      base * hotMult * crashMult * houseBonuses.sellMult * almanacBonuses.sellMult * partnerBonuses.sellMult
    );
  };

  const totalSellValue = inventoryEntries.reduce((sum, [id, qty]) => sum + getPrice(id) * qty, 0);

  const filteredCatalog = CATALOG.filter((item) => {
    if (
      item.category === 'fish' ||
      item.category === 'artisan' ||
      item.category === 'meat' ||
      item.isMerchantExclusive ||
      item.isFairExclusive ||
      item.isGiftExclusive ||
      item.isMineExclusive
    ) {
      return false;
    }
    if (item.isEventExclusive && !item.seasons.includes(gameState.season)) return false;
    if (buyFilter === 'all') return true;
    return item.category === buyFilter;
  });

  const nextRing = gameState.unlockedRing + 1;
  const expansion = EXPANSION_COSTS[nextRing];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl max-h-[86vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div>
            <h2 className="font-display text-xl font-bold">Lokaler Bauernmarkt</h2>
            <p className="text-xs text-amber-200/90 mt-0.5">
              {SEASON_LABELS[gameState.season]} · Tag {gameState.day} · Dein Kapital: {gameState.coins.toLocaleString('de-DE')} Münzen
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Markt schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 bg-[#efe6d5] border-b border-[#d6c7ae]">
          <button
            onClick={() => setTab('sell')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === 'sell' ? 'bg-[#4a321f] text-white' : 'text-[#4a321f] hover:bg-[#e3d5be]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Ernte verkaufen ({inventoryEntries.reduce((s, [, q]) => s + q, 0)})</span>
          </button>
          <button
            onClick={() => setTab('buy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === 'buy' ? 'bg-[#4a321f] text-white' : 'text-[#4a321f] hover:bg-[#e3d5be]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Saatgut, Pilze, Tiere & Deko</span>
          </button>
          <button
            onClick={() => setTab('expand')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === 'expand' ? 'bg-[#4a321f] text-white' : 'text-[#4a321f] hover:bg-[#e3d5be]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Hof erweitern</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tab === 'sell' && (
            <>
              {/* Hot Items Today */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-base">Heutige Tagesangebote (+30% Erlös)</h3>
                  <span className="text-xs text-[#5c4632]">Wechseln jeden Ingame-Tag</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {gameState.marketHotItems.map((id) => {
                    const item = CATALOG_BY_ID[id];
                    if (!item) return null;
                    return (
                      <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-300">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-sm border border-black/20 shrink-0"
                            style={{ backgroundColor: item.pixelColor }}
                          />
                          <div>
                            <div className="font-semibold text-sm">{item.produceName}</div>
                            <div className="text-xs text-amber-800 font-mono-num">
                              {getPrice(id)} Münzen / Stk.
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {crashedItems.length > 0 && (
                <section className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-display font-bold text-sm text-rose-900">
                      <TrendingDown className="w-4 h-4 text-rose-700 shrink-0" />
                      <span>Heutiger Markt-Preissturz (-30 % Erlös)</span>
                    </div>
                    <span className="text-[11px] text-rose-800">
                      Besser morgen verkaufen oder veredeln
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {crashedItems.map((id) => {
                      const item = CATALOG_BY_ID[id];
                      if (!item) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-rose-200"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-sm border border-black/20 shrink-0"
                              style={{ backgroundColor: item.pixelColor }}
                            />
                            <div>
                              <div className="font-semibold text-xs text-[#2b2118]">{item.produceName}</div>
                              <div className="text-[11px] text-rose-700 font-mono-num">
                                Aktuell {getPrice(id)} Münzen / Stk. (-30 %)
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Stored Harvest Inventory */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-base">Deine Ernte-Vorräte</h3>
                  {inventoryEntries.length > 0 && (
                    <button
                      onClick={onSellAll}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors"
                    >
                      <Coins className="w-4 h-4" />
                      <span>Alles verkaufen (+{totalSellValue.toLocaleString('de-DE')} Münzen)</span>
                    </button>
                  )}
                </div>

                {inventoryEntries.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#f3ecde] border border-[#d6c7ae] text-center text-sm text-[#5c4632]">
                    Dein Marktstand ist noch leer. Ernte zuerst reife Pflanzen, Pilze oder Tierprodukte auf deinem Hof!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inventoryEntries.map(([id, qty]) => {
                      const item = CATALOG_BY_ID[id];
                      if (!item) return null;
                      const unitPrice = getPrice(id);
                      const isHot = hotSet.has(id);
                      const isCrashed = crashedSet.has(id);
                      return (
                        <div
                          key={id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border ${
                            isCrashed ? 'bg-rose-50/40 border-rose-300' : 'bg-white border-[#d6c7ae]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg border border-black/15 shrink-0"
                              style={{ backgroundColor: item.pixelColor }}
                            />
                            <div>
                              <div className="font-semibold text-sm flex items-center gap-1.5">
                                <span>{item.produceName}</span>
                                <span className="font-mono-num text-xs text-[#6e4a2e]">×{qty}</span>
                              </div>
                              <div className="text-xs text-[#5c4632] font-mono-num flex flex-wrap items-center gap-1.5">
                                <span>{unitPrice} Münzen/Stk.</span>
                                {isHot && <span className="text-amber-700 font-semibold">· +30% heute</span>}
                                {isCrashed && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    Preissturz -30 %
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onSellItem(id, 1)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e2d3ba] text-xs font-semibold"
                            >
                              1×
                            </button>
                            <button
                              onClick={() => onSellItem(id, qty)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                            >
                              Alle ({unitPrice * qty})
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Village Direct Orders */}
              <section>
                <h3 className="font-display font-bold text-base mb-3">Dorf-Bestellungen (Extra XP & Münzen)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {gameState.marketOrders.map((order) => {
                    const item = CATALOG_BY_ID[order.itemId];
                    const owned = gameState.inventory[order.itemId] || 0;
                    const canDeliver = !order.completed && owned >= order.qty;
                    return (
                      <div
                        key={order.id}
                        className={`p-4 rounded-xl border ${
                          order.completed
                            ? 'bg-emerald-50/70 border-emerald-200 opacity-75'
                            : 'bg-white border-[#d6c7ae]'
                        }`}
                      >
                        <div className="font-display font-bold text-sm">{order.customerName}</div>
                        <div className="text-xs text-[#5c4632] mt-1">
                          Sucht: <strong className="text-[#2b2118]">{order.qty}× {item?.produceName}</strong>
                        </div>
                        <div className="text-xs text-[#5c4632] font-mono-num mt-1">
                          Lager: {owned}/{order.qty} · Belohnung: {order.rewardCoins} Münzen + {order.rewardXp} XP
                        </div>
                        <button
                          disabled={!canDeliver}
                          onClick={() => onCompleteOrder(order.id)}
                          className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            order.completed
                              ? 'bg-emerald-100 text-emerald-800'
                              : canDeliver
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'bg-[#e8decb] text-[#8f7758] cursor-not-allowed'
                          }`}
                        >
                          {order.completed ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Geliefert
                            </>
                          ) : (
                            <>
                              <Package className="w-3.5 h-3.5" /> Lieferung abgeben
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

          {tab === 'buy' && (
            <div className="space-y-4">
              {/* Filter bar + Quick Fertilizer purchase */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-[#efe6d5] p-1 rounded-lg">
                  {(
                    [
                      ['all', 'Alle'],
                      ['crop', 'Pflanzen'],
                      ['mushroom', 'Pilze'],
                      ['tree', 'Obstbäume'],
                      ['animal', 'Tiere'],
                      ['decoration', 'Dekoration'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setBuyFilter(key)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                        buyFilter === key ? 'bg-[#4a321f] text-white' : 'text-[#4a321f] hover:bg-[#e2d3ba]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-semibold">Hof-Dünger (+50% Tempo)</span>
                  <button
                    disabled={gameState.coins < 35}
                    onClick={() => onBuyFertilizer(1)}
                    className="px-2.5 py-1 rounded bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-40"
                  >
                    1× (35 M)
                  </button>
                  <button
                    disabled={gameState.coins < 160}
                    onClick={() => onBuyFertilizer(5)}
                    className="px-2.5 py-1 rounded bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-40"
                  >
                    5× (160 M)
                  </button>
                </div>
              </div>

              {/* Watering Can Upgrades */}
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Droplets className="w-5 h-5 text-sky-600 shrink-0" />
                  <div className="text-xs">
                    <div className="font-display font-bold text-sm text-[#1e293b]">
                      Gießkannen-Werkstatt · Aktuell: {WATERING_CAN_TIERS[gameState.wateringCanTier || 1].name} ({WATERING_CAN_TIERS[gameState.wateringCanTier || 1].reachLabel})
                    </div>
                    <div className="text-[#475569]">
                      Größere Gießkannen bewässern mehrere Felder gleichzeitig. Automatische Sprinkler findest du unter „Dekoration“!
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {([2, 3, 4] as const).map((tierNum) => {
                    const info = WATERING_CAN_TIERS[tierNum];
                    const owned = (gameState.wateringCanTier || 1) >= tierNum;
                    const isNext = (gameState.wateringCanTier || 1) + 1 === tierNum;
                    const canBuy = isNext && gameState.level >= info.minLevel && gameState.coins >= info.cost;
                    return (
                      <button
                        key={tierNum}
                        disabled={!canBuy}
                        onClick={() => onUpgradeWateringCan(tierNum)}
                        title={info.description}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          owned
                            ? 'bg-emerald-700 text-white'
                            : canBuy
                            ? 'bg-sky-700 hover:bg-sky-800 text-white'
                            : 'bg-sky-100 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {owned
                          ? `${info.name} ✓`
                          : gameState.level < info.minLevel
                          ? `${info.name} (${info.reachLabel} · Lvl ${info.minLevel})`
                          : !isNext
                          ? `${info.name} (erst Stufe ${tierNum - 1})`
                          : `${info.name} (${info.reachLabel}) · ${info.cost.toLocaleString('de-DE')} M`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Catalog Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCatalog.map((item) => {
                  const locked = gameState.level < item.unlockLevel;
                  const ownedSeeds = gameState.seeds[item.id] || 0;
                  const canAfford1 = gameState.coins >= item.seedCost && !locked;
                  const canAfford5 = gameState.coins >= item.seedCost * 5 && !locked;

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col justify-between p-4 rounded-xl border ${
                        locked ? 'bg-[#f1ece1] border-[#d6c7ae] opacity-75' : 'bg-white border-[#d6c7ae]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg border border-black/20 shrink-0 mt-0.5"
                          style={{ backgroundColor: item.pixelColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-display font-bold text-sm truncate">{item.name}</h4>
                            {ownedSeeds > 0 && (
                              <span className="font-mono-num text-xs font-semibold text-emerald-800 whitespace-nowrap">
                                Vorrat: {ownedSeeds}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#5c4632] mt-1 leading-relaxed">{item.description}</p>
                          <div className="text-[11px] text-[#6e4a2e] font-mono-num mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
                            {item.growthMs > 0 && <span>Dauer: {formatDurationMs(item.growthMs)}</span>}
                            {item.category !== 'decoration' && <span>· Verkauf: {item.sellPrice} M</span>}
                            <span>· +{item.xpReward} XP</span>
                            <span>· Saison: {item.seasons.map((s) => SEASON_LABELS[s]).join(', ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#efe6d5] flex items-center justify-between gap-2">
                        {locked ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#785c42]">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Freigeschaltet ab Level {item.unlockLevel}</span>
                          </div>
                        ) : (
                          <>
                            <span className="font-mono-num text-xs font-bold text-[#2b2118]">
                              {item.seedCost} Münzen
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                disabled={!canAfford1}
                                onClick={() => onBuyItem(item.id, 1)}
                                className="px-3 py-1.5 rounded-lg bg-[#4a321f] text-white text-xs font-semibold hover:bg-[#3a2617] disabled:opacity-40 transition-colors"
                              >
                                1× kaufen
                              </button>
                              <button
                                disabled={!canAfford5}
                                onClick={() => onBuyItem(item.id, 5)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-40 transition-colors"
                              >
                                5× ({item.seedCost * 5})
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'expand' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-white border border-[#d6c7ae]">
                <h3 className="font-display font-bold text-lg">Hoferweiterung im Sonnental</h3>
                <p className="text-sm text-[#5c4632] mt-1">
                  Vergrößere dein Anbaugebiet schrittweise von 8×8 auf bis zu 20×20 Felder (400 Felder) für mehr Tiere, Pilzbeete und Windmühlen.
                </p>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((ring) => {
                    const info = EXPANSION_COSTS[ring];
                    const owned = gameState.unlockedRing >= ring;
                    const isNext = gameState.unlockedRing + 1 === ring;
                    const meetsLevel = gameState.level >= info.minLevel;
                    const canBuy = isNext && meetsLevel && gameState.coins >= info.cost;

                    return (
                      <div
                        key={ring}
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          owned
                            ? 'bg-emerald-50 border-emerald-300'
                            : isNext
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-[#f4efe4] border-[#d6c7ae] opacity-75'
                        }`}
                      >
                        <div>
                          <div className="font-display font-bold text-sm">Ausbaustufe {ring}</div>
                          <div className="text-xs text-[#5c4632] mt-1">{info.label}</div>
                          <div className="font-mono-num text-xs mt-2 text-[#4a321f]">
                            Ab Level {info.minLevel} · {info.cost.toLocaleString('de-DE')} Münzen
                          </div>
                        </div>
                        <button
                          disabled={!canBuy}
                          onClick={() => onExpandFarm(ring)}
                          className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold ${
                            owned
                              ? 'bg-emerald-700 text-white'
                              : canBuy
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-[#dfd4bf] text-[#7c664e] cursor-not-allowed'
                          }`}
                        >
                          {owned
                            ? 'Bereits freigeschaltet'
                            : !isNext
                            ? 'Vorherige Stufe nötig'
                            : !meetsLevel
                            ? `Benötigt Level ${info.minLevel}`
                            : `Für ${info.cost.toLocaleString('de-DE')} Münzen kaufen`}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {!expansion && (
                  <p className="mt-4 text-sm font-semibold text-emerald-800">
                    Glückwunsch! Du besitzt bereits das gesamte Sonnental-Landgut (20×20).
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
