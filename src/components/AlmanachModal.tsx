import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  ChefHat,
  Fish,
  Flame,
  Lock,
  Sparkles,
  Sprout,
  Trees,
  X,
} from 'lucide-react';
import { CATALOG_BY_ID, SEASON_LABELS, WEATHER_META } from '../data/catalog';
import { ALMANAC_TRACKABLE_ITEMS, formatDurationMs, getAlmanacBonuses } from '../engine/gameLogic';
import { GameState } from '../types/game';

interface AlmanachModalProps {
  gameState: GameState;
  onClose: () => void;
}

type AlmanacTab = 'crop' | 'mushroom' | 'tree' | 'meat' | 'artisan' | 'fish';

const ALMANAC_MILESTONES = [
  { count: 5, label: '+5 % Verkaufserlös' },
  { count: 12, label: '+8 % Hof-XP & +10 % Veredelungstempo' },
  { count: 20, label: '+10 % Baumwachstum & +8 % Fisch-Qualität' },
  { count: 30, label: '+10 % Verkaufserlös & +12 % Veredelungstempo' },
  { count: 40, label: '+12 % Hof-XP & +15 % Baumwachstum' },
];

export const AlmanachModal: React.FC<AlmanachModalProps> = ({ gameState, onClose }) => {
  const [tab, setTab] = useState<AlmanacTab>('crop');

  const discoveredSet = useMemo(
    () => new Set(gameState.almanac?.discoveredIds || []),
    [gameState.almanac?.discoveredIds]
  );
  const fishRecords = gameState.almanac?.fishRecords || {};
  const bonuses = useMemo(() => getAlmanacBonuses(gameState.almanac), [gameState.almanac]);

  const tabItems = useMemo(
    () => ALMANAC_TRACKABLE_ITEMS.filter((item) => item.category === tab),
    [tab]
  );

  const tabCounts = useMemo(() => {
    const categories: AlmanacTab[] = ['crop', 'mushroom', 'tree', 'meat', 'artisan', 'fish'];
    const result: Record<AlmanacTab, { unlocked: number; total: number }> = {
      crop: { unlocked: 0, total: 0 },
      mushroom: { unlocked: 0, total: 0 },
      tree: { unlocked: 0, total: 0 },
      meat: { unlocked: 0, total: 0 },
      artisan: { unlocked: 0, total: 0 },
      fish: { unlocked: 0, total: 0 },
    };
    ALMANAC_TRACKABLE_ITEMS.forEach((item) => {
      if ((categories as string[]).includes(item.category)) {
        const cat = item.category as AlmanacTab;
        result[cat].total += 1;
        if (discoveredSet.has(item.id)) result[cat].unlocked += 1;
      }
    });
    return result;
  }, [discoveredSet]);

  const pct =
    bonuses.totalCount > 0 ? Math.round((bonuses.unlockedCount / bonuses.totalCount) * 100) : 0;

  const tabs: { id: AlmanacTab; label: string; icon: React.ReactNode }[] = [
    { id: 'crop', label: 'Pflanzen', icon: <Sprout className="w-3.5 h-3.5" /> },
    { id: 'mushroom', label: 'Pilze', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'tree', label: 'Obstbäume', icon: <Trees className="w-3.5 h-3.5" /> },
    { id: 'meat', label: 'Hof-Fleisch', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'artisan', label: 'Veredelungen', icon: <ChefHat className="w-3.5 h-3.5" /> },
    { id: 'fish', label: 'Fisch-Rekordbuch', icon: <Fish className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-5xl max-h-[88vh] flex flex-col bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold">Hof-Almanach &amp; Fisch-Rekordbuch</h2>
              <p className="text-xs text-amber-200/90 mt-0.5 font-mono-num">
                Entdeckte Einträge: {bonuses.unlockedCount} / {bonuses.totalCount} ({pct} %) · Schaltet dauerhafte Hof-Boni frei
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Almanach schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bonus Milestones Banner */}
        <div className="px-6 py-3.5 bg-[#efe6d5] border-b border-[#d6c7ae] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4a321f]">
              <Award className="w-4 h-4 text-amber-700" />
              <span>Aktive Almanach-Boni:</span>
              <span className="font-mono-num font-semibold text-emerald-800">
                Verkauf +{Math.round((bonuses.sellMult - 1) * 100)} % · XP +{Math.round((bonuses.xpMult - 1) * 100)} % ·
                Veredelung +{Math.round((bonuses.craftSpeedMult - 1) * 100)} % · Bäume +{Math.round((bonuses.treeSpeedMult - 1) * 100)} %
              </span>
            </div>
            <div className="w-40 h-2 bg-[#d6c7ae] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-700 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALMANAC_MILESTONES.map((ms) => {
              const reached = bonuses.unlockedCount >= ms.count;
              return (
                <div
                  key={ms.count}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                    reached
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-[#faf6ee] border-[#d6c7ae] text-[#785c42]'
                  }`}
                >
                  {reached ? <Check className="w-3 h-3 text-emerald-700" /> : <Lock className="w-3 h-3" />}
                  <span className="font-mono-num">{ms.count}:</span>
                  <span>{ms.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-[#f5efe3] border-b border-[#dfd3be] overflow-x-auto">
          {tabs.map((t) => {
            const c = tabCounts[t.id];
            return (
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
                <span
                  className={`font-mono-num text-[10px] px-1.5 py-0.5 rounded ${
                    tab === t.id ? 'bg-white/20 text-white' : 'bg-[#e3d5be] text-[#4a321f]'
                  }`}
                >
                  {c.unlocked}/{c.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Entries Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {tabItems.map((item) => {
              const discovered = discoveredSet.has(item.id);
              const fishRec = item.category === 'fish' ? fishRecords[item.id] : undefined;

              if (!discovered) {
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#f1ece1] border border-[#d6c7ae] opacity-80 flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#ded3be] border border-[#c4b59a] flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-[#785c42]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm text-[#5c4632]">??? (Unentdeckt)</div>
                        <div className="text-[11px] text-[#785c42] font-mono-num">
                          {item.category === 'fish'
                            ? `Ab Angel-Level ${item.unlockLevel}`
                            : `Ab Hof-Level ${item.unlockLevel}`}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#6e563f]">
                      {item.category === 'fish'
                        ? 'Fange diesen Fisch im Talbach, um seine Größe & Rekordwerte festzuhalten.'
                        : item.category === 'meat'
                        ? 'Fällt nach dem natürlichen Lebenszyklus eines Nutztiers (Ø 3 Ingame-Tage) auf der Weide an.'
                        : item.category === 'artisan'
                        ? 'Stelle diese Spezialität an einer Veredelungs-Station her.'
                        : `Ernte ${item.produceName} (${item.seasons.map((s) => SEASON_LABELS[s]).join(', ')}), um den Eintrag freizuschalten.`}
                    </p>
                  </div>
                );
              }

              const metaItem = CATALOG_BY_ID[item.id] || item;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white border border-[#d6c7ae] flex flex-col justify-between gap-2.5 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg border-2 border-black/15 shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: metaItem.pixelColor }}
                        >
                          {metaItem.category === 'fish' ? (
                            <Fish className="w-4 h-4 text-white drop-shadow" />
                          ) : (
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20"
                              style={{ backgroundColor: metaItem.accentColor }}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display font-bold text-sm truncate">{metaItem.produceName}</h4>
                          <div className="text-[11px] text-[#6e4a2e] truncate">{metaItem.name}</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                        <Check className="w-3 h-3" /> Entdeckt
                      </span>
                    </div>

                    <p className="text-xs text-[#5c4632] leading-snug">{metaItem.description}</p>
                  </div>

                  {item.category === 'fish' ? (
                    <div className="pt-2 border-t border-[#efe6d5] text-[11px] font-mono-num space-y-1 text-[#4a321f]">
                      <div className="flex items-center justify-between">
                        <span>Rekord-Länge:</span>
                        <strong className="text-sky-800">
                          {fishRec ? `${fishRec.maxCm.toFixed(1)} cm` : '—'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Rekord-Gewicht:</span>
                        <strong className="text-sky-800">
                          {fishRec ? `${fishRec.maxGrams.toLocaleString('de-DE')} g` : '—'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Bisher gefangen:</span>
                        <strong>{fishRec?.catches ?? 1}×</strong>
                      </div>
                      {fishRec?.bestWeather && (
                        <div className="flex items-center justify-between text-[#5c4632]">
                          <span>Rekord-Wetter:</span>
                          <span>{WEATHER_META[fishRec.bestWeather].label}</span>
                        </div>
                      )}
                      {metaItem.minCm !== undefined && metaItem.maxCm !== undefined && (
                        <div className="text-[10px] text-[#785c42]">
                          Typische Spanne: {metaItem.minCm}–{metaItem.maxCm} cm · Basiswert {metaItem.sellPrice} M
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[#efe6d5] text-[11px] font-mono-num text-[#5c4632] flex flex-wrap gap-x-2.5 gap-y-0.5">
                      <span>Basiswert: {metaItem.sellPrice} M</span>
                      {metaItem.growthMs > 0 && <span>· Reife: {formatDurationMs(metaItem.growthMs)}</span>}
                      {metaItem.regrowMs && <span>· Nachwachsen: {formatDurationMs(metaItem.regrowMs)}</span>}
                      <span>· Saison: {metaItem.seasons.map((s) => SEASON_LABELS[s]).join(', ')}</span>
                      {metaItem.weatherAffinity && (
                        <span>· Mag {WEATHER_META[metaItem.weatherAffinity].label}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
