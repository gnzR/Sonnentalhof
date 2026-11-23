import React from 'react';
import { Check, Heart, Home, Lock, Sparkles, X } from 'lucide-react';
import { HOUSE_EXTRAS, HOUSE_FLOOR_UPGRADES } from '../data/catalog';
import { ROMANCE_CANDIDATE_BY_ID } from '../data/romance';
import { getHouseBonuses } from '../engine/gameLogic';
import { GameState } from '../types/game';
import { PixelAvatarCanvas } from './PixelAvatarCanvas';

interface HouseModalProps {
  gameState: GameState;
  onClose: () => void;
  onUpgradeFloor: (targetFloor: 2 | 3 | 4) => void;
  onBuyExtra: (extraId: string) => void;
}

export const HouseModal: React.FC<HouseModalProps> = ({
  gameState,
  onClose,
  onUpgradeFloor,
  onBuyExtra,
}) => {
  const bonuses = getHouseBonuses(gameState.house);
  const marriedPartner =
    gameState.romance?.status === 'married' && gameState.romance.partnerId
      ? ROMANCE_CANDIDATE_BY_ID[gameState.romance.partnerId]
      : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl max-h-[86vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-2.5">
            <Home className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-display text-xl font-bold">Dein Bauernhaus</h2>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Aktuell: {gameState.house.floors} von 4 Etagen · {gameState.house.extras.length} Extras installiert
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Bonus Summary */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-medium text-[#4a321f]">
            <span className="font-bold">Aktive Haus-Boni:</span>
            <span>XP-Faktor ×{bonuses.xpMult.toFixed(2)}</span>
            <span>· Marktpreise ×{bonuses.sellMult.toFixed(2)}</span>
            <span>· Pflanzen ×{bonuses.cropSpeedMult.toFixed(2)}</span>
            <span>· Pilze ×{bonuses.mushroomSpeedMult.toFixed(2)}</span>
            <span>· Tiere ×{bonuses.animalSpeedMult.toFixed(2)}</span>
          </div>

          {marriedPartner && (
            <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl overflow-hidden border-2 border-rose-500 bg-white shrink-0">
                  <PixelAvatarCanvas avatar={marriedPartner.avatar} size={56} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                    <span>Gemeinsames Zuhause · Seit Tag {gameState.romance?.marriedDay || gameState.day}</span>
                  </div>
                  <div className="font-display font-bold text-base text-[#2b2118]">
                    {marriedPartner.name} wohnt hier mit dir
                  </div>
                  <div className="text-xs text-[#5c4632]">
                    {gameState.romance?.morningSurpriseText || marriedPartner.partnerPerkDesc}
                  </div>
                </div>
              </div>
              <div className="font-mono-num text-xs font-semibold text-emerald-800">
                +{marriedPartner.shopTipBonusPct}% Hofladen · +{marriedPartner.sellPriceBonusPct}% Verkauf · +{marriedPartner.xpBonusPct}% XP
              </div>
            </div>
          )}

          {/* Floor Upgrades (1 -> 2 -> 3 -> 4) */}
          <section className="space-y-3">
            <h3 className="font-display font-bold text-base">Etagen-Ausbau (bis zu 4 Etagen)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col justify-between">
                <div>
                  <div className="font-display font-bold text-sm">1. Etage: Bauernstube</div>
                  <p className="text-xs text-[#5c4632] mt-1">Gemütliches Erdgeschoss mit Küche und Werkbank.</p>
                </div>
                <div className="mt-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold text-center">
                  Start-Etage
                </div>
              </div>

              {HOUSE_FLOOR_UPGRADES.map((up) => {
                const owned = gameState.house.floors >= up.floor;
                const prevOwned = gameState.house.floors >= up.floor - 1;
                const meetsLevel = gameState.level >= up.minLevel;
                const canBuy = !owned && prevOwned && meetsLevel && gameState.coins >= up.cost;

                return (
                  <div
                    key={up.floor}
                    className={`p-4 rounded-xl border flex flex-col justify-between ${
                      owned ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-[#d6c7ae]'
                    }`}
                  >
                    <div>
                      <div className="font-display font-bold text-sm">{up.name}</div>
                      <p className="text-xs text-[#5c4632] mt-1">{up.benefit}</p>
                      <div className="font-mono-num text-xs text-[#6e4a2e] mt-2">
                        Ab Level {up.minLevel} · {up.cost.toLocaleString('de-DE')} Münzen
                      </div>
                    </div>

                    <button
                      disabled={!canBuy}
                      onClick={() => onUpgradeFloor(up.floor)}
                      className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
                        owned
                          ? 'bg-emerald-700 text-white'
                          : canBuy
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-[#e8decb] text-[#8f7758] cursor-not-allowed'
                      }`}
                    >
                      {owned ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Ausgebaut
                        </>
                      ) : !prevOwned ? (
                        'Vorherige Etage nötig'
                      ) : !meetsLevel ? (
                        <>
                          <Lock className="w-3.5 h-3.5" /> Level {up.minLevel} nötig
                        </>
                      ) : (
                        `Ausbauen (${up.cost.toLocaleString('de-DE')} M)`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* House Extras */}
          <section className="space-y-3">
            <h3 className="font-display font-bold text-base">Haus-Extras & Erweiterungen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HOUSE_EXTRAS.map((extra) => {
                const owned = gameState.house.extras.includes(extra.id);
                const meetsLevel = gameState.level >= extra.minLevel;
                const canBuy = !owned && meetsLevel && gameState.coins >= extra.cost;

                return (
                  <div
                    key={extra.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                      owned ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-[#d6c7ae]'
                    }`}
                  >
                    <div>
                      <div className="font-display font-bold text-sm flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{extra.name}</span>
                      </div>
                      <div className="text-xs text-[#5c4632] mt-1">{extra.effectText}</div>
                      <div className="font-mono-num text-[11px] text-[#6e4a2e] mt-1">
                        Ab Level {extra.minLevel} · {extra.cost.toLocaleString('de-DE')} Münzen
                      </div>
                    </div>

                    <button
                      disabled={!canBuy}
                      onClick={() => onBuyExtra(extra.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 ${
                        owned
                          ? 'bg-emerald-700 text-white'
                          : canBuy
                          ? 'bg-[#4a321f] hover:bg-[#3a2617] text-white'
                          : 'bg-[#e8decb] text-[#8f7758] cursor-not-allowed'
                      }`}
                    >
                      {owned ? 'Gebaut' : !meetsLevel ? `Lvl ${extra.minLevel}` : 'Bauen'}
                    </button>
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
