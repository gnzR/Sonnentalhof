import React, { useMemo, useState } from 'react';
import {
  Backpack,
  Coins,
  Fish,
  Flower2,
  Hammer,
  Package,
  Search,
  Sparkles,
  Sprout,
  Store,
  Tractor,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { CATALOG, CATALOG_BY_ID, WATERING_CAN_TIERS } from '../data/catalog';
import { getAlmanacBonuses, getHouseBonuses, getMarketCrashMult, getPartnerBonuses } from '../engine/gameLogic';
import { CatalogItem, GameState, ItemCategory } from '../types/game';

interface InventoryModalProps {
  gameState: GameState;
  onClose: () => void;
  onEquipPlaceable: (itemId: string) => void;
  onEquipFertilizer: () => void;
  onUseGrowthElixir: () => void;
  onSellProduct: (itemId: string, qty: number) => void;
  onSellAllProducts: () => void;
  onEatFeastDish: (itemId: string) => void;
  onOpenMarket: () => void;
}

type InventoryTab = 'all' | 'placeable' | 'decoration' | 'animal' | 'plantable' | 'products';

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  crop: 'Saatgut',
  mushroom: 'Pilzsporen',
  tree: 'Obstbaum',
  animal: 'Nutztier',
  decoration: 'Dekoration & Bau',
  fish: 'Fisch',
  artisan: 'Hof-Spezialität',
  meat: 'Frischfleisch (Luxus)',
};

const PLACEMENT_HINT: Record<'crop' | 'mushroom' | 'tree' | 'animal' | 'decoration', string> = {
  crop: 'Setzbar auf Ackerboden (Hacke [2])',
  mushroom: 'Setzbar auf Ackerboden (Hacke [2])',
  tree: 'Setzbar auf Wiese oder Hofweg',
  animal: 'Setzbar auf Wiese oder Hofweg',
  decoration: 'Setzbar auf Wiese oder Hofweg',
};

