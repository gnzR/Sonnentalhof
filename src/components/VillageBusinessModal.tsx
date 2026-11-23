import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Coins,
  Droplets,
  Factory,
  Landmark,
  Lock,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import {
  VILLAGE_BUSINESS_BY_ID,
  VILLAGE_BUSINESSES,
  VILLAGE_BUSINESS_UNLOCK_LEVEL,
} from '../data/village';
import { GameState, VillageBusinessId } from '../types/game';

interface VillageBusinessModalProps {
  gameState: GameState;
  initialBusinessId?: VillageBusinessId;
  onClose: () => void;
  onPurchaseBusiness: (businessId: VillageBusinessId) => void;
  onRepairBusiness: (businessId: VillageBusinessId) => void;
}

function BusinessIcon({ id, className }: { id: VillageBusinessId; className?: string }) {
  switch (id) {
    case 'west_bakery':
      return <Sparkles className={className} />;
    case 'west_supermarket':
      return <ShoppingBag className={className} />;
    case 'auto_supplier':
      return <Factory className={className} />;
    case 'dairy_plant':
      return <Droplets className={className} />;
    case 'trade_office':
      return <Landmark className={className} />;
  }
}

export const VillageBusinessModal: React.FC<VillageBusinessModalProps> = ({
  gameState,
  initialBusinessId,
  onClose,
  onPurchaseBusiness,
  onRepairBusiness,
}) => {
  const [selectedId, setSelectedId] = useState<VillageBusinessId>(initialBusinessId || 'auto_supplier');

  useEffect(() => {
    if (initialBusinessId) {
      setSelectedId(initialBusinessId);
    }
  }, [initialBusinessId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const bizState = gameState.villageBusinesses;
  const ownedIds = bizState?.ownedIds || [];
  const brokenById = bizState?.brokenById || {};
  const selected = VILLAGE_BUSINESS_BY_ID[selectedId] || VILLAGE_BUSINESSES[0];
  const isOwned = ownedIds.includes(selected.id);
  const selectedBroken = isOwned ? brokenById[selected.id] : undefined;
  const levelMet = gameState.level >= selected.minLevel;
  const canAfford = gameState.coins >= selected.purchaseCost;
  const repairCost = selectedBroken?.repairCost || selected.repairCost;
  const canAffordRepair = gameState.coins >= repairCost;

  const earnedTodaySelected = bizState?.todayEarnedById?.[selected.id] || 0;
  const earnedTotalSelected = bizState?.totalEarnedById?.[selected.id] || 0;
  const totalTodayAll = ownedIds.reduce((sum, id) => sum + (bizState?.todayEarnedById?.[id] || 0), 0);
  const totalAllTime = ownedIds.reduce((sum, id) => sum + (bizState?.totalEarnedById?.[id] || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="bg-[#4a321f] px-5 py-4 text-[#faf6ee] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display font-bold text-base leading-tight">
                Westviertel &amp; Industriegebiet · Betriebe
              </h2>
              <p className="text-[11px] text-[#e7d7bf]">
                Gewerbe- &amp; Industrie-Immobilien ab Level {VILLAGE_BUSINESS_UNLOCK_LEVEL} kaufen · Gewinne fließen direkt an dich
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Betriebsmenü schließen"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector Tabs for all 5 Westviertel Businesses */}
        <div className="px-5 py-3 bg-[#f3ead9] border-b border-[#d6c7ae] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 shrink-0">
          {VILLAGE_BUSINESSES.map((biz) => {
            const active = biz.id === selected.id;
            const owned = ownedIds.includes(biz.id);
            const isBroken = owned && Boolean(brokenById[biz.id]);
            return (
              <button
                key={biz.id}
                onClick={() => setSelectedId(biz.id)}
                className={`p-2 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-1.5 ${
                  active
                    ? isBroken
                      ? 'bg-rose-50 border-rose-500 shadow-sm'
                      : 'bg-white border-[#6e4a2e] shadow-sm'
                    : isBroken
                    ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-50'
                    : 'bg-[#faf6ee]/80 border-[#d6c7ae] hover:bg-white'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-display font-bold text-[11px] text-[#2b2118] truncate">
                    <BusinessIcon id={biz.id} className="w-3.5 h-3.5 text-[#6e4a2e] shrink-0" />
                    <span className="truncate">{biz.shortLabel}</span>
                  </div>
                  <div
                    className={`font-mono-num text-[10px] mt-0.5 truncate ${
                      isBroken ? 'text-rose-700 font-bold' : 'text-[#5c4632]'
                    }`}
                  >
                    {isBroken
                      ? 'Störung!'
                      : owned
                      ? 'Im Besitz'
                      : `${biz.purchaseCost.toLocaleString('de-DE')} M`}
                  </div>
                </div>
                {isBroken ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                ) : owned ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Selected Business Detail View */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="bg-white border border-[#d6c7ae] rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#efe6d5] border border-[#c7b392] flex items-center justify-center shrink-0">
                  <BusinessIcon id={selected.id} className="w-6 h-6 text-[#6e4a2e]" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8f7758]">
                    {selected.categoryLabel}
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#2b2118] leading-snug">
                    {selected.name}
                  </h3>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  isOwned
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                {isOwned ? 'Dein Betrieb' : 'Gemeinde-Eigentum'}
              </span>
            </div>

            <p className="text-xs text-[#5c4632] leading-relaxed">{selected.description}</p>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-lg bg-[#faf6ee] border border-[#e2d6c1] p-3">
                <div className="text-[11px] text-[#6e4a2e] flex items-center gap-1 font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  Arbeitsplätze
                </div>
                <div className="font-display font-bold text-sm text-[#2b2118] mt-1">
                  {selected.workforceShareLabel}
                </div>
              </div>

              <div className="rounded-lg bg-[#faf6ee] border border-[#e2d6c1] p-3">
                <div className="text-[11px] text-[#6e4a2e] flex items-center gap-1 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  Tagesgewinn (ca.)
                </div>
                <div className="font-mono-num font-bold text-sm text-emerald-800 mt-1">
                  {selected.dailyProfitRangeLabel}
                </div>
              </div>

              <div className="rounded-lg bg-[#faf6ee] border border-[#e2d6c1] p-3">
                <div className="text-[11px] text-[#6e4a2e] flex items-center gap-1 font-semibold">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  Ausschüttung
                </div>
                <div className="font-mono-num font-bold text-sm text-[#2b2118] mt-1">
                  ~{selected.hourlyProfitBase.toLocaleString('de-DE')} M / Ingame-Std.
                </div>
              </div>
            </div>
          </div>

          {/* Ownership Action OR Live Earnings Card */}
          {isOwned ? (
            <div className="space-y-3">
              {selectedBroken && (
                <div className="rounded-xl bg-rose-50 border-2 border-rose-400 p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-display font-bold text-sm text-rose-950">
                          Betriebs-Störung: {selectedBroken.reason}
                        </div>
                        <p className="text-xs text-rose-900 mt-0.5">
                          Der Betrieb steht vorübergehend still — stündliche Ausschüttungen sind bis zur Reparatur pausiert.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRepairBusiness(selected.id)}
                    disabled={!canAffordRepair}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-display font-bold flex items-center justify-center gap-2 transition-colors ${
                      canAffordRepair
                        ? 'bg-rose-700 hover:bg-rose-800 text-white shadow'
                        : 'bg-[#d6c7ae] text-[#6e5a44] cursor-not-allowed'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>
                      {canAffordRepair
                        ? `Sofort reparieren (${repairCost.toLocaleString('de-DE')} M)`
                        : `Noch ${(repairCost - gameState.coins).toLocaleString('de-DE')} M fehlen (${repairCost.toLocaleString('de-DE')} M)`}
                    </span>
                  </button>
                </div>
              )}

              <div
                className={`rounded-xl border-2 p-4 space-y-2.5 ${
                  selectedBroken
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-emerald-50 border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2 font-display font-bold text-sm text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>
                    {selectedBroken
                      ? 'Gewinn-Übersicht (Ausschüttung bis Reparatur pausiert)'
                      : 'Dieser Betrieb erwirtschaftet Gewinne für deine Hofkasse'}
                  </span>
                </div>
                <p className="text-xs text-emerald-900">
                  Alle 60 Ingame-Minuten werden die laufenden Betriebserträge automatisch deinem Münzkonto gutgeschrieben.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-lg bg-white/90 border border-emerald-200 p-2.5">
                    <div className="text-[11px] text-emerald-800 font-semibold">Heute erwirtschaftet</div>
                    <div className="font-mono-num font-bold text-base text-emerald-900">
                      +{earnedTodaySelected.toLocaleString('de-DE')} M
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/90 border border-emerald-200 p-2.5">
                    <div className="text-[11px] text-emerald-800 font-semibold">Bisheriger Gesamtgewinn</div>
                    <div className="font-mono-num font-bold text-base text-emerald-900">
                      +{earnedTotalSelected.toLocaleString('de-DE')} M
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#f3ead9] border border-[#d6c7ae] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-semibold">
                  {levelMet ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-rose-700 shrink-0" />
                  )}
                  <span className={levelMet ? 'text-emerald-900' : 'text-rose-800'}>
                    Freischaltung ab Hof-Level {selected.minLevel} (aktuell Level {gameState.level})
                  </span>
                </div>
                <div className="font-mono-num text-[#4a321f]">
                  Dein Kontostand: <strong>{gameState.coins.toLocaleString('de-DE')} M</strong>
                </div>
              </div>

              <button
                onClick={() => onPurchaseBusiness(selected.id)}
                disabled={!levelMet || !canAfford}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-display font-bold flex items-center justify-center gap-2 transition-colors ${
                  levelMet && canAfford
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow'
                    : 'bg-[#d6c7ae] text-[#6e5a44] cursor-not-allowed'
                }`}
              >
                {!levelMet ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Ab Level {selected.minLevel} kaufbar
                  </>
                ) : !canAfford ? (
                  <>
                    <Coins className="w-4 h-4" />
                    Noch {(selected.purchaseCost - gameState.coins).toLocaleString('de-DE')} M fehlen ({selected.purchaseCost.toLocaleString('de-DE')} M)
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    {selected.shortLabel} für {selected.purchaseCost.toLocaleString('de-DE')} Münzen kaufen
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="px-5 py-3 bg-[#f3ead9] border-t border-[#d6c7ae] flex flex-wrap items-center justify-between gap-2 text-xs text-[#4a321f] shrink-0">
          <div>
            Im Besitz: <strong className="font-mono-num">{ownedIds.length} / {VILLAGE_BUSINESSES.length}</strong> Westviertel-Betriebe
          </div>
          <div className="font-mono-num">
            Heute gesamt: <strong>+{totalTodayAll.toLocaleString('de-DE')} M</strong> · Gesamt: <strong>+{totalAllTime.toLocaleString('de-DE')} M</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
