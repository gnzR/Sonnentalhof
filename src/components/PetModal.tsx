import React, { useEffect, useRef, useState } from 'react';
import { Heart, PawPrint, Sparkles, X } from 'lucide-react';
import { MAX_LEVEL, PET_CATALOG, petXpRequiredForLevel } from '../data/catalog';
import { drawPixelPet } from '../graphics/pixelSprites';
import { GameState, PetType } from '../types/game';

interface PetModalProps {
  gameState: GameState;
  onClose: () => void;
  onPetInteract: () => void;
  onRenamePet: (nextName: string) => void;
  onChangePetType: (nextType: PetType) => void;
}

function PetPreviewCanvas({ type }: { type: PetType }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#d9f0c7';
    ctx.fillRect(0, 0, c.width, c.height);
    drawPixelPet(ctx, 16, 16, type, 5, 0, false);
  }, [type]);

  return <canvas ref={ref} width={112} height={112} className="pixelated rounded-xl border-2 border-[#6e4a2e]" />;
}

export const PetModal: React.FC<PetModalProps> = ({
  gameState,
  onClose,
  onPetInteract,
  onRenamePet,
  onChangePetType,
}) => {
  const { pet } = gameState;
  const meta = PET_CATALOG[pet.type];
  const needed = petXpRequiredForLevel(pet.level);
  const pct = pet.level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((pet.xp / Math.max(1, needed)) * 100));
  const [nameInput, setNameInput] = useState(pet.name);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-2xl bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div className="flex items-center gap-2.5">
            <PawPrint className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-display text-xl font-bold">Dein Hof-Haustier</h2>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Hilft dir automatisch auf dem Hof · wird mit jedem Level schneller & stärker
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Active Pet Info */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-white border border-[#d6c7ae]">
            <PetPreviewCanvas type={pet.type} />
            <div className="flex-1 w-full space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-display font-bold text-lg">{pet.name}</div>
                  <div className="text-xs text-[#5c4632]">{meta.title} · {meta.abilityName}</div>
                </div>
                <span className="font-mono-num text-sm font-bold text-emerald-800">
                  Level {pet.level}/{MAX_LEVEL}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-2.5 bg-[#efe6d5] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono-num text-xs text-[#5c4632]">
                  {pet.level >= MAX_LEVEL ? 'MAX' : `${pet.xp}/${needed} XP`}
                </span>
              </div>

              <p className="text-xs text-[#4a321f]">{meta.helpSummary}</p>
              <div className="text-xs text-emerald-800 font-medium">
                Letzte Aktion: {pet.lastActionText}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  disabled={pet.petCooldownMs > 0}
                  onClick={onPetInteract}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-[#dfd4bf] disabled:text-[#7c664e] text-white text-xs font-semibold transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  <span>
                    {pet.petCooldownMs > 0
                      ? `Ausruhen (${Math.ceil(pet.petCooldownMs / 1000)}s)`
                      : 'Streicheln & Leckerli (+25 Tier-XP)'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Rename */}
          <div className="flex items-end gap-2">
            <label className="flex-1 text-xs font-semibold">
              Name deines Haustiers
              <input
                type="text"
                maxLength={18}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-[#cbb99d] text-sm"
              />
            </label>
            <button
              onClick={() => onRenamePet(nameInput.trim() || meta.defaultName)}
              className="px-4 py-2.5 rounded-lg bg-[#4a321f] hover:bg-[#3a2617] text-white text-xs font-semibold"
            >
              Umbenennen
            </button>
          </div>

          {/* Switch Companion */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-display font-bold text-sm">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Begleiter wechseln (Level bleibt erhalten)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(PET_CATALOG) as PetType[]).map((t) => {
                const info = PET_CATALOG[t];
                const active = pet.type === t;
                return (
                  <button
                    key={t}
                    onClick={() => onChangePetType(t)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-900'
                        : 'bg-white text-[#2b2118] border-[#d6c7ae] hover:bg-[#f2eadb]'
                    }`}
                  >
                    <div className="font-display font-bold text-sm">{info.title}</div>
                    <div className={`text-[11px] mt-0.5 ${active ? 'text-emerald-100' : 'text-[#5c4632]'}`}>
                      {info.abilityName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
