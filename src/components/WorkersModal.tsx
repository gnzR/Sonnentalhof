import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Check,
  Clock,
  Coins,
  Dices,
  Lock,
  Moon,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  getMaxWorkersForLevel,
  WORKER_NAMES,
  WORKER_ROLES,
  WORKER_WORK_END_MIN,
  WORKER_WORK_START_MIN,
  WORKERS_UNLOCK_LEVEL,
  workerXpRequiredForLevel,
} from '../data/catalog';
import { drawPixelWorker } from '../graphics/pixelSprites';
import { FarmWorker, GameState, WorkerRole, WorkerTasks } from '../types/game';

interface WorkersModalProps {
  gameState: GameState;
  onClose: () => void;
  onHireWorker: (role: WorkerRole, name: string) => void;
  onFireWorker: (workerId: string) => void;
  onToggleWorkerTask: (workerId: string, task: keyof WorkerTasks) => void;
  onRenameWorker: (workerId: string, nextName: string) => void;
  onPayWorkerArrears: (workerId: string) => void;
}

function WorkerPreviewCanvas({ worker, isResting }: { worker: FarmWorker; isResting: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = isResting ? '#334155' : '#d9f0c7';
    ctx.fillRect(0, 0, c.width, c.height);
    drawPixelWorker(ctx, 12, 16, worker, 4, 0, false, isResting, false);
  }, [worker, isResting]);

  return <canvas ref={ref} width={88} height={88} className="pixelated rounded-xl border-2 border-[#6e4a2e] shrink-0" />;
}

const TASK_LABELS: { key: keyof WorkerTasks; label: string; hint: string }[] = [
  { key: 'water', label: 'Felder gießen', hint: 'Bewässert trockene Ackerfelder automatisch' },
  { key: 'harvest', label: 'Ernten & Aufräumen', hint: 'Erntet reife Pflanzen/Pilze & räumt Unwetterschäden' },
  { key: 'animals', label: 'Tiere versorgen', hint: 'Sammelt reife Eier, Milch, Honig, Wolle & Trüffel' },
  { key: 'replant', label: 'Nachsäen (Vorrat)', hint: 'Sät leere Ackerfelder automatisch mit deinem Saatgut neu an' },
];

