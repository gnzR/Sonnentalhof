import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Gift,
  HandHeart,
  Heart,
  Home,
  Lock,
  PackageCheck,
  Sparkles,
  Sprout,
  Users,
  X,
} from 'lucide-react';
import { CATALOG_BY_ID, MAX_NEIGHBOR_REQUESTS_PER_DAY } from '../data/catalog';
import {
  ROMANCE_CANDIDATES,
  ROMANCE_CANDIDATE_BY_ID,
  ROMANCE_DATES,
  ROMANCE_UNLOCK_LEVEL,
} from '../data/romance';
import { getNeighborRequestStepMeta, getPartnerBonuses } from '../engine/gameLogic';
import { GameState, NeighborNPC, RomanceDateId } from '../types/game';
import { PixelAvatarCanvas } from './PixelAvatarCanvas';

interface NeighborsModalProps {
  gameState: GameState;
  initialTab?: 'neighbors' | 'romance';
  onClose: () => void;
  onHelpNeighbor: (neighborId: string) => void;
  onGiveGift: (neighborId: string) => void;
  onFulfillNeighborRequest: (neighborId: string) => void;
  onAcceptSpark: () => void;
  onDeclineSpark: () => void;
  onGiveRomanceGift: (itemId: string) => void;
  onGoOnDate: (dateId: RomanceDateId) => void;
  onMarryPartner: () => void;
  onBreakupRomance: () => void;
  onOpenHouse?: () => void;
}

function NeighborFarmPreview({ npc }: { npc: NeighborNPC }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(0, 0, w, Math.floor(h * 0.35));
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(0, Math.floor(h * 0.35), w, h);

    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(16, 26, 48, 34);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(12, 16, 56, 12);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(34, 42, 12, 18);

    if (npc.farmTheme === 'orchard') {
      [88, 124, 160].forEach((x) => {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + 6, 46, 6, 14);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(x, 24, 18, 22);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x + 4, 30, 4, 4);
        ctx.fillRect(x + 11, 36, 4, 4);
      });
    } else if (npc.farmTheme === 'mushroom') {
      [88, 118, 148].forEach((x, idx) => {
        ctx.fillStyle = '#f5f5f4';
        ctx.fillRect(x + 5, 44, 6, 12);
        ctx.fillStyle = idx === 1 ? '#2dd4bf' : '#d97706';
        ctx.fillRect(x, 34, 16, 10);
      });
    } else if (npc.farmTheme === 'apiary') {
      [88, 122, 156].forEach((x) => {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(x, 36, 18, 20);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x - 2, 32, 22, 5);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x + 14, 24, 3, 3);
      });
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(108, 18, 26, 42);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(118, 6, 6, 32);
      ctx.fillRect(105, 19, 32, 6);
    }
  }, [npc]);

  return (
    <canvas
      ref={canvasRef}
      width={196}
      height={76}
      className="w-full h-20 rounded-lg border border-[#cbb99d] pixelated"
    />
  );
}