export const InventoryModal: React.FC<InventoryModalProps> = ({
  gameState,
  onClose,
  onEquipPlaceable,
  onEquipFertilizer,
  onUseGrowthElixir,
  onSellProduct,
  onSellAllProducts,
  onEatFeastDish,
  onOpenMarket,
}) => {
  const [tab, setTab] = useState<InventoryTab>('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const hotSet = useMemo(() => new Set(gameState.marketHotItems), [gameState.marketHotItems]);
  const crashedSet = useMemo(
    () => new Set(gameState.marketCrashedItems || []),
    [gameState.marketCrashedItems]
  );
  const houseBonuses = useMemo(() => getHouseBonuses(gameState.house), [gameState.house]);
  const almanacBonuses = useMemo(() => getAlmanacBonuses(gameState.almanac), [gameState.almanac]);
  const partnerBonuses = useMemo(() => getPartnerBonuses(gameState.romance), [gameState.romance]);

  const placeableEntries = useMemo(() => {
    return CATALOG.filter((item) => {
      const qty = gameState.seeds[item.id] || 0;
      if (qty <= 0) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) {
        return false;
      }
      if (tab === 'decoration') return item.category === 'decoration';
      if (tab === 'animal') return item.category === 'animal';
      if (tab === 'plantable') {
        return item.category === 'crop' || item.category === 'mushroom' || item.category === 'tree';
      }
      if (tab === 'products') return false;
      return true;
    });
  }, [gameState.seeds, q, tab]);

  const showFertilizer =
    gameState.fertilizerCount > 0 &&
    (tab === 'all' || tab === 'placeable' || tab === 'plantable') &&
    (!q || 'hof-dünger'.includes(q) || 'dünger'.includes(q) || 'nährstoff'.includes(q));

  const growthElixirCount = gameState.growthElixirCount || 0;
  const baitCount = gameState.fishingBaitCharges || 0;

  const showElixir =
    growthElixirCount > 0 &&
    (tab === 'all' || tab === 'placeable' || tab === 'plantable') &&
    (!q || 'wachstums-elixier'.includes(q) || 'elixier'.includes(q) || 'bruno'.includes(q));

  const showBait =
    baitCount > 0 &&
    (tab === 'all' || tab === 'placeable') &&
    (!q || 'profi-angelköder'.includes(q) || 'köder'.includes(q) || 'angel'.includes(q));

  const productEntries = useMemo(() => {
    if (tab !== 'all' && tab !== 'products') return [];
    return Object.entries(gameState.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ item: CATALOG_BY_ID[id], qty }))
      .filter((entry): entry is { item: CatalogItem; qty: number } => Boolean(entry.item))
      .filter(({ item }) => {
        if (!q) return true;
        return (
          item.produceName.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q)
        );
      });
  }, [gameState.inventory, q, tab]);

  const totalPlaceableCount =
    Object.values(gameState.seeds).reduce((a, b) => a + b, 0) +
    gameState.fertilizerCount +
    growthElixirCount +
    baitCount;
  const totalProductCount = Object.values(gameState.inventory).reduce((a, b) => a + b, 0);

  const getSellPrice = (item: CatalogItem) => {
    const hotMult = hotSet.has(item.id) ? 1.3 : 1;
    const crashMult = getMarketCrashMult(gameState, item.id);
    return Math.round(
      item.sellPrice * hotMult * crashMult * houseBonuses.sellMult * almanacBonuses.sellMult * partnerBonuses.sellMult
    );
  };

  const totalSellValue = Object.entries(gameState.inventory).reduce((sum, [id, qty]) => {
    if (qty <= 0) return sum;
    const item = CATALOG_BY_ID[id];
    if (!item) return sum;
    return sum + getSellPrice(item) * qty;
  }, 0);

  const canTierMeta = WATERING_CAN_TIERS[gameState.wateringCanTier || 1];
  const equippedItem =
    gameState.selectedTool === 'plant' || gameState.selectedTool === 'build'
      ? CATALOG_BY_ID[gameState.selectedSeedId]
      : null;

  const tabs: { id: InventoryTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: `Alles (${totalPlaceableCount + totalProductCount})`, icon: <Backpack className="w-3.5 h-3.5" /> },
    { id: 'placeable', label: `Setzbar (${totalPlaceableCount})`, icon: <Hammer className="w-3.5 h-3.5" /> },
    { id: 'decoration', label: 'Dekoration & Zäune', icon: <Flower2 className="w-3.5 h-3.5" /> },
    { id: 'animal', label: 'Tiere', icon: <Tractor className="w-3.5 h-3.5" /> },
    { id: 'plantable', label: 'Saatgut, Pilze & Bäume', icon: <Sprout className="w-3.5 h-3.5" /> },
    { id: 'products', label: `Produkte & Fänge (${totalProductCount})`, icon: <Package className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-5xl max-h-[88vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-3">
            <Backpack className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold">Hof-Inventar &amp; Rucksack</h2>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Klicke ein Deko-Objekt, Tier, Saatgut oder Dünger an, um es direkt auf deinem Hof zu setzen!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg text-xs font-mono-num">
              <Coins className="w-4 h-4 text-amber-300" />
              <span>{gameState.coins.toLocaleString('de-DE')} Münzen</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Inventar schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active equipment & search bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#efe6d5] border-b border-[#d6c7ae]">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-[#faf6ee] border border-[#d6c7ae] font-medium">
              Aktuell aktiv:{' '}
              <strong className="text-[#4a321f]">
                {gameState.selectedTool === 'fertilize'
                  ? 'Hof-Dünger'
                  : equippedItem
                  ? equippedItem.name
                  : gameState.selectedTool === 'water'
                  ? canTierMeta.name
                  : gameState.selectedTool === 'hoe'
                  ? 'Acker-Hacke'
                  : gameState.selectedTool === 'remove'
                  ? 'Räumen / Einpacken'
                  : gameState.selectedTool === 'fishing'
                  ? 'Angel'
                  : 'Ernte-Hand'}
              </strong>
            </span>
            <span className="text-[#5c4632] hidden md:inline">
              Tipp: Mit <strong>Räumen [6]</strong> packst du gesetzte Deko &amp; Tiere verlustfrei wieder ein!
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#7a634b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Inventar durchsuchen..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#faf6ee] border border-[#cbb799] text-xs text-[#2b2118] focus:outline-none focus:border-[#4a321f]"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-[#f5efe3] border-b border-[#dfd3be] overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                tab === t.id
                  ? 'bg-[#4a321f] text-white'
                  : 'bg-[#efe6d5] text-[#4a321f] hover:bg-[#e3d5be]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Placeable Items Section */}
          {tab !== 'products' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <Hammer className="w-4 h-4 text-[#6e4a2e]" />
                  <span>Deko, Tiere, Saatgut &amp; Dünger zum Setzen</span>
                </h3>
                <button
                  onClick={onOpenMarket}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Auf Markt nachkaufen</span>
                </button>
              </div>

              {placeableEntries.length === 0 && !showFertilizer && !showElixir && !showBait ? (
                <div className="p-6 rounded-xl bg-[#f1e9da] border border-[#d6c7ae] text-center text-xs text-[#5c4632] space-y-2">
                  <p>Keine passenden setzbaren Objekte im Inventar gefunden.</p>
                  <button
                    onClick={onOpenMarket}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                  >
                    Zum Bauernmarkt
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {showElixir && (
                    <button
                      onClick={() => {
                        onUseGrowthElixir();
                      }}
                      className="text-left p-3.5 rounded-xl border-2 border-purple-400 bg-purple-50/75 hover:border-purple-600 transition-all hover:shadow-md flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-9 h-9 rounded-lg bg-purple-600 border border-purple-800 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-white" />
                          </span>
                          <div>
                            <div className="font-display font-bold text-sm">Wachstums-Elixier</div>
                            <div className="text-[11px] text-purple-800 font-semibold">Bruno-Spezial</div>
                          </div>
                        </div>
                        <span className="font-mono-num text-xs font-bold px-2 py-0.5 rounded bg-purple-800 text-white">
                          ×{growthElixirCount}
                        </span>
                      </div>
                      <p className="text-xs text-[#5c4632] leading-snug">
                        Lässt alle aktuell wachsenden Pflanzen, Pilze &amp; Tiere auf deinem Hof sofort um +45 % voranschreiten!
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-purple-200 text-[11px]">
                        <span className="text-purple-800">Sofort auf Hof anwenden</span>
                        <span className="font-semibold text-purple-900">Jetzt einsetzen →</span>
                      </div>
                    </button>
                  )}

                  {showBait && (
                    <div className="text-left p-3.5 rounded-xl border-2 border-sky-300 bg-sky-50/70 flex flex-col justify-between gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-9 h-9 rounded-lg bg-sky-600 border border-sky-800 flex items-center justify-center shrink-0">
                            <Fish className="w-5 h-5 text-white" />
                          </span>
                          <div>
                            <div className="font-display font-bold text-sm">Profi-Angelköder</div>
                            <div className="text-[11px] text-sky-800 font-semibold">Angel-Zubehör</div>
                          </div>
                        </div>
                        <span className="font-mono-num text-xs font-bold px-2 py-0.5 rounded bg-sky-800 text-white">
                          ×{baitCount}
                        </span>
                      </div>
                      <p className="text-xs text-[#5c4632] leading-snug">
                        Wird beim Angeln am Talbach automatisch verbraucht (+35 % Bisschance &amp; seltenere Fische).
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-sky-200 text-[11px]">
                        <span className="text-sky-800">Automatisch beim Angeln aktiv</span>
                        <span className="font-semibold text-sky-900">Bereit ✓</span>
                      </div>
                    </div>
                  )}

                  {showFertilizer && (
                    <button
                      onClick={() => {
                        onEquipFertilizer();
                        onClose();
                      }}
                      className={`text-left p-3.5 rounded-xl border-2 transition-all hover:shadow-md flex flex-col justify-between gap-2 ${
                        gameState.selectedTool === 'fertilize'
                          ? 'bg-emerald-50 border-emerald-600 shadow-sm'
                          : 'bg-[#fffdf8] border-[#d6c7ae] hover:border-[#6e4a2e]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-emerald-700" />
                          </span>
                          <div>
                            <div className="font-display font-bold text-sm">Hof-Dünger</div>
                            <div className="text-[11px] text-emerald-800 font-semibold">Hilfsmittel</div>
                          </div>
                        </div>
                        <span className="font-mono-num text-xs font-bold px-2 py-0.5 rounded bg-[#4a321f] text-white">
                          ×{gameState.fertilizerCount}
                        </span>
                      </div>
                      <p className="text-xs text-[#5c4632] leading-snug">
                        Macht ein Ackerfeld dauerhaft bis zur Ernte nährstoffreich (+50 % Wachstumstempo).
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-[#ece2d0] text-[11px]">
                        <span className="text-[#6e4a2e]">Auf Ackerboden anwenden</span>
                        <span className="font-semibold text-emerald-700">
                          {gameState.selectedTool === 'fertilize' ? 'Aktiv ✓' : 'Anklicken zum Nutzen →'}
                        </span>
                      </div>
                    </button>
                  )}

                  {placeableEntries.map((item) => {
                    const qty = gameState.seeds[item.id] || 0;
                    const isEquipped =
                      (gameState.selectedTool === 'plant' || gameState.selectedTool === 'build') &&
                      gameState.selectedSeedId === item.id;
                    const hint =
                      item.category !== 'fish' && item.category !== 'artisan' && item.category !== 'meat'
                        ? PLACEMENT_HINT[item.category]
                        : 'Hof-Objekt';
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onEquipPlaceable(item.id);
                          onClose();
                        }}
                        className={`text-left p-3.5 rounded-xl border-2 transition-all hover:shadow-md flex flex-col justify-between gap-2 ${
                          isEquipped
                            ? 'bg-emerald-50 border-emerald-600 shadow-sm'
                            : 'bg-[#fffdf8] border-[#d6c7ae] hover:border-[#6e4a2e]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-9 h-9 rounded-lg border-2 border-black/15 flex items-center justify-center shrink-0 shadow-inner"
                              style={{ backgroundColor: item.pixelColor }}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-xs border border-black/15"
                                style={{ backgroundColor: item.accentColor }}
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="font-display font-bold text-sm truncate">{item.name}</div>
                              <div className="text-[11px] text-[#6e4a2e] font-semibold">
                                {CATEGORY_LABEL[item.category]}
                                {item.charmPoints ? ` · +${item.charmPoints} Charme` : ''}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono-num text-xs font-bold px-2 py-0.5 rounded bg-[#4a321f] text-white shrink-0">
                            ×{qty}
                          </span>
                        </div>

                        <p className="text-xs text-[#5c4632] leading-snug line-clamp-2">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-[#ece2d0] text-[11px]">
                          <span className="text-[#6e4a2e] truncate">{hint}</span>
                          <span className="font-semibold text-emerald-700 shrink-0 ml-2">
                            {isEquipped ? 'Aktiv ✓' : 'Setzen →'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Harvested Products & Fish Section */}
          {(tab === 'all' || tab === 'products') && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-700" />
                  <span>Geerntete Produkte, Tiererzeugnisse &amp; Fische</span>
                </h3>
                {totalProductCount > 0 && (
                  <button
                    onClick={onSellAllProducts}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Alles verkaufen ({totalSellValue.toLocaleString('de-DE')} M)</span>
                  </button>
                )}
              </div>

              {productEntries.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#f1e9da] border border-[#d6c7ae] text-center text-xs text-[#5c4632]">
                  Du hast aktuell keine geernteten Produkte oder Fische im Rucksack.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {productEntries.map(({ item, qty }) => {
                    const price = getSellPrice(item);
                    const isHot = hotSet.has(item.id);
                    const isCrashed = crashedSet.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                          isCrashed ? 'bg-rose-50/40 border-rose-300' : 'bg-[#fffdf8] border-[#d6c7ae]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-9 h-9 rounded-lg border-2 border-black/15 flex items-center justify-center shrink-0"
                              style={{ backgroundColor: item.pixelColor }}
                            >
                              {item.category === 'fish' ? (
                                <Fish className="w-4 h-4 text-white drop-shadow" />
                              ) : (
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-black/15"
                                  style={{ backgroundColor: item.accentColor }}
                                />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="font-display font-bold text-sm truncate">
                                {item.produceName}
                              </div>
                              <div className="text-[11px] text-[#6e4a2e] flex flex-wrap items-center gap-1.5">
                                <span className="font-mono-num font-semibold">{price} M / Stk.</span>
                                {isHot && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    +30% heute
                                  </span>
                                )}
                                {isCrashed && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    Preissturz -30 %
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono-num text-xs font-bold px-2 py-0.5 rounded bg-[#efe6d5] text-[#4a321f] border border-[#d6c7ae] shrink-0">
                            ×{qty}
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-[#ece2d0]">
                          {item.feastBuffMinutes && (
                            <button
                              onClick={() => onEatFeastDish(item.id)}
                              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                              title="+25 % Lauftempo & +20 % Wachstums-/Veredelungstempo"
                            >
                              <UtensilsCrossed className="w-3.5 h-3.5" />
                              <span>Selbst genießen ({item.feastBuffMinutes} Min. Buff)</span>
                            </button>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onSellProduct(item.id, 1)}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-[#efe6d5] hover:bg-[#e3d5be] text-[#2b2118] text-xs font-semibold transition-colors"
                            >
                              1× verkaufen ({price} M)
                            </button>
                            {qty > 1 && (
                              <button
                                onClick={() => onSellProduct(item.id, qty)}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                              >
                                Alle ({price * qty} M)
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
