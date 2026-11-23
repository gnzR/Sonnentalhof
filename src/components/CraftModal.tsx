import React, { useMemo, useState } from 'react';
import {
  Check,
  ChefHat,
  Clock,
  Coins,
  Flame,
  Hammer,
  Lock,
  Package,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { CATALOG_BY_ID, CRAFT_RECIPES, CRAFT_STATIONS, GRID_SIZE } from '../data/catalog';
import { formatDurationMs } from '../engine/gameLogic';
import { CraftStationId, GameState } from '../types/game';

interface CraftModalProps {
  gameState: GameState;
  initialStationId?: CraftStationId;
  onClose: () => void;
  onStartCraft: (recipeId: string) => void;
  onBuyStation: (stationId: CraftStationId) => void;
  onEquipStation: (stationId: CraftStationId) => void;
}

export const CraftModal: React.FC<CraftModalProps> = ({
  gameState,
  initialStationId,
  onClose,
  onStartCraft,
  onBuyStation,
  onEquipStation,
}) => {
  const [selectedStation, setSelectedStation] = useState<CraftStationId>(
    initialStationId || 'preserve_jar'
  );

  // Count placed stations on farm
  const placedCounts = useMemo(() => {
    const counts: Record<CraftStationId, number> = {
      preserve_jar: 0,
      bakery_oven: 0,
      cheese_press: 0,
      fish_smoker: 0,
      brewery: 0,
      feast_kitchen: 0,
    };
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const ent = gameState.tiles[y]?.[x]?.entity;
        if (ent && ent.itemId in counts) {
          counts[ent.itemId as CraftStationId] += 1;
        }
      }
    }
    return counts;
  }, [gameState.tiles]);

  const activeJobs = gameState.craftingJobs || [];
  const stationMeta = CRAFT_STATIONS.find((s) => s.id === selectedStation) || CRAFT_STATIONS[0];
  const stationCatalogItem = CATALOG_BY_ID[selectedStation];
  const placedCount = placedCounts[selectedStation] || 0;
  const backpackCount = gameState.seeds[selectedStation] || 0;
  const stationUnlocked = gameState.level >= stationMeta.unlockLevel;
  const jobsAtSelected = activeJobs.filter((j) => j.stationId === selectedStation);
  const stationRecipes = CRAFT_RECIPES.filter((r) => r.stationId === selectedStation);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-3">
            <ChefHat className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold">Hof-Veredelung &amp; Handwerk</h2>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Verarbeite Ernte, Pilze, Tierprodukte &amp; Fische zu wertvollen Hof-Spezialitäten · {gameState.coins.toLocaleString('de-DE')} Münzen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Veredelung schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Station Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-6 py-3 bg-[#efe6d5] border-b border-[#d6c7ae]">
          {CRAFT_STATIONS.map((st) => {
            const unlocked = gameState.level >= st.unlockLevel;
            const placed = placedCounts[st.id] || 0;
            const running = activeJobs.filter((j) => j.stationId === st.id).length;
            const isSelected = selectedStation === st.id;
            const item = CATALOG_BY_ID[st.id];
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStation(st.id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-[#4a321f] text-[#faf6ee] border-[#2b2118] shadow-sm'
                    : 'bg-[#faf6ee] text-[#2b2118] border-[#d6c7ae] hover:bg-[#e5d9c3]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-xs border border-black/20 shrink-0"
                      style={{ backgroundColor: item?.pixelColor || '#b45309' }}
                    />
                    <span className="font-display font-bold text-xs truncate">{st.title}</span>
                  </div>
                  {!unlocked ? (
                    <Lock className="w-3.5 h-3.5 shrink-0 opacity-75" />
                  ) : running > 0 ? (
                    <span className="font-mono-num text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold">
                      {running}/{placed}
                    </span>
                  ) : (
                    <span className="font-mono-num text-[10px] opacity-75">
                      {placed}× auf Hof
                    </span>
                  )}
                </div>
                <div className={`text-[10px] truncate ${isSelected ? 'text-amber-200/90' : 'text-[#5c4632]'}`}>
                  {unlocked ? (placed > 0 ? 'Einsatzbereit' : 'Station benötigt') : `Ab Level ${st.unlockLevel}`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active Jobs Banner */}
          {activeJobs.length > 0 && (
            <section className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm flex items-center gap-2 text-amber-950">
                  <Flame className="w-4 h-4 text-orange-600 animate-pulse" />
                  <span>Laufende Veredelungen ({activeJobs.length})</span>
                </h3>
                <span className="text-[11px] text-amber-900">
                  Fertige Waren landen automatisch in deinem Rucksack!
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeJobs.map((job) => {
                  const outItem = CATALOG_BY_ID[job.outputItemId];
                  const st = CRAFT_STATIONS.find((s) => s.id === job.stationId);
                  const pct = Math.min(100, Math.max(4, Math.round(((job.totalMs - job.remainingMs) / job.totalMs) * 100)));
                  return (
                    <div key={job.id} className="p-2.5 rounded-lg bg-white border border-amber-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold truncate">{outItem?.produceName || job.outputItemId}</span>
                        <span className="font-mono-num text-amber-800 font-semibold flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDurationMs(job.remainingMs)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-600 transition-all duration-200"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-[#5c4632]">{st?.title}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Selected Station Setup Card */}
          <section className="p-4 rounded-xl bg-white border border-[#d6c7ae] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className="w-11 h-11 rounded-xl border-2 border-black/15 shrink-0 flex items-center justify-center"
                style={{ backgroundColor: stationCatalogItem?.pixelColor || '#b45309' }}
              >
                <ChefHat className="w-5 h-5 text-white drop-shadow" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-bold text-base">{stationMeta.title}</h3>
                  <span className="px-2 py-0.5 rounded bg-[#efe6d5] text-[#4a321f] text-[11px] font-semibold font-mono-num">
                    Auf Hof: {placedCount} · Rucksack: {backpackCount}
                  </span>
                </div>
                <p className="text-xs text-[#5c4632] mt-0.5">
                  {stationMeta.subtitle}. Jede platzierte Station erlaubt einen gleichzeitigen Auftrag!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {backpackCount > 0 && (
                <button
                  onClick={() => {
                    onEquipStation(selectedStation);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Aus Rucksack auf Hof setzen</span>
                </button>
              )}
              {stationUnlocked && stationCatalogItem && (
                <button
                  disabled={gameState.coins < stationCatalogItem.seedCost}
                  onClick={() => onBuyStation(selectedStation)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#4a321f] hover:bg-[#3a2617] text-white text-xs font-semibold disabled:opacity-45 transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>
                    {placedCount === 0 && backpackCount === 0 ? 'Station kaufen' : 'Weitere kaufen'} ({stationCatalogItem.seedCost} M)
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Recipes Grid */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base">
                Rezepte für {stationMeta.title}
              </h3>
              {placedCount > 0 && (
                <span className="text-xs font-mono-num text-[#5c4632]">
                  Plätze belegt: {jobsAtSelected.length} / {placedCount}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stationRecipes.map((recipe) => {
                const outItem = CATALOG_BY_ID[recipe.outputItemId];
                if (!outItem) return null;
                const levelOk = gameState.level >= recipe.unlockLevel;
                const slotFree = placedCount > 0 && jobsAtSelected.length < placedCount;

                const ingredientStatus = recipe.ingredients.map((ing) => {
                  const owned = gameState.inventory[ing.itemId] || 0;
                  const meta = CATALOG_BY_ID[ing.itemId];
                  return {
                    ...ing,
                    owned,
                    name: meta?.produceName || ing.itemId,
                    color: meta?.pixelColor || '#94a3b8',
                    ok: owned >= ing.qty,
                  };
                });
                const hasAllIngredients = ingredientStatus.every((i) => i.ok);
                const canCraft = levelOk && slotFree && hasAllIngredients;

                return (
                  <div
                    key={recipe.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      !levelOk
                        ? 'bg-[#f1ece1] border-[#d6c7ae] opacity-75'
                        : 'bg-white border-[#d6c7ae]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-10 h-10 rounded-lg border-2 border-black/15 shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: outItem.pixelColor }}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/15"
                              style={{ backgroundColor: outItem.accentColor }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-display font-bold text-sm truncate">{outItem.name}</div>
                            <div className="text-[11px] text-[#6e4a2e] font-mono-num flex items-center gap-2">
                              <span className="inline-flex items-center gap-1">
                                <Coins className="w-3 h-3 text-amber-600" />
                                {outItem.sellPrice} M
                              </span>
                              <span>· +{recipe.xpReward} XP</span>
                              <span>· {formatDurationMs(recipe.durationMs)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-[#5c4632] leading-snug">{outItem.description}</p>

                      {outItem.feastBuffMinutes && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900">
                          <Flame className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>
                            Festmahl-Buff ({outItem.feastBuffMinutes} Min.): +25 % Lauftempo &amp; +20 % Wachstums-/Handwerkstempo
                          </span>
                        </div>
                      )}

                      {/* Ingredients */}
                      <div className="space-y-1 pt-1">
                        <div className="text-[11px] font-semibold text-[#5c4632] flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span>Benötigte Zutaten aus deinem Vorrat:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ingredientStatus.map((ing) => (
                            <span
                              key={ing.itemId}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                                ing.ok
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : 'bg-rose-50 border-rose-200 text-rose-800'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-xs border border-black/15 shrink-0"
                                style={{ backgroundColor: ing.color }}
                              />
                              <span>{ing.name}</span>
                              <span className="font-mono-num font-bold">
                                {ing.owned}/{ing.qty}
                              </span>
                              {ing.ok && <Check className="w-3 h-3 text-emerald-700" />}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#efe6d5]">
                      {!levelOk ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#785c42]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Freigeschaltet ab Hof-Level {recipe.unlockLevel}</span>
                        </div>
                      ) : placedCount === 0 ? (
                        <div className="text-xs font-semibold text-amber-800">
                          Setze zuerst einen {stationMeta.title} auf deinen Hof!
                        </div>
                      ) : (
                        <button
                          disabled={!canCraft}
                          onClick={() => onStartCraft(recipe.id)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            canCraft
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-[#e8decb] text-[#8f7758] cursor-not-allowed'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {!slotFree
                              ? `Alle ${placedCount} Station(en) belegt`
                              : !hasAllIngredients
                              ? 'Zutaten fehlen noch'
                              : `${outItem.name} herstellen`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
