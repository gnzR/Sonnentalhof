import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  CloudSun,
  Coins,
  Package,
  RefreshCw,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Store,
  Users,
  X,
} from 'lucide-react';
import { CATALOG, CATALOG_BY_ID } from '../data/catalog';
import {
  getAlmanacBonuses,
  getHouseBonuses,
  getPartnerBonuses,
  getShopTrendContext,
  SHOP_ARCHETYPE_META,
} from '../engine/gameLogic';
import { GameState } from '../types/game';

interface FarmShopModalProps {
  gameState: GameState;
  onClose: () => void;
  onStockItem: (itemId: string, qty: number) => void;
  onUnstockItem: (itemId: string, qty: number) => void;
  onStockAll: () => void;
  onToggleAutoRestock: () => void;
  onFulfillSpecialOrder: () => void;
  onOpenCraft: () => void;
}

export const FarmShopModal: React.FC<FarmShopModalProps> = ({
  gameState,
  onClose,
  onStockItem,
  onUnstockItem,
  onStockAll,
  onToggleAutoRestock,
  onFulfillSpecialOrder,
  onOpenCraft,
}) => {
  const shop = gameState.farmShop;
  const houseBonuses = useMemo(() => getHouseBonuses(gameState.house), [gameState.house]);
  const almanacBonuses = useMemo(() => getAlmanacBonuses(gameState.almanac), [gameState.almanac]);
  const partnerBonuses = useMemo(() => getPartnerBonuses(gameState.romance), [gameState.romance]);
  const trend = useMemo(
    () => getShopTrendContext(gameState.season, gameState.weather),
    [gameState.season, gameState.weather]
  );

  const artisanCatalog = useMemo(
    () => CATALOG.filter((item) => item.category === 'artisan'),
    []
  );

  const getShopPrice = (baseSellPrice: number, isTrend: boolean) =>
    Math.round(
      baseSellPrice *
        1.15 *
        (isTrend ? 1.1 : 1.0) *
        houseBonuses.sellMult *
        almanacBonuses.sellMult *
        partnerBonuses.sellMult
    );

  const stockedEntries = useMemo(() => {
    return Object.entries(shop.stock || {})
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ item: CATALOG_BY_ID[id], qty }))
      .filter((entry) => Boolean(entry.item) && entry.item.category === 'artisan');
  }, [shop.stock]);

  const totalOnShelves = stockedEntries.reduce((sum, e) => sum + e.qty, 0);
  const backpackArtisanTotal = artisanCatalog.reduce(
    (sum, item) => sum + (gameState.inventory[item.id] || 0),
    0
  );

  const activeWorkerCount = (gameState.workers || []).filter((w) => !w.onStrike).length;
  const isColdStorageActive =
    activeWorkerCount >= 2 && gameState.house.floors >= 4 && gameState.house.extras.length >= 6;
  const reputation = shop.reputation ?? 10;
  const autoRestockEnabled = Boolean(shop.autoRestock);

  const trendNames = useMemo(
    () =>
      trend.favoredIds
        .map((id) => CATALOG_BY_ID[id]?.produceName)
        .filter(Boolean)
        .slice(0, 6)
        .join(' · '),
    [trend.favoredIds]
  );

  const specialOrder = shop.specialOrder;
  const orderMeta = specialOrder ? CATALOG_BY_ID[specialOrder.itemId] : undefined;
  const orderOwnedTotal = specialOrder
    ? (gameState.inventory[specialOrder.itemId] || 0) + (shop.stock[specialOrder.itemId] || 0)
    : 0;
  const canFulfillOrder = Boolean(
    specialOrder && !specialOrder.completed && orderOwnedTotal >= specialOrder.qty
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-5xl max-h-[88vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold">Hofladen (Direktverkauf ab Hof)</h2>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Bis zu 50 Dorfbewohner täglich direkt aus ihren 30 Dorf-Häusern – mit variablen Mengen, gemischten Körben &amp; +15 % Direktbonus.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Hofladen schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-[#efe6d5] border-b border-[#d6c7ae]">
          <div className="p-2.5 rounded-xl bg-[#faf6ee] border border-[#d6c7ae]">
            <div className="text-[11px] text-[#6e4a2e] font-semibold flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>Besucher heute</span>
            </div>
            <div className="font-mono-num tabular-nums text-base font-bold mt-0.5 text-[#2b2118]">
              {shop.visitorsToday} / {shop.dailyTargetVisitors}
            </div>
            <div className="text-[10px] text-[#5c4632]">
              Unterwegs: {shop.visitors.length} · max. 50/Tag
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#faf6ee] border border-[#d6c7ae]">
            <div className="text-[11px] text-[#6e4a2e] font-semibold flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
              <span>Im Regal</span>
            </div>
            <div className="font-mono-num tabular-nums text-base font-bold mt-0.5 text-[#2b2118]">
              {totalOnShelves} Stk.
            </div>
            <div className="text-[10px] text-[#5c4632]">
              {stockedEntries.length} Sorten{stockedEntries.length >= 4 ? ' · Vielfalt-Bonus aktiv' : ' · ab 4 Sorten Trinkgeld'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#faf6ee] border border-[#d6c7ae]">
            <div className="text-[11px] text-[#6e4a2e] font-semibold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>Umsatz heute</span>
            </div>
            <div className="font-mono-num tabular-nums text-base font-bold mt-0.5 text-emerald-800">
              +{shop.todayRevenue.toLocaleString('de-DE')} M
            </div>
            <div className="text-[10px] text-[#5c4632]">
              Hofladen-Ruf: {reputation}/100
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#faf6ee] border border-[#d6c7ae]">
            <div className="text-[11px] text-[#6e4a2e] font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Gesamt-Bilanz</span>
            </div>
            <div className="font-mono-num tabular-nums text-base font-bold mt-0.5 text-[#2b2118]">
              {shop.totalRevenue.toLocaleString('de-DE')} M
            </div>
            <div className="text-[10px] text-[#5c4632]">
              {shop.totalSoldCount} Stück verkauft
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Trend & Daily Special Order Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#f5efe3] border border-[#d6c7ae] flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div className="font-display font-bold text-sm flex items-center gap-2 text-[#2b2118]">
                  <CloudSun className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Tages-Trend: {trend.label}</span>
                </div>
                <p className="text-xs text-[#5c4632] leading-relaxed">{trend.description}</p>
              </div>
              <div className="text-[11px] text-[#6e4a2e] pt-2 border-t border-[#e2d5be]">
                Aktuell besonders begehrt: <span className="font-semibold text-[#2b2118]">{trendNames}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#fffdf8] border border-[#d6c7ae] flex flex-col justify-between gap-2.5">
              {specialOrder && orderMeta ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display font-bold text-sm text-[#2b2118]">
                        Vorbestellung am Tresen · {specialOrder.customerName}
                      </div>
                      <div className="text-xs text-[#5c4632] mt-0.5">
                        Gesucht:{' '}
                        <strong className="text-[#2b2118]">
                          {specialOrder.qty}× {orderMeta.produceName}
                        </strong>{' '}
                        · Vorhanden: {orderOwnedTotal}/{specialOrder.qty}
                      </div>
                    </div>
                    <div className="text-right font-mono-num tabular-nums text-xs shrink-0">
                      <div className="font-bold text-emerald-800">
                        +{specialOrder.rewardCoins.toLocaleString('de-DE')} M
                      </div>
                      <div className="text-[11px] text-[#6e4a2e]">
                        +{specialOrder.rewardXp} XP · +5 Ruf
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-1">
                    {specialOrder.completed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Heute bereits ausgeliefert</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canFulfillOrder}
                        onClick={onFulfillSpecialOrder}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          canFulfillOrder
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-[#efe6d5] text-[#7a644e] cursor-not-allowed'
                        }`}
                      >
                        {canFulfillOrder
                          ? 'Bestellung übergeben (+38 % Bonus)'
                          : `Es fehlen noch ${Math.max(0, specialOrder.qty - orderOwnedTotal)}×`}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-xs text-[#5c4632]">
                  Morgen früh wartet wieder eine neue Vorbestellung am Tresen.
                </div>
              )}
            </div>
          </div>

          {/* Shelves */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <Store className="w-4 h-4 text-[#6e4a2e]" />
                <span>Deine Auslage im Hofladen ({totalOnShelves} Produkte)</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleAutoRestock}
                  title={
                    activeWorkerCount > 0
                      ? 'Hofhelfer füllen leere Hofladen-Fächer automatisch bis 6 Stück aus dem Rucksack nach'
                      : 'Stelle mindestens 1 Hofhelfer ein, damit automatisch nachgefüllt werden kann'
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                    autoRestockEnabled
                      ? 'bg-emerald-700 border-emerald-800 text-white hover:bg-emerald-800'
                      : 'bg-[#efe6d5] border-[#cbb799] text-[#2b2118] hover:bg-[#e3d5be]'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    Helfer-Nachfüllung: {autoRestockEnabled ? 'An' : 'Aus'}
                    {activeWorkerCount === 0 ? ' (kein Helfer aktiv)' : ''}
                  </span>
                </button>
                {backpackArtisanTotal > 0 && (
                  <button
                    type="button"
                    onClick={onStockAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Alle Veredelungen einlegen ({backpackArtisanTotal})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenCraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e3d5be] border border-[#cbb799] text-[#2b2118] text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <ChefHat className="w-3.5 h-3.5 text-orange-700" />
                  <span>Zur Veredelung</span>
                </button>
              </div>
            </div>

            {(gameState.level >= 200 || isColdStorageActive) && (
              <div
                className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs ${
                  isColdStorageActive
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                {isColdStorageActive ? (
                  <>
                    <Snowflake className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      <strong>Kühlung aktiv (Kein Nachtverderb):</strong> 4. Etage + {activeWorkerCount} aktive Helfer + {gameState.house.extras.length} Haus-Extras schützen deine Auslage rund um die Uhr.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      <strong>Nachtverderb-Risiko (ab Lvl 200):</strong> Fächer mit &gt;3 Stk. verlieren um 00:00 Uhr ~15–20 %. Vollständiger Schutz ab: 4. Etage ({gameState.house.floors}/4) + 2 aktive Helfer ({activeWorkerCount}/2) + 6 Haus-Extras ({gameState.house.extras.length}/6).
                    </span>
                  </>
                )}
              </div>
            )}

            {stockedEntries.length === 0 ? (
              <div className="p-5 rounded-xl bg-[#f1e9da] border border-[#d6c7ae] text-xs text-[#5c4632]">
                Die Regale im Hofladen sind noch leer. Wähle unten veredelte Produkte aus deinem Rucksack aus, um sie Besuchern anzubieten!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stockedEntries.map(({ item, qty }) => {
                  const isTrend = trend.favoredIds.includes(item.id);
                  const unitPrice = getShopPrice(item.sellPrice, isTrend);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-amber-50/75 border-2 border-amber-400 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-9 h-9 rounded-lg border-2 border-black/15 flex items-center justify-center shrink-0"
                            style={{ backgroundColor: item.pixelColor }}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/15"
                              style={{ backgroundColor: item.accentColor }}
                            />
                          </span>
                          <div className="min-w-0">
                            <div className="font-display font-bold text-sm truncate">
                              {item.produceName}
                            </div>
                            <div className="text-[11px] font-mono-num tabular-nums text-emerald-800 font-semibold">
                              {unitPrice} M / Stk.{isTrend ? ' · +10 % Trend' : ' · +15 %'}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono-num tabular-nums text-xs font-bold text-[#4a321f] shrink-0">
                          ×{qty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                        <button
                          type="button"
                          onClick={() => onUnstockItem(item.id, 1)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-[#efe6d5] border border-[#d6c7ae] text-xs font-semibold"
                        >
                          -1 zurück
                        </button>
                        {qty > 1 && (
                          <button
                            type="button"
                            onClick={() => onUnstockItem(item.id, qty)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-rose-50 border border-[#d6c7ae] text-xs font-semibold text-rose-800"
                          >
                            Alle zurück
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* All Artisan Items from Backpack */}
          <section className="space-y-3">
            <div>
              <h3 className="font-display font-bold text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-700" />
                <span>Veredelte Produkte für den Hofladen (Alle {artisanCatalog.length} Sorten verkaufbar)</span>
              </h3>
              <p className="text-xs text-[#5c4632] mt-0.5">
                Wanderer nehmen gemischte Körbe, Dorfkochs größere Mengen und Feinschmecker geben extra Trinkgeld.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {artisanCatalog.map((item) => {
                const owned = gameState.inventory[item.id] || 0;
                const onShelf = shop.stock[item.id] || 0;
                const isTrend = trend.favoredIds.includes(item.id);
                const shopPrice = getShopPrice(item.sellPrice, isTrend);

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                      owned > 0
                        ? 'bg-[#fffdf8] border-[#c5b091]'
                        : 'bg-[#f5efe3]/70 border-[#e0d5c1] opacity-85'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-9 h-9 rounded-lg border-2 border-black/15 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: item.pixelColor }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/15"
                            style={{ backgroundColor: item.accentColor }}
                          />
                        </span>
                        <div className="min-w-0">
                          <div className="font-display font-bold text-sm truncate">
                            {item.produceName}
                          </div>
                          <div className="text-[11px] font-mono-num tabular-nums text-[#6e4a2e]">
                            {shopPrice} M{isTrend ? ' · Trend +10 %' : ''}
                            {onShelf > 0 ? ` · ${onShelf} im Regal` : ''}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`font-mono-num tabular-nums text-xs font-bold shrink-0 ${
                          owned > 0 ? 'text-emerald-800' : 'text-[#7a644e]'
                        }`}
                      >
                        ×{owned}
                      </span>
                    </div>

                    {owned > 0 ? (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-[#ece2d0]">
                        <button
                          type="button"
                          onClick={() => onStockItem(item.id, 1)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                        >
                          +1 anbieten
                        </button>
                        {owned >= 5 && (
                          <button
                            type="button"
                            onClick={() => onStockItem(item.id, 5)}
                            className="py-1.5 px-2.5 rounded-lg bg-[#efe6d5] hover:bg-[#e3d5be] text-[#2b2118] text-xs font-semibold"
                          >
                            +5
                          </button>
                        )}
                        {owned > 1 && (
                          <button
                            type="button"
                            onClick={() => onStockItem(item.id, owned)}
                            className="py-1.5 px-2.5 rounded-lg bg-[#4a321f] hover:bg-[#3a2617] text-white text-xs font-semibold"
                          >
                            Alle
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 border-t border-[#e5dac6] text-[11px] text-[#6e4a2e]">
                        <span>Nicht im Rucksack</span>
                        <button
                          type="button"
                          onClick={onOpenCraft}
                          className="font-semibold text-orange-800 hover:underline"
                        >
                          Herstellen →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Sales Log */}
          <section className="space-y-2.5">
            <h3 className="font-display font-bold text-base">Letzte Besucher-Käufe</h3>
            {(shop.recentSales || []).length === 0 ? (
              <div className="p-4 rounded-xl bg-[#f1e9da] border border-[#d6c7ae] text-xs text-[#5c4632]">
                Noch keine Käufe protokolliert. Sobald Produkte in der Auslage liegen, greifen die Gäste zu!
              </div>
            ) : (
              <div className="rounded-xl border border-[#d6c7ae] bg-[#fffdf8] divide-y divide-[#ece2d0]">
                {shop.recentSales.map((sale, idx) => {
                  const meta = CATALOG_BY_ID[sale.itemId];
                  const roleLabel = sale.buyerArchetype
                    ? SHOP_ARCHETYPE_META[sale.buyerArchetype]?.label
                    : undefined;
                  return (
                    <div
                      key={`${sale.day}-${sale.ingameTime}-${sale.itemId}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 text-[#5c4632]">
                        <span className="font-mono-num tabular-nums text-[#6e4a2e]">
                          Tag {sale.day} · {sale.ingameTime}
                        </span>
                        {sale.buyerName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[#2b2118]">{sale.buyerName}</span>
                          </>
                        )}
                        {roleLabel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{roleLabel}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#2b2118]">
                          {sale.qty}× {meta?.produceName || sale.itemId}
                        </span>
                      </div>
                      <span className="font-mono-num tabular-nums font-bold text-emerald-800">
                        +{sale.coins.toLocaleString('de-DE')} M
                        {sale.tipCoins ? ` (inkl. +${sale.tipCoins} Trinkgeld)` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
