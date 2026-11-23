import React, { useState } from 'react';
import {
  ArrowDown,
  Award,
  Coins,
  Gem,
  Hammer,
  Lock,
  Mountain,
  Pickaxe,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import { CATALOG_BY_ID } from '../data/catalog';
import {
  MINE_FORGE_RECIPES,
  MINE_ORES,
  MINE_RELICS,
  MINE_RESOURCE_BY_ID,
  MINE_SNACKS,
} from '../data/mineCatalog';
import { createInitialMineState } from '../engine/gameLogic';
import { GameState, MineCell } from '../types/game';

interface MineModalProps {
  gameState: GameState;
  onClose: () => void;
  onHitCell: (cellIdx: number) => void;
  onChangeFloor: (targetFloor: number) => void;
  onEatSnack: (itemId: string) => void;
  onForgeRecipe: (recipeId: string) => void;
  onSellMineResource: (resourceId: string, qty: number) => void;
  onSellAllMineResources: () => void;
}

const CELL_LABELS: Record<MineCell['kind'], { label: string; bg: string; chip: string }> = {
  empty: { label: 'Frei', bg: 'bg-[#1e2430] border-[#2d3548]', chip: '' },
  rock: { label: 'Fels', bg: 'bg-[#475569] border-[#64748b] hover:bg-[#526278]', chip: '#94a3b8' },
  copper_vein: { label: 'Kupfer', bg: 'bg-[#7c2d12] border-[#c2410c] hover:bg-[#9a3412]', chip: '#fdba74' },
  iron_vein: { label: 'Eisen', bg: 'bg-[#334155] border-[#94a3b8] hover:bg-[#475569]', chip: '#e2e8f0' },
  silver_vein: { label: 'Silber', bg: 'bg-[#475569] border-[#e2e8f0] hover:bg-[#64748b]', chip: '#f8fafc' },
  amethyst_vein: { label: 'Amethyst', bg: 'bg-[#4c1d95] border-[#a855f7] hover:bg-[#5b21b6]', chip: '#e9d5ff' },
  gold_vein: { label: 'Gold', bg: 'bg-[#713f12] border-[#eab308] hover:bg-[#854d0e]', chip: '#fef08a' },
  moonstone_vein: { label: 'Mondstein', bg: 'bg-[#0c4a6e] border-[#38bdf8] hover:bg-[#075985]', chip: '#e0f2fe' },
  crystal_cache: { label: 'Kristall', bg: 'bg-[#312e81] border-[#818cf8] hover:bg-[#3730a3]', chip: '#c4b5fd' },
  ladder: { label: 'Leiter', bg: 'bg-emerald-900 border-emerald-400 hover:bg-emerald-800', chip: '#fde047' },
};

export const MineModal: React.FC<MineModalProps> = ({
  gameState,
  onClose,
  onHitCell,
  onChangeFloor,
  onEatSnack,
  onForgeRecipe,
  onSellMineResource,
  onSellAllMineResources,
}) => {
  const [tab, setTab] = useState<'explore' | 'forge' | 'vault'>('explore');

  const mine = gameState.mine || createInitialMineState(gameState.day, gameState.level);
  const staminaPct = Math.min(100, Math.round((mine.stamina / Math.max(1, mine.maxStamina)) * 100));

  const availableSnacks = MINE_SNACKS.filter((sn) => (gameState.inventory[sn.itemId] || 0) > 0);
  const totalOres = Object.values(mine.ores || {}).reduce((a, b) => a + b, 0);
  const totalRelics = Object.values(mine.relics || {}).reduce((a, b) => a + b, 0);

  const totalSellValue = [...MINE_ORES, ...MINE_RELICS].reduce((sum, res) => {
    const qty = res.kind === 'ore' ? mine.ores[res.id] || 0 : mine.relics[res.id] || 0;
    return sum + qty * res.sellPrice;
  }, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#262b38] text-[#faf6ee]">
          <div className="flex items-center gap-3 min-w-0">
            <Mountain className="w-6 h-6 text-sky-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold truncate">
                Alte Waldmine &amp; Kristallhöhle
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 font-mono-num truncate">
                Ebene {mine.currentFloor} (Freigeschaltet bis {mine.unlockedFloor}) · Spitzhacke Stufe {mine.pickaxeTier} · Relikte {mine.discoveredRelics.length}/{MINE_RELICS.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Waldmine schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-[#efe6d5] border-b border-[#d6c7ae]">
          <button
            onClick={() => setTab('explore')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === 'explore' ? 'bg-[#262b38] text-white' : 'text-[#4a321f] hover:bg-[#e3d5be]'
            }`}
          >
            <Pickaxe className="w-4 h-4" />
            <span>Höhle erkunden</span>
          </button>
          <button
            onClick={() => setTab('forge')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === 'forge' ? 'bg-[#262b38] text-white' : 'text-[#4a321f] hover:bg-[#e3d5be]'
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>Schmiede &amp; Sprinkler</span>
          </button>
          <button
            onClick={() => setTab('vault')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === 'vault' ? 'bg-[#262b38] text-white' : 'text-[#4a321f] hover:bg-[#e3d5be]'
            }`}
          >
            <Gem className="w-4 h-4" />
            <span>Erze &amp; Fundstücke ({totalOres + totalRelics})</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === 'explore' && (
            <>
              {/* Stamina & Floor Controls */}
              <div className="p-4 rounded-xl bg-white border border-[#d6c7ae] flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-[220px]">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Bergbau-Ausdauer heute</span>
                    <span className="font-mono-num text-emerald-800">
                      {mine.stamina} / {mine.maxStamina}
                    </span>
                  </div>
                  <div className="w-56 h-2.5 bg-[#e2d6c1] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        mine.stamina <= 3 ? 'bg-rose-600' : 'bg-emerald-700'
                      }`}
                      style={{ width: `${staminaPct}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[#5c4632]">
                    Füllt sich täglich um 00:00 Uhr (oder per Verpflegung) auf.
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#5c4632] mr-1">Ebene wählen:</span>
                  {Array.from({ length: Math.min(mine.unlockedFloor, 25) }, (_, idx) => idx + 1).map((fl) => (
                    <button
                      key={fl}
                      onClick={() => onChangeFloor(fl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-num font-bold transition-colors whitespace-nowrap shrink-0 ${
                        mine.currentFloor === fl
                          ? 'bg-[#262b38] text-white'
                          : 'bg-[#efe6d5] text-[#4a321f] hover:bg-[#e2d3ba]'
                      }`}
                    >
                      {fl}
                    </button>
                  ))}
                  {mine.ladderRevealed && (
                    <button
                      onClick={() => onChangeFloor(mine.currentFloor + 1)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                    >
                      <ArrowDown className="w-4 h-4" />
                      <span>Tiefer (Ebene {mine.currentFloor + 1})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cave Chamber Grid (5x4) */}
              <div className="p-4 rounded-xl bg-[#161a24] border-2 border-[#3b4254] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                  <span>
                    Klicke auf Felsen &amp; Erzadern (je Schlag 1 Ausdauer · Kraft: {mine.pickaxeTier})
                  </span>
                  <span className="font-mono-num text-amber-300">
                    {mine.ladderRevealed
                      ? 'Leiter entdeckt! Klicken für nächste Ebene.'
                      : 'Finde die versteckte Leiter unter einem Felsen.'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2.5">
                  {mine.board.map((cell) => {
                    const meta = CELL_LABELS[cell.kind];
                    const isEmpty = cell.kind === 'empty';
                    const isLadder = cell.kind === 'ladder';
                    const hpPct = cell.maxHp > 0 ? Math.round((cell.hp / cell.maxHp) * 100) : 0;

                    return (
                      <button
                        key={cell.idx}
                        type="button"
                        disabled={isEmpty || (!isLadder && mine.stamina <= 0)}
                        onClick={() =>
                          isLadder ? onChangeFloor(mine.currentFloor + 1) : onHitCell(cell.idx)
                        }
                        className={`h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 ${
                          meta.bg
                        } ${
                          isEmpty
                            ? 'opacity-40 cursor-default'
                            : !isLadder && mine.stamina <= 0
                            ? 'opacity-60 cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                      >
                        {isEmpty ? (
                          <span className="text-[11px] text-slate-500">·</span>
                        ) : isLadder ? (
                          <>
                            <ArrowDown className="w-5 h-5 text-amber-300" />
                            <span className="text-xs font-bold text-amber-200 whitespace-nowrap">
                              Ebene {mine.currentFloor + 1}
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              className="w-5 h-5 rounded-sm border border-black/30 shadow-xs"
                              style={{ backgroundColor: meta.chip }}
                            />
                            <span className="text-xs font-bold text-white whitespace-nowrap">
                              {meta.label}
                            </span>
                            {cell.maxHp > 1 && (
                              <div className="w-12 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-400"
                                  style={{ width: `${hpPct}%` }}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Snacks Bar */}
              <div className="p-4 rounded-xl bg-white border border-[#d6c7ae] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-display font-bold text-[#4a321f]">
                  <Utensils className="w-4 h-4 text-amber-700" />
                  <span>Proviant aus deinem Hof-Vorrat (Ausdauer auffüllen)</span>
                </div>
                {availableSnacks.length === 0 ? (
                  <p className="text-xs text-[#5c4632]">
                    Keine Backwaren oder Getränke im Vorrat. Backe Brot, Apfelkuchen oder braue Apfelwein unter <strong>Veredelung</strong> für mehr Minen-Ausdauer!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSnacks.map((sn) => {
                      const item = CATALOG_BY_ID[sn.itemId];
                      const count = gameState.inventory[sn.itemId] || 0;
                      return (
                        <button
                          key={sn.itemId}
                          onClick={() => onEatSnack(sn.itemId)}
                          disabled={mine.stamina >= mine.maxStamina}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#efe6d5] hover:bg-[#e2d3ba] disabled:opacity-50 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                        >
                          <span>{item?.produceName || sn.itemId}</span>
                          <span className="font-mono-num text-[#5c4632]">×{count}</span>
                          <span className="font-mono-num text-emerald-800">+{sn.staminaGain} Ausd.</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'forge' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {MINE_FORGE_RECIPES.map((rec) => {
                const alreadyOwnedPickaxe =
                  rec.kind === 'pickaxe' &&
                  rec.targetPickaxeTier !== undefined &&
                  mine.pickaxeTier >= rec.targetPickaxeTier;
                const levelOk = gameState.level >= rec.unlockLevel;
                const coinsOk = gameState.coins >= rec.coinsCost;
                const ingStatus = rec.ingredients.map((ing) => {
                  const res = MINE_RESOURCE_BY_ID[ing.resourceId];
                  const owned = mine.ores[ing.resourceId] || 0;
                  return {
                    ...ing,
                    name: res?.name || ing.resourceId,
                    color: res?.color || '#94a3b8',
                    owned,
                    ok: owned >= ing.qty,
                  };
                });
                const oresOk = ingStatus.every((i) => i.ok);
                const canForge = !alreadyOwnedPickaxe && levelOk && coinsOk && oresOk;

                return (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      alreadyOwnedPickaxe
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : !levelOk
                        ? 'bg-[#f1ece1] border-[#d6c7ae] opacity-80'
                        : 'bg-white border-[#d6c7ae]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display font-bold text-sm">{rec.title}</h3>
                        <span className="font-mono-num text-xs text-[#6e4a2e] whitespace-nowrap">
                          {rec.coinsCost} M · +{rec.xpReward} XP
                        </span>
                      </div>
                      <p className="text-xs text-[#5c4632] leading-snug">{rec.description}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ingStatus.map((ing) => (
                          <span
                            key={ing.resourceId}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                              ing.ok
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-xs border border-black/20 shrink-0"
                              style={{ backgroundColor: ing.color }}
                            />
                            <span>{ing.name}</span>
                            <span className="font-mono-num font-bold">
                              {ing.owned}/{ing.qty}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#efe6d5]">
                      {alreadyOwnedPickaxe ? (
                        <div className="text-xs font-bold text-emerald-800">Bereits geschmiedet</div>
                      ) : !levelOk ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#785c42]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Freigeschaltet ab Hof-Level {rec.unlockLevel}</span>
                        </div>
                      ) : (
                        <button
                          disabled={!canForge}
                          onClick={() => onForgeRecipe(rec.id)}
                          className={`w-full py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                            canForge
                              ? 'bg-[#262b38] hover:bg-[#1a1f29] text-white'
                              : 'bg-[#e8decb] text-[#8f7758] cursor-not-allowed'
                          }`}
                        >
                          <Hammer className="w-3.5 h-3.5" />
                          <span>
                            {!oresOk
                              ? 'Erze fehlen'
                              : !coinsOk
                              ? 'Münzen fehlen'
                              : 'Jetzt schmieden'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'vault' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[#5c4632]">
                  Verkaufe überschüssige Erze &amp; Höhlenrelikte oder behalte Erze für die Schmiede.
                </div>
                {totalSellValue > 0 && (
                  <button
                    onClick={onSellAllMineResources}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Alles verkaufen (+{totalSellValue.toLocaleString('de-DE')} M)</span>
                  </button>
                )}
              </div>

              <section className="space-y-2.5">
                <h3 className="font-display font-bold text-sm">Abgebaute Erze &amp; Kristalle</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MINE_ORES.map((ore) => {
                    const qty = mine.ores[ore.id] || 0;
                    return (
                      <div
                        key={ore.id}
                        className="p-3.5 rounded-xl bg-white border border-[#d6c7ae] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-8 h-8 rounded-lg border border-black/15 shrink-0"
                            style={{ backgroundColor: ore.color }}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {ore.name} <span className="font-mono-num text-[#6e4a2e]">×{qty}</span>
                            </div>
                            <div className="text-[11px] text-[#5c4632] font-mono-num">
                              {ore.sellPrice} M/Stk · Ab Ebene {ore.minFloor}
                            </div>
                          </div>
                        </div>
                        {qty > 0 && (
                          <button
                            onClick={() => onSellMineResource(ore.id, qty)}
                            className="px-3 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e2d3ba] text-xs font-semibold whitespace-nowrap shrink-0"
                          >
                            +{qty * ore.sellPrice} M
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2.5">
                <h3 className="font-display font-bold text-sm flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>Seltene Höhlen-Relikte ({mine.discoveredRelics.length}/{MINE_RELICS.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MINE_RELICS.map((rel) => {
                    const found = mine.discoveredRelics.includes(rel.id);
                    const qty = mine.relics[rel.id] || 0;
                    return (
                      <div
                        key={rel.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                          found ? 'bg-white border-[#d6c7ae]' : 'bg-[#f1ece1] border-[#d6c7ae] opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-8 h-8 rounded-lg border border-black/15 shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: found ? rel.color : '#cbd5e1' }}
                            >
                              {found ? <Sparkles className="w-4 h-4 text-white" /> : <Lock className="w-3.5 h-3.5 text-[#5c4632]" />}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate">
                                {found ? rel.name : 'Unentdecktes Relikt'}
                              </div>
                              <div className="text-[11px] text-[#5c4632] font-mono-num">
                                {found ? `Lager: ${qty}× · Wert ${rel.sellPrice} M` : `Ab Ebene ${rel.minFloor}`}
                              </div>
                            </div>
                          </div>
                          {qty > 0 && (
                            <button
                              onClick={() => onSellMineResource(rel.id, qty)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                            >
                              +{qty * rel.sellPrice} M
                            </button>
                          )}
                        </div>
                        {found && (
                          <p className="text-[11px] text-[#5c4632] leading-snug">{rel.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
