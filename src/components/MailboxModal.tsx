import React, { useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Flame,
  Gift,
  Heart,
  Mail,
  MailOpen,
  Newspaper,
  PackageOpen,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { CATALOG_BY_ID, SEASON_LABELS, WEATHER_META } from '../data/catalog';
import { GameState, MailRewardItem, NewspaperIssue } from '../types/game';

interface MailboxModalProps {
  gameState: GameState;
  onClose: () => void;
  onCollectMail: () => void;
}

export const MailboxModal: React.FC<MailboxModalProps> = ({
  gameState,
  onClose,
  onCollectMail,
}) => {
  const mailbox = gameState.mailbox;
  const pending = mailbox?.pendingMail || null;
  const archive = mailbox?.archive || [];
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    pending?.issue?.id || archive[0]?.id || null
  );

  const activeIssue: NewspaperIssue | null =
    (selectedIssueId
      ? archive.find((i) => i.id === selectedIssueId) ||
        (pending?.issue?.id === selectedIssueId ? pending.issue : null)
      : null) ||
    pending?.issue ||
    archive[0] ||
    null;

  const renderRewardBadge = (r: MailRewardItem, idx: number) => {
    const iconColor =
      r.kind === 'coins'
        ? 'bg-amber-100 border-amber-400 text-amber-900'
        : r.kind === 'bait'
        ? 'bg-sky-100 border-sky-400 text-sky-900'
        : r.kind === 'elixir'
        ? 'bg-purple-100 border-purple-400 text-purple-900'
        : r.kind === 'fertilizer'
        ? 'bg-lime-100 border-lime-400 text-lime-900'
        : 'bg-emerald-100 border-emerald-400 text-emerald-900';
    return (
      <div
        key={`${r.kind}_${r.itemId || idx}`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${iconColor}`}
      >
        {r.kind === 'coins' ? (
          <Coins className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Gift className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>{r.label}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="bg-[#4a321f] px-5 py-4 text-[#faf6ee] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {pending ? (
              <Mail className="w-5 h-5 text-amber-300" />
            ) : (
              <MailOpen className="w-5 h-5 text-amber-200" />
            )}
            <div>
              <h2 className="font-display font-bold text-lg leading-tight">
                Hof-Briefkasten &amp; Sonnentaler Tagesblatt
              </h2>
              <p className="text-xs text-[#e6d7be]">
                Tägliche Postzustellung um 10:00 Uhr durch unseren Dorf-Postboten
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Today's Parcel / Pending Mail */}
          {pending ? (
            <div className="rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-[#fef9c3] p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/70 px-2.5 py-0.5 rounded-md mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Neue Post eingetroffen · {pending.deliveredAtTime} Uhr</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-[#2b2118]">{pending.title}</h3>
                  <p className="text-xs text-[#5c4632] mt-0.5 leading-relaxed">{pending.senderNote}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {pending.rewards.map((r, idx) => renderRewardBadge(r, idx))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-[#6e4a2e]">
                  Hinweis: Nicht abgeholte Post bleibt bis zur nächsten Lieferung um 10:00 Uhr erhalten.
                </span>
                <button
                  onClick={onCollectMail}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow cursor-pointer"
                >
                  <PackageOpen className="w-4 h-4" />
                  <span>Post &amp; Belohnungen entnehmen</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#d6c7ae] bg-[#efe6d5]/70 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[#4a321f]">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold">Briefkasten geleert.</span>{' '}
                  <span>
                    Der Postbote kommt täglich um <strong>10:00 Uhr</strong> auf der Dorfstraße vorbei.
                    {mailbox?.lastDeliveredDay === gameState.day
                      ? ' Die heutige Ausgabe wurde bereits zugestellt.'
                      : ''}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Newspaper Archive Switcher */}
          {archive.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#6e4a2e]">
                Zeitungs-Archiv ({archive.length} Ausgaben)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {archive.map((iss) => {
                  const isSel = activeIssue?.id === iss.id;
                  return (
                    <button
                      key={iss.id}
                      onClick={() => setSelectedIssueId(iss.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isSel
                          ? 'bg-[#4a321f] text-[#faf6ee] border-[#2b2118]'
                          : 'bg-[#f4ebd9] text-[#4a321f] border-[#cbb799] hover:bg-[#e8dac0]'
                      }`}
                    >
                      Tag {iss.day} · {SEASON_LABELS[iss.season]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sonnentaler Tagesblatt Newspaper View */}
          {activeIssue ? (
            <div className="rounded-xl border-2 border-[#786552] bg-[#f5efe2] p-5 shadow-inner space-y-4">
              {/* Masthead */}
              <div className="border-b-2 border-double border-[#4a321f] pb-3 text-center space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono-num uppercase tracking-wider text-[#5c4632]">
                  <span>Ausgabe Nr. {activeIssue.day}</span>
                  <span>
                    {SEASON_LABELS[activeIssue.season]} · {WEATHER_META[activeIssue.weather].label}
                  </span>
                  <span>Zugestellt {activeIssue.deliveredAtTime} Uhr</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Newspaper className="w-5 h-5 text-[#4a321f]" />
                  <h3 className="font-display font-extrabold text-xl tracking-wide uppercase text-[#2b2118]">
                    Sonnentaler Tagesblatt
                  </h3>
                </div>
                <div className="text-xs italic text-[#5c4632]">
                  Unabhängige Dorfzeitung für Hof, Hofladen, Talbach &amp; Wetter
                </div>
              </div>

              {/* Lead Headline */}
              <div className="bg-[#ebe1cd] border border-[#cbb799] rounded-lg p-3.5 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                  Titelthema vom {gameState.avatar?.farmName || 'Sonnenhof'}
                </div>
                <div className="font-display font-bold text-base text-[#2b2118] leading-snug">
                  {activeIssue.headline}
                </div>
                <p className="text-xs text-[#4a321f] leading-relaxed">{activeIssue.tip}</p>
              </div>

              {/* Wedding Chronicle Report(s) */}
              {activeIssue.weddingReports && activeIssue.weddingReports.length > 0 && (
                <div className="space-y-2">
                  {activeIssue.weddingReports.map((wRep) => (
                    <div
                      key={wRep.id}
                      className="rounded-lg bg-rose-50/95 border border-rose-300 p-3.5 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                          <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0" />
                          <span>Dorf-Gesellschaft &amp; Traumhochzeit</span>
                        </div>
                        <span className="font-mono-num text-[11px] text-rose-900 font-semibold">
                          Tag {wRep.day}
                        </span>
                      </div>
                      <div className="font-display font-bold text-sm text-[#2b2118]">
                        Läutende Glocken auf Hof „{wRep.farmName}“: Hochzeit mit {wRep.partnerName}!
                      </div>
                      <p className="text-xs text-[#4a321f] leading-relaxed">
                        Ganz Sonnental feierte gestern mit frischem Kuchen und Musik die Hochzeit auf Hof „
                        {wRep.farmName}“. {wRep.partnerName} ({wRep.partnerRole}) packt ab sofort tatkräftig auf dem
                        gemeinsamen Hof mit an!
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Market Crash Bulletin (Lvl 200+) */}
              {activeIssue.crashedItemIds && activeIssue.crashedItemIds.length > 0 && (
                <div className="rounded-lg bg-rose-50/95 border border-rose-300 p-3 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>Markt-Ticker: Überangebot &amp; Preissturz (-30 %)</span>
                  </div>
                  <p className="text-xs text-[#4a321f] leading-relaxed">
                    Heute drücken Großlieferungen den Marktpreis für{' '}
                    <strong>
                      {activeIssue.crashedItemIds
                        .map((id) => CATALOG_BY_ID[id]?.produceName || CATALOG_BY_ID[id]?.name || id)
                        .join(' & ')}
                    </strong>{' '}
                    um 30 %. Vorräte besser aufheben oder veredeln!
                  </p>
                </div>
              )}

              {/* Fire Brigade & Village Incident Report(s) */}
              {activeIssue.fireReports && activeIssue.fireReports.length > 0 && (
                <div className="space-y-2">
                  {activeIssue.fireReports.map((rep) => {
                    const hrs = Math.floor(rep.durationMinutes / 60);
                    const mins = rep.durationMinutes % 60;
                    const durText = hrs > 0 ? `${hrs} Std.${mins > 0 ? ` ${mins} Min.` : ''}` : `${mins} Min.`;
                    return (
                      <div
                        key={rep.id}
                        className="rounded-lg bg-rose-50/95 border border-rose-300 p-3.5 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>Blaulicht &amp; Feuerwehr-Chronik</span>
                          </div>
                          <span className="font-mono-num text-[11px] text-rose-900 font-semibold">
                            Tag {rep.day} · {rep.startedAtTime} Uhr · Einsatzdauer {durText}
                          </span>
                        </div>
                        <div className="font-display font-bold text-sm text-[#2b2118]">
                          Brand im Dorfhaus „{rep.houseName}“ — Freiwillige Feuerwehr im Großeinsatz!
                        </div>
                        <p className="text-xs text-[#4a321f] leading-relaxed">
                          <strong>Ermittelte Brandursache:</strong> {rep.causeTitle}. {rep.causeDetail} Während der
                          Löscharbeiten blieben alle Bewohner unverletzt, konnten jedoch vorübergehend nicht zum
                          Hofladen aufbrechen.
                        </p>
                        {rep.playerHelped && (
                          <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">
                            Ehrenmeldung: Ein besonderer Dank der Feuerwehr geht an{' '}
                            <strong>{gameState.avatar?.farmerName || 'Hof Sonnental'}</strong> vom{' '}
                            <strong>{gameState.avatar?.farmName || 'Sonnenhof'}</strong> für die rasche Unterstützung
                            vor Ort!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 24-Hour Farm Statistics */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#4a321f] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <span>24-Stunden Hof-Bilanz</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="rounded-lg bg-[#faf6ee] border border-[#cbb799] p-3">
                    <div className="text-[11px] text-[#6e4a2e]">Ernte &amp; Tierprodukte</div>
                    <div className="font-mono-num font-bold text-lg text-emerald-800">
                      {activeIssue.harvest24h}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#faf6ee] border border-[#cbb799] p-3">
                    <div className="text-[11px] text-[#6e4a2e]">Fänge am Talbach</div>
                    <div className="font-mono-num font-bold text-lg text-sky-800">
                      {activeIssue.fish24h}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#faf6ee] border border-[#cbb799] p-3">
                    <div className="text-[11px] text-[#6e4a2e]">Veredelte Waren</div>
                    <div className="font-mono-num font-bold text-lg text-amber-800">
                      {activeIssue.crafted24h}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#faf6ee] border border-[#cbb799] p-3">
                    <div className="text-[11px] text-[#6e4a2e]">Hofladen-Kunden</div>
                    <div className="font-mono-num font-bold text-lg text-[#2b2118]">
                      {activeIssue.shopVisitors24h}{' '}
                      <span className="text-xs font-normal text-[#6e4a2e]">
                        ({activeIssue.shopSold24h} Verkäufe)
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#faf6ee] border border-[#cbb799] p-3">
                    <div className="text-[11px] text-[#6e4a2e]">Hofladen-Umsatz</div>
                    <div className="font-mono-num font-bold text-lg text-amber-700">
                      {activeIssue.shopRevenue24h.toLocaleString('de-DE')} M
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#faf6ee] border border-[#cbb799] p-3">
                    <div className="text-[11px] text-[#6e4a2e]">Gesamt-Einnahmen</div>
                    <div className="font-mono-num font-bold text-lg text-emerald-700">
                      {activeIssue.soldCoins24h.toLocaleString('de-DE')} M
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Highlights Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#d6c7ae] text-xs text-[#4a321f]">
                <div className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-amber-800" />
                  <span>
                    Hofladen-Bestseller:{' '}
                    <strong>
                      {activeIssue.bestSellerItemId
                        ? CATALOG_BY_ID[activeIssue.bestSellerItemId]?.produceName ||
                          CATALOG_BY_ID[activeIssue.bestSellerItemId]?.name ||
                          activeIssue.bestSellerItemId
                        : 'Noch keine Verkäufe'}
                    </strong>
                  </span>
                </div>
                <div>
                  Nachbarschaftshilfen (24h):{' '}
                  <strong className="font-mono-num">{activeIssue.neighborHelps24h}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#cbb799] bg-[#f4ebd9]/60 p-6 text-center space-y-2">
              <Newspaper className="w-8 h-8 text-[#8c6e4e] mx-auto" />
              <div className="font-display font-bold text-sm text-[#4a321f]">
                Noch keine Tageszeitung zugestellt
              </div>
              <p className="text-xs text-[#6e4a2e] max-w-md mx-auto leading-relaxed">
                Sobald es <strong>10:00 Uhr</strong> wird, spaziert der Postbote die Straße entlang,
                wirft die aktuelle Ausgabe des <em>Sonnentaler Tagesblatts</em> mit deiner 24-Stunden-Bilanz ein und bringt kleine Belohnungen mit!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