export const WorkersModal: React.FC<WorkersModalProps> = ({
  gameState,
  onClose,
  onHireWorker,
  onFireWorker,
  onToggleWorkerTask,
  onRenameWorker,
  onPayWorkerArrears,
}) => {
  const maxWorkers = getMaxWorkersForLevel(gameState.level);
  const workers = gameState.workers || [];
  const isWorkHours =
    gameState.ingameMinutes >= WORKER_WORK_START_MIN && gameState.ingameMinutes < WORKER_WORK_END_MIN;

  const pickUnusedName = () => {
    const used = new Set(workers.map((w) => w.name.toLowerCase()));
    const available = WORKER_NAMES.filter((n) => !used.has(n.toLowerCase()));
    const pool = available.length > 0 ? available : WORKER_NAMES;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const [selectedRole, setSelectedRole] = useState<WorkerRole>('allrounder');
  const [hireName, setHireName] = useState<string>(() => pickUnusedName());
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [confirmFireId, setConfirmFireId] = useState<string | null>(null);

  const totalDailyWage = workers.reduce((acc, w) => acc + w.dailyWage, 0);
  const totalUnpaid = workers.reduce((acc, w) => acc + (w.unpaidWage || 0), 0);

  const selectedMeta = WORKER_ROLES[selectedRole];
  const canAffordHire = gameState.coins >= selectedMeta.dailyWage;
  const hasFreeSlot = workers.length < maxWorkers;

  const tiers = [
    { level: 18, slots: 1, label: 'Lvl 18: 1. Angestellter' },
    { level: 60, slots: 2, label: 'Lvl 60: 2. Angestellter' },
    { level: 90, slots: 3, label: 'Lvl 90: 3. Angestellter' },
  ];

  const buildRolePreviewWorker = (role: WorkerRole): FarmWorker => {
    const m = WORKER_ROLES[role];
    return {
      id: `preview_${role}`,
      name: m.title,
      role,
      level: 1,
      xp: 0,
      dailyWage: m.dailyWage,
      unpaidWage: 0,
      onStrike: false,
      tasks: m.defaultTasks,
      x: 0,
      y: 0,
      workCooldownMs: 0,
      lastActionText: '',
      outfitColor: m.outfitColor,
      hatColor: m.hatColor,
    };
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-3xl bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-display text-xl font-bold">Hof-Personal &amp; Angestellte</h2>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Schichtzeit: 06:00–22:00 Uhr · Lohnabrechnung täglich um 0:00 Uhr
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Status & Slot Tier Bar */}
          <div className="p-4 rounded-xl bg-white border border-[#d6c7ae] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  Plätze belegt:{' '}
                  <strong className="font-mono-num text-sm">
                    {workers.length}/{maxWorkers}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Coins className="w-4 h-4 text-amber-600" />
                  Tageslohn gesamt (0:00 Uhr):{' '}
                  <strong className="font-mono-num text-sm">{totalDailyWage} M</strong>
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                    isWorkHours ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {isWorkHours ? <Clock className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  {isWorkHours ? 'Arbeitszeit (06–22 Uhr)' : 'Nachtruhe (22–06 Uhr)'}
                </span>
              </div>

              {totalUnpaid > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {totalUnpaid} M Lohn offen!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {tiers.map((tier) => {
                const unlocked = gameState.level >= tier.level;
                return (
                  <div
                    key={tier.level}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
                      unlocked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-[#f4ecdd] border-[#d6c7ae] text-[#7c664e]'
                    }`}
                  >
                    {unlocked ? (
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-[#8f7758] shrink-0" />
                    )}
                    <span>{tier.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Locked info if under Level 18 */}
          {gameState.level < WORKERS_UNLOCK_LEVEL ? (
            <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 text-sm space-y-2">
              <div className="font-display font-bold text-base text-amber-950 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>Ab Hof-Level {WORKERS_UNLOCK_LEVEL} verfügbar (aktuell Level {gameState.level})</span>
              </div>
              <p className="text-xs text-[#5c4632] leading-relaxed">
                Sobald dein Hof groß genug ist, kannst du fleißige Helfer einstellen: ab <strong>Level 18</strong> einen
                Angestellten, ab <strong>Level 60</strong> zwei und ab <strong>Level 90</strong> bis zu drei
                Angestellte gleichzeitig. Sie laufen sichtbar über deinen Hof, gießen, ernten und versorgen Tiere
                von 06:00 bis 22:00 Uhr.
              </p>
            </div>
          ) : null}

          {/* Currently Hired Workers */}
          {workers.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display font-bold text-sm text-[#4a321f]">
                Aktives Hof-Personal ({workers.length})
              </h3>
              {workers.map((w) => {
                const roleMeta = WORKER_ROLES[w.role];
                const xpNeed = workerXpRequiredForLevel(w.level);
                const xpPct = w.level >= 20 ? 100 : Math.min(100, Math.round((w.xp / Math.max(1, xpNeed)) * 100));
                const levelSpeedBonus = Math.min(3500, (w.level - 1) * 180);
                const effectiveCooldownSec = (Math.max(4500, roleMeta.baseCooldownMs - levelSpeedBonus) / 1000).toFixed(1);
                const draftName = editingNames[w.id] ?? w.name;

                return (
                  <div
                    key={w.id}
                    className={`p-4 rounded-xl border bg-white space-y-3 ${
                      w.onStrike ? 'border-rose-400 ring-1 ring-rose-300' : 'border-[#d6c7ae]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <WorkerPreviewCanvas worker={w} isResting={!isWorkHours} />

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-bold text-base">{w.name}</span>
                              <span className="px-2 py-0.5 rounded bg-[#efe6d5] text-[#4a321f] text-[11px] font-semibold">
                                {roleMeta.title}
                              </span>
                              {w.onStrike ? (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[11px] font-bold">
                                  Streik! ({w.unpaidWage} M offen)
                                </span>
                              ) : !isWorkHours ? (
                                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-semibold">
                                  Nachtruhe
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                                  Arbeitet
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#5c4632] mt-0.5 font-mono-num">
                              Tageslohn: {w.dailyWage} M (0:00 Uhr) · Tempo: alle {effectiveCooldownSec}s
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono-num text-xs font-bold text-emerald-800">
                              Personal-Lvl {w.level}/20
                            </div>
                            <div className="w-28 h-2 bg-[#efe6d5] rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${xpPct}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-[#4a321f] bg-[#faf6ee] border border-[#e5dac6] rounded-lg px-2.5 py-1.5">
                          Letzte Aktion: <span className="font-semibold">{w.lastActionText}</span>
                        </div>

                        {/* Task Checkboxes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {TASK_LABELS.map((t) => {
                            const checked = w.tasks[t.key];
                            return (
                              <label
                                key={t.key}
                                title={t.hint}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  checked
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                    : 'bg-[#faf6ee] border-[#ded2be] text-[#6e5a44]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => onToggleWorkerTask(w.id, t.key)}
                                  className="accent-emerald-700 w-3.5 h-3.5"
                                />
                                <span>{t.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer actions per worker */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#efe6d5]">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          maxLength={16}
                          value={draftName}
                          onChange={(e) =>
                            setEditingNames((prev) => ({ ...prev, [w.id]: e.target.value }))
                          }
                          className="w-32 px-2.5 py-1 rounded-lg bg-[#faf6ee] border border-[#cbb99d] text-xs"
                        />
                        <button
                          onClick={() => onRenameWorker(w.id, draftName.trim() || w.name)}
                          className="px-2.5 py-1 rounded-lg bg-[#efe6d5] hover:bg-[#e3d5be] text-[#2b2118] text-xs font-semibold"
                        >
                          Umbenennen
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {(w.onStrike || w.unpaidWage > 0) && (
                          <button
                            disabled={gameState.coins < w.unpaidWage}
                            onClick={() => onPayWorkerArrears(w.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-[#dfd4bf] disabled:text-[#7c664e] text-white text-xs font-semibold"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Offenen Lohn zahlen ({w.unpaidWage} M)</span>
                          </button>
                        )}

                        {confirmFireId === w.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                onFireWorker(w.id);
                                setConfirmFireId(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
                            >
                              Bestätigen
                            </button>
                            <button
                              onClick={() => setConfirmFireId(null)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e3d5be] text-xs font-semibold"
                            >
                              Abbruch
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmFireId(w.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Entlassen</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hire New Worker */}
          {(hasFreeSlot || gameState.level < WORKERS_UNLOCK_LEVEL) && (
            <div className="p-4 rounded-xl bg-white border border-[#d6c7ae] space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-display font-bold text-sm">
                  <UserPlus className="w-4 h-4 text-emerald-700" />
                  <span>
                    {gameState.level < WORKERS_UNLOCK_LEVEL
                      ? 'Verfügbare Berufsrollen (Vorschau)'
                      : `Neuen Angestellten einstellen (${workers.length}/${maxWorkers} belegt)`}
                  </span>
                </div>
                <span className="text-[11px] text-[#5c4632] inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Steigen durch Arbeit bis Lvl 20 auf!
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {(['allrounder', 'gardener', 'rancher'] as WorkerRole[]).map((role) => {
                  const meta = WORKER_ROLES[role];
                  const active = selectedRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`p-3 rounded-xl border text-left transition-colors flex flex-col gap-2 ${
                        active
                          ? 'bg-emerald-700 text-white border-emerald-900 shadow-sm'
                          : 'bg-[#faf6ee] text-[#2b2118] border-[#d6c7ae] hover:bg-[#efe6d5]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm">{meta.title}</span>
                      </div>
                      <p className={`text-[11px] leading-snug ${active ? 'text-emerald-100' : 'text-[#5c4632]'}`}>
                        {meta.subtitle}
                      </p>
                      <div className="mt-auto pt-1 flex items-center justify-between text-xs font-mono-num font-bold">
                        <span>{meta.dailyWage} M / Tag</span>
                        <span className={active ? 'text-emerald-200' : 'text-emerald-800'}>
                          alle {(meta.baseCooldownMs / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {hasFreeSlot && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <WorkerPreviewCanvas worker={buildRolePreviewWorker(selectedRole)} isResting={false} />
                    <label className="text-xs font-semibold flex-1">
                      Vorname des Helfers
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          maxLength={16}
                          value={hireName}
                          onChange={(e) => setHireName(e.target.value)}
                          placeholder="Name eingeben..."
                          className="w-40 px-3 py-2 rounded-lg bg-[#faf6ee] border border-[#cbb99d] text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setHireName(pickUnusedName())}
                          title="Zufälliger Name"
                          className="p-2 rounded-lg bg-[#efe6d5] hover:bg-[#e3d5be] border border-[#cbb99d] text-[#4a321f]"
                        >
                          <Dices className="w-4 h-4" />
                        </button>
                      </div>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={!canAffordHire}
                    onClick={() => {
                      const cleanName = hireName.trim() || pickUnusedName();
                      onHireWorker(selectedRole, cleanName);
                      setHireName(pickUnusedName());
                    }}
                    className="sm:ml-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-[#dfd4bf] disabled:text-[#7c664e] text-white text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      Einstellen ({selectedMeta.dailyWage} M erster Tageslohn)
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {!hasFreeSlot && gameState.level >= WORKERS_UNLOCK_LEVEL && gameState.level < 90 && (
            <div className="text-xs text-[#5c4632] bg-[#efe6d5]/70 border border-[#d6c7ae] rounded-xl px-4 py-2.5">
              Alle aktuellen Personal-Plätze sind belegt. Der nächste Platz wird ab{' '}
              <strong>Level {gameState.level < 60 ? 60 : 90}</strong> freigeschaltet!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