export const NeighborsModal: React.FC<NeighborsModalProps> = ({
  gameState,
  initialTab = 'neighbors',
  onClose,
  onHelpNeighbor,
  onGiveGift,
  onFulfillNeighborRequest,
  onAcceptSpark,
  onDeclineSpark,
  onGiveRomanceGift,
  onGoOnDate,
  onMarryPartner,
  onBreakupRomance,
  onOpenHouse,
}) => {
  const [activeTab, setActiveTab] = useState<'neighbors' | 'romance'>(initialTab);
  const [selectedId, setSelectedId] = useState<string>(gameState.neighbors[0]?.id || 'greta');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const activeNpc = gameState.neighbors.find((n) => n.id === selectedId) || gameState.neighbors[0];
  const reqItem = activeNpc ? CATALOG_BY_ID[activeNpc.requestItemId] : null;
  const ownedReq = activeNpc ? gameState.inventory[activeNpc.requestItemId] || 0 : 0;
  const completedToday = activeNpc ? activeNpc.requestsCompletedToday || 0 : 0;
  const allRequestsDoneToday = completedToday >= MAX_NEIGHBOR_REQUESTS_PER_DAY;
  const stepMeta = getNeighborRequestStepMeta(Math.min(MAX_NEIGHBOR_REQUESTS_PER_DAY - 1, completedToday));
  const friendshipBonusPct = activeNpc ? Math.floor(Math.min(100, activeNpc.friendship) / 25) * 8 : 0;

  const romance = gameState.romance;
  const romanceStatus = romance?.status || 'single';
  const pendingSpark = romance?.pendingSpark || null;
  const sparkCandidate = pendingSpark ? ROMANCE_CANDIDATE_BY_ID[pendingSpark.candidateId] : null;
  const partnerSpec = romance?.partnerId ? ROMANCE_CANDIDATE_BY_ID[romance.partnerId] : null;
  const partnerBonuses = getPartnerBonuses(romance);
  const romanceUnlocked = gameState.level >= ROMANCE_UNLOCK_LEVEL;
  const hasRomanceAlert = Boolean(pendingSpark) || (romanceStatus === 'crush' && (romance?.affection || 0) >= 100);
  const giftedTodayRomance = romance?.lastGiftDay === gameState.day;
  const datedTodayRomance = romance?.lastDateDay === gameState.day;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl max-h-[86vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div>
            <h2 className="font-display text-xl font-bold">Nachbarschaft &amp; Herzenssache</h2>
            <p className="text-xs text-amber-200/90 mt-0.5">
              Dorfhöfe besuchen, tägliche Bitten erfüllen und ab Hof-Level {ROMANCE_UNLOCK_LEVEL} die große Liebe finden
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-[#ebe0cb] border-b border-[#d6c7ae] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('neighbors')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-display font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'neighbors'
                  ? 'bg-[#4a321f] text-[#faf6ee] shadow-sm'
                  : 'bg-[#faf6ee] text-[#4a321f] border border-[#c7b392] hover:bg-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Nachbarn ({gameState.neighbors.length})
            </button>
            <button
              onClick={() => setActiveTab('romance')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-display font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'romance'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-[#faf6ee] text-[#4a321f] border border-[#c7b392] hover:bg-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activeTab === 'romance' ? 'fill-white' : 'text-rose-600 fill-rose-500'}`} />
              Herzenssache (Lvl {ROMANCE_UNLOCK_LEVEL}+)
              {hasRomanceAlert && (
                <span className="font-mono-num px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold">
                  !
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-[#5c4632] font-mono-num">
            {romanceStatus === 'married' && partnerSpec
              ? `Verheiratet mit ${partnerSpec.name}`
              : romanceStatus === 'crush' && partnerSpec
              ? `Verliebt in ${partnerSpec.name} · ${romance?.affection || 0} %`
              : pendingSpark && sparkCandidate
              ? `Herzklopfen: ${sparkCandidate.name}`
              : romanceUnlocked
              ? 'Bereit für Event-Begegnungen'
              : `Freischaltung ab Lvl ${ROMANCE_UNLOCK_LEVEL}`}
          </div>
        </div>

        {activeTab === 'neighbors' ? (
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
            {/* Neighbor List */}
            <div className="space-y-2">
              {gameState.neighbors.map((npc) => {
                const selected = npc.id === activeNpc?.id;
                return (
                  <button
                    key={npc.id}
                    onClick={() => setSelectedId(npc.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      selected
                        ? 'bg-[#4a321f] text-[#faf6ee] border-[#2b2118]'
                        : 'bg-white text-[#2b2118] border-[#d6c7ae] hover:bg-[#f2eadb]'
                    }`}
                  >
                    <div className="rounded-lg overflow-hidden border border-black/20 shrink-0">
                      <PixelAvatarCanvas avatar={npc.avatar} size={44} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-bold text-sm truncate">{npc.name}</div>
                      <div className={`text-xs truncate ${selected ? 'text-amber-200' : 'text-[#5c4632]'}`}>
                        {npc.role}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1 text-xs font-mono-num">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                          <span>{npc.friendship}/100</span>
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            (npc.requestsCompletedToday || 0) >= MAX_NEIGHBOR_REQUESTS_PER_DAY
                              ? 'bg-emerald-700 text-white'
                              : selected
                              ? 'bg-white/15 text-amber-100'
                              : 'bg-[#efe6d5] text-[#4a321f]'
                          }`}
                        >
                          Bitten {npc.requestsCompletedToday || 0}/{MAX_NEIGHBOR_REQUESTS_PER_DAY}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Neighbor Visit View */}
            {activeNpc && (
              <div className="bg-white rounded-xl border border-[#d6c7ae] p-5 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl overflow-hidden border-2 border-[#6e4a2e]">
                        <PixelAvatarCanvas avatar={activeNpc.avatar} size={64} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg">{activeNpc.name}</h3>
                        <div className="text-xs text-[#5c4632]">
                          Hof „{activeNpc.avatar.farmName}“ · {activeNpc.role}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="w-32 h-2 bg-[#efe6d5] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500"
                              style={{ width: `${Math.min(100, activeNpc.friendship)}%` }}
                            />
                          </div>
                          <span className="font-mono-num text-xs font-semibold">
                            Freundschaft {activeNpc.friendship}/100
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <NeighborFarmPreview npc={activeNpc} />

                  <p className="text-sm text-[#4a321f] leading-relaxed">{activeNpc.bio}</p>

                  {/* Daily Social Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      disabled={activeNpc.helpedToday}
                      onClick={() => onHelpNeighbor(activeNpc.id)}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-[#dfd4bf] disabled:text-[#7c664e] text-white text-xs font-semibold transition-colors"
                    >
                      <HandHeart className="w-4 h-4" />
                      <span>
                        {activeNpc.helpedToday
                          ? 'Heute bereits geholfen'
                          : 'Auf dem Hof helfen (+35 M, +25 XP)'}
                      </span>
                    </button>

                    <button
                      disabled={activeNpc.giftedToday || gameState.coins < 30}
                      onClick={() => onGiveGift(activeNpc.id)}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-[#dfd4bf] disabled:text-[#7c664e] text-white text-xs font-semibold transition-colors"
                    >
                      <Gift className="w-4 h-4" />
                      <span>
                        {activeNpc.giftedToday
                          ? 'Heute schon beschenkt'
                          : 'Kleines Präsent (30 M → +10 Freundschaft)'}
                      </span>
                    </button>
                  </div>

                  {/* Neighbor Personal Requests (3x daily, scaled) */}
                  <div className="p-4 rounded-xl bg-[#faf6ee] border border-[#d6c7ae] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-display font-bold text-sm">
                        <Sprout className="w-4 h-4 text-emerald-700" />
                        <span>
                          Nachbarschafts-Bitten ({completedToday}/{MAX_NEIGHBOR_REQUESTS_PER_DAY} heute)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((step) => {
                          const done = completedToday > step;
                          const current = !allRequestsDoneToday && completedToday === step;
                          return (
                            <span
                              key={step}
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-mono-num font-bold border ${
                                done
                                  ? 'bg-emerald-700 text-white border-emerald-800'
                                  : current
                                  ? 'bg-amber-500 text-white border-amber-600'
                                  : 'bg-[#efe6d5] text-[#8f7758] border-[#d6c7ae]'
                              }`}
                            >
                              {done ? '✓' : step + 1}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {allRequestsDoneToday ? (
                      <div className="flex items-center gap-2.5 text-xs text-emerald-900 bg-emerald-100/70 border border-emerald-300 rounded-lg px-3 py-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>
                          Alle 3 Bitten von {activeNpc.name} für heute erfüllt! Morgen früh warten 3 neue, an dein Level angepasste Bitten auf dich.
                        </span>
                      </div>
                    ) : (
                      reqItem && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                              <span className="px-2 py-0.5 rounded bg-[#efe6d5] text-[#4a321f]">{stepMeta.label}</span>
                              {friendshipBonusPct > 0 && (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                  Freundschafts-Bonus +{friendshipBonusPct}%
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#5c4632] mt-1.5">
                              {activeNpc.name} wünscht sich{' '}
                              <strong>
                                {activeNpc.requestQty}× {reqItem.produceName}
                              </strong>{' '}
                              (Lager: {ownedReq}/{activeNpc.requestQty})
                            </div>
                            <div className="text-xs font-mono-num text-emerald-800 mt-0.5">
                              Dankeschön: +{activeNpc.rewardCoins} Münzen · +{activeNpc.rewardXp} XP · +{stepMeta.friendshipGain} Freundschaft
                              {stepMeta.bonusFertilizer > 0 ? ` · +${stepMeta.bonusFertilizer} Dünger` : ''}
                            </div>
                          </div>
                          <button
                            disabled={ownedReq < activeNpc.requestQty}
                            onClick={() => onFulfillNeighborRequest(activeNpc.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4a321f] hover:bg-[#3a2617] disabled:bg-[#dfd4bf] disabled:text-[#7c664e] text-white text-xs font-semibold transition-colors"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>Überreichen</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* HERZENSSACHE TAB (Vorschlag 1) */
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* 1. Pending Event Spark Decision */}
            {pendingSpark && sparkCandidate && (
              <section className="rounded-xl bg-rose-50 border border-rose-300 p-5 space-y-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="rounded-xl overflow-hidden border-2 border-rose-500 shrink-0 bg-white">
                    <PixelAvatarCanvas avatar={sparkCandidate.avatar} size={76} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="text-xs font-semibold text-rose-800">
                      Herzklopfen-Moment · Ausgelöst bei: {pendingSpark.eventLabel}
                    </div>
                    <h3 className="font-display font-bold text-xl text-[#2b2118]">
                      Dein Herz schlägt höher für {sparkCandidate.name}!
                    </h3>
                    <div className="text-xs text-[#5c4632]">
                      {sparkCandidate.role} · {sparkCandidate.originLabel}
                    </div>
                    <p className="text-sm text-[#4a321f] italic pt-1 leading-relaxed">
                      {pendingSpark.quote}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-[#4a321f] bg-white/90 border border-rose-200 rounded-lg px-3.5 py-2.5">
                  <strong>Partner-Stärke ({sparkCandidate.partnerPerkTitle}):</strong> {sparkCandidate.partnerPerkDesc}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={onDeclineSpark}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#efe6d5] border border-[#cbb799] text-xs font-semibold text-[#4a321f] transition-colors"
                  >
                    Höflich ablehnen
                  </button>
                  <button
                    onClick={onAcceptSpark}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-display font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <Heart className="w-4 h-4 fill-white" />
                    <span>Kennenlernen &amp; Verabreden</span>
                  </button>
                </div>
              </section>
            )}

            {/* 2. Level Gate Notice (< Lvl 80 & no active romance/spark) */}
            {!romanceUnlocked && !pendingSpark && romanceStatus === 'single' && (
              <section className="rounded-xl bg-white border border-[#d6c7ae] p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#efe6d5] flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-[#6e4a2e]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base">
                      Herzensbegegnungen starten ab Hof-Level {ROMANCE_UNLOCK_LEVEL}
                    </h3>
                    <p className="text-xs text-[#5c4632] leading-relaxed max-w-xl">
                      Ab Level {ROMANCE_UNLOCK_LEVEL} kann sich dein Bauer bei Dorffesten und Saison-Events
                      spontan in jemanden aus dem Tal verlieben. Danach pflegst du Zuneigung mit Geschenken &amp;
                      Dates bis zur gemeinsamen Hochzeit im Bauernhaus.
                    </p>
                  </div>
                </div>
                <div className="font-mono-num text-xs font-bold text-[#6e4a2e]">
                  Dein Level: {gameState.level} / {ROMANCE_UNLOCK_LEVEL}
                </div>
              </section>
            )}

            {/* 3. Crush / Dating View */}
            {romanceStatus === 'crush' && partnerSpec && (
              <>
                <section className="rounded-xl bg-white border border-[#d6c7ae] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl overflow-hidden border-2 border-rose-500 shrink-0">
                        <PixelAvatarCanvas avatar={partnerSpec.avatar} size={72} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-rose-700">
                          Frisch verliebt · {partnerSpec.originLabel}
                        </div>
                        <h3 className="font-display font-bold text-xl">{partnerSpec.name}</h3>
                        <div className="text-xs text-[#5c4632]">{partnerSpec.role}</div>
                        <div className="mt-2 flex items-center gap-2.5">
                          <div className="w-44 h-2.5 bg-[#efe6d5] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, romance?.affection || 0)}%` }}
                            />
                          </div>
                          <span className="font-mono-num text-xs font-bold text-rose-800">
                            Zuneigung {romance?.affection || 0} / 100 %
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(romance?.affection || 0) >= 100 && (
                        <button
                          onClick={onMarryPartner}
                          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-display font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Hochzeitsantrag machen (+2.500 XP)</span>
                        </button>
                      )}
                      <button
                        onClick={onBreakupRomance}
                        className="px-3 py-2 rounded-lg bg-[#f3ead9] hover:bg-[#e5d8c0] border border-[#d6c7ae] text-xs font-semibold text-[#5c4632] transition-colors"
                      >
                        Freundschaftlich beenden
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[#4a321f] leading-relaxed">{partnerSpec.bio}</p>

                  <div className="text-xs text-[#4a321f] bg-[#faf6ee] border border-[#d6c7ae] rounded-lg px-3.5 py-2.5">
                    <strong>Nach der Hochzeit:</strong> {partnerSpec.partnerPerkDesc}
                  </div>
                </section>

                {/* Favorite Gifts & Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <section className="rounded-xl bg-white border border-[#d6c7ae] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-display font-bold text-sm flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-amber-600" />
                        <span>Lieblingsgeschenke (+18 % Zuneigung)</span>
                      </h4>
                      <span className="text-[11px] font-mono-num text-[#6e4a2e]">
                        {giftedTodayRomance ? 'Heute überreicht' : '1× pro Tag'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {partnerSpec.favoriteGiftIds.map((giftId) => {
                        const item = CATALOG_BY_ID[giftId];
                        if (!item) return null;
                        const owned = gameState.inventory[giftId] || 0;
                        return (
                          <div
                            key={giftId}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#faf6ee] border border-[#e2d6c1]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-4 h-4 rounded-xs border border-black/20 shrink-0"
                                style={{ backgroundColor: item.pixelColor }}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">{item.produceName}</div>
                                <div className="text-[11px] font-mono-num text-[#6e4a2e]">
                                  Im Inventar: {owned}×
                                </div>
                              </div>
                            </div>
                            <button
                              disabled={giftedTodayRomance || owned < 1}
                              onClick={() => onGiveRomanceGift(giftId)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-[#dfd4bf] disabled:text-[#7c664e] text-white text-xs font-semibold shrink-0 transition-colors"
                            >
                              Schenken
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-xl bg-white border border-[#d6c7ae] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-display font-bold text-sm flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-rose-600" />
                        <span>Gemeinsame Dates</span>
                      </h4>
                      <span className="text-[11px] font-mono-num text-[#6e4a2e]">
                        {datedTodayRomance ? 'Heute erledigt' : '1× pro Tag'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {ROMANCE_DATES.map((d) => {
                        const parkMissing = Boolean(d.requiresThemePark && !gameState.themePark?.owned);
                        const canAfford = gameState.coins >= d.costCoins;
                        const disabled = datedTodayRomance || parkMissing || !canAfford;
                        return (
                          <div
                            key={d.id}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#faf6ee] border border-[#e2d6c1]"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{d.title}</div>
                              <div className="text-[11px] text-[#5c4632] leading-snug">{d.description}</div>
                              <div className="text-[11px] font-mono-num text-rose-800 mt-0.5">
                                +{d.affectionGain} % Zuneigung · +{d.xpReward} XP ·{' '}
                                {d.costCoins === 0 ? 'Kostenlos' : `${d.costCoins} M`}
                              </div>
                            </div>
                            <button
                              disabled={disabled}
                              onClick={() => onGoOnDate(d.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#4a321f] hover:bg-[#3a2617] disabled:bg-[#dfd4bf] disabled:text-[#7c664e] text-white text-xs font-semibold shrink-0 transition-colors"
                            >
                              {parkMissing ? 'Ab Park' : 'Date'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </>
            )}

            {/* 4. Married View */}
            {romanceStatus === 'married' && partnerSpec && (
              <>
                <section className="rounded-xl bg-white border border-emerald-300 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl overflow-hidden border-2 border-emerald-700 shrink-0">
                        <PixelAvatarCanvas avatar={partnerSpec.avatar} size={76} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-emerald-800">
                          Glücklich verheiratet seit Tag {romance?.marriedDay || gameState.day} · Wohnt im Bauernhaus
                        </div>
                        <h3 className="font-display font-bold text-xl">{partnerSpec.name}</h3>
                        <div className="text-xs text-[#5c4632]">
                          {partnerSpec.role} · {partnerBonuses.partnerSpec?.partnerPerkTitle}
                        </div>
                      </div>
                    </div>

                    {onOpenHouse && (
                      <button
                        onClick={onOpenHouse}
                        className="px-4 py-2 rounded-xl bg-[#4a321f] hover:bg-[#3a2617] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>Zum Bauernhaus</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#faf6ee] border border-[#e2d6c1]">
                      <div className="font-bold text-[#2b2118]">Tägliche Hofhilfe</div>
                      <div className="text-[#5c4632] mt-0.5">
                        {romance?.lastHelpDay === gameState.day
                          ? 'Heute ab 07:00 Uhr bereits erledigt.'
                          : 'Gießt ab 07:00 Uhr bis zu 8 Felder & bringt eine Überraschung mit.'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#faf6ee] border border-[#e2d6c1]">
                      <div className="font-bold text-[#2b2118]">Aktiver Partner-Bonus</div>
                      <div className="font-mono-num text-emerald-800 font-semibold mt-0.5">
                        +{partnerSpec.shopTipBonusPct}% Hofladen · +{partnerSpec.sellPriceBonusPct}% Verkauf · +{partnerSpec.xpBonusPct}% XP
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#faf6ee] border border-[#e2d6c1]">
                      <div className="font-bold text-[#2b2118]">Gemeinsame Erinnerungen</div>
                      <div className="font-mono-num text-[#5c4632] mt-0.5">
                        {romance?.datesCount || 0} Dates · {romance?.giftsCount || 0} Geschenke
                      </div>
                    </div>
                  </div>

                  {romance?.morningSurpriseText && (
                    <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                      <strong>Heutige Morgen-Notiz:</strong> {romance.morningSurpriseText}
                    </div>
                  )}
                </section>

                {/* Still allow daily gifts & dates while married for bonus XP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <section className="rounded-xl bg-white border border-[#d6c7ae] p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm">Kleine Freude machen (1× täglich)</h4>
                      <span className="text-[11px] font-mono-num text-[#6e4a2e]">
                        {giftedTodayRomance ? 'Heute überreicht' : '+120 XP'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {partnerSpec.favoriteGiftIds.map((giftId) => {
                        const item = CATALOG_BY_ID[giftId];
                        if (!item) return null;
                        const owned = gameState.inventory[giftId] || 0;
                        return (
                          <button
                            key={giftId}
                            disabled={giftedTodayRomance || owned < 1}
                            onClick={() => onGiveRomanceGift(giftId)}
                            className="px-3 py-2 rounded-lg bg-[#faf6ee] hover:bg-[#efe6d5] disabled:opacity-50 border border-[#cbb799] text-xs font-semibold flex items-center gap-1.5"
                          >
                            <span
                              className="w-3 h-3 rounded-xs border border-black/20"
                              style={{ backgroundColor: item.pixelColor }}
                            />
                            <span>
                              {item.produceName} ({owned}×)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-xl bg-white border border-[#d6c7ae] p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm">Gemeinsames Date (1× täglich)</h4>
                      <span className="text-[11px] font-mono-num text-[#6e4a2e]">
                        {datedTodayRomance ? 'Heute erledigt' : 'Bonus-XP'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ROMANCE_DATES.map((d) => {
                        const parkMissing = Boolean(d.requiresThemePark && !gameState.themePark?.owned);
                        const disabled = datedTodayRomance || parkMissing || gameState.coins < d.costCoins;
                        return (
                          <button
                            key={d.id}
                            disabled={disabled}
                            onClick={() => onGoOnDate(d.id)}
                            className="px-3 py-2 rounded-lg bg-[#4a321f] hover:bg-[#3a2617] disabled:bg-[#dfd4bf] disabled:text-[#7c664e] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>
                              {d.title} {d.costCoins > 0 ? `(${d.costCoins} M)` : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </>
            )}

            {/* 5. Single Overview & Candidate Gallery */}
            {romanceStatus === 'single' && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-base">
                      Dorfbewohner im Sonnental ({ROMANCE_CANDIDATES.length} Herzenskandidaten)
                    </h3>
                    <p className="text-xs text-[#5c4632]">
                      {romanceUnlocked
                        ? 'Nimm an Saison-Events oder am Dorffest (Tag 28 der Saison) teil — dort springt gelegentlich der Funke über!'
                        : `Wird ab Hof-Level ${ROMANCE_UNLOCK_LEVEL} bei Saison-Events & Dorffesten aktiv.`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROMANCE_CANDIDATES.map((cand) => (
                    <div
                      key={cand.id}
                      className="p-3.5 rounded-xl bg-white border border-[#d6c7ae] flex items-start gap-3"
                    >
                      <div className="rounded-lg overflow-hidden border border-black/20 shrink-0">
                        <PixelAvatarCanvas avatar={cand.avatar} size={50} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="font-display font-bold text-sm truncate">{cand.name}</div>
                        <div className="text-[11px] text-[#6e4a2e]">
                          {cand.role} · {cand.originLabel}
                        </div>
                        <p className="text-xs text-[#4a321f] leading-snug">{cand.bio}</p>
                        <div className="text-[11px] font-semibold text-emerald-800">
                          {cand.partnerPerkTitle}: +{cand.shopTipBonusPct}% Hofladen · +{cand.sellPriceBonusPct}% Verkauf · +{cand.xpBonusPct}% XP
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
