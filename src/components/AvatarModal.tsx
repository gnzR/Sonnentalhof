import React, { useState } from 'react';
import { Dices, Save, X } from 'lucide-react';
import {
  createRandomAvatar,
  HAIR_COLORS,
  OUTFIT_COLORS,
  OVERALL_COLORS,
  SKIN_TONES,
} from '../data/catalog';
import { AvatarConfig, HairStyle, HatStyle } from '../types/game';
import { PixelAvatarCanvas } from './PixelAvatarCanvas';

interface AvatarModalProps {
  avatar: AvatarConfig;
  onSave: (next: AvatarConfig) => void;
  onClose: () => void;
}

const HAIR_LABELS: { id: HairStyle; label: string }[] = [
  { id: 'short', label: 'Kurz' },
  { id: 'long', label: 'Lang' },
  { id: 'bob', label: 'Bob' },
  { id: 'curly', label: 'Lockig' },
  { id: 'braids', label: 'Zöpfe' },
  { id: 'bald', label: 'Glatze' },
];

const HAT_LABELS: { id: HatStyle; label: string }[] = [
  { id: 'none', label: 'Kein Hut' },
  { id: 'straw', label: 'Strohhut' },
  { id: 'cap', label: 'Bauernkappe' },
  { id: 'beret', label: 'Baskenmütze' },
  { id: 'flower', label: 'Blumenkranz' },
  { id: 'beanie', label: 'Wollmütze' },
];

export const AvatarModal: React.FC<AvatarModalProps> = ({ avatar, onSave, onClose }) => {
  const [draft, setDraft] = useState<AvatarConfig>(avatar);

  const handleRandomize = () => {
    setDraft(createRandomAvatar(draft.farmerName, draft.farmName));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-2xl bg-[#faf6ee] border-2 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        <div className="flex items-center justify-between px-6 py-4 bg-[#4a321f] text-[#faf6ee]">
          <div>
            <h2 className="font-display text-xl font-bold">Pixel-Avatar-Generator</h2>
            <p className="text-xs text-amber-200/90 mt-0.5">
              Erstelle deinen eigenen Bauernhof-Charakter oder würfle einen Zufalls-Look
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Schließen">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 max-h-[75vh] overflow-y-auto">
          {/* Left Preview Column */}
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl overflow-hidden border-4 border-[#6e4a2e] shadow-md bg-[#d9f0c7]">
              <PixelAvatarCanvas avatar={draft} size={144} />
            </div>
            <button
              onClick={handleRandomize}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
            >
              <Dices className="w-4 h-4" />
              <span>Zufällig würfeln</span>
            </button>
          </div>

          {/* Right Customization Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-semibold">
                Name der Figur
                <input
                  type="text"
                  maxLength={20}
                  value={draft.farmerName}
                  onChange={(e) => setDraft({ ...draft, farmerName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-[#cbb99d] text-sm font-medium focus:outline-2 focus:outline-emerald-700"
                />
              </label>
              <label className="block text-xs font-semibold">
                Name deines Hofs
                <input
                  type="text"
                  maxLength={24}
                  value={draft.farmName}
                  onChange={(e) => setDraft({ ...draft, farmName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-[#cbb99d] text-sm font-medium focus:outline-2 focus:outline-emerald-700"
                />
              </label>
            </div>

            {/* Skin Tone */}
            <div>
              <div className="text-xs font-semibold mb-1.5">Hautton</div>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft({ ...draft, skinTone: c })}
                    className={`w-8 h-8 rounded-lg border-2 ${
                      draft.skinTone === c ? 'border-[#2b2118] scale-105' : 'border-[#cbb99d]'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Hautton ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Hair Style */}
            <div>
              <div className="text-xs font-semibold mb-1.5">Frisur</div>
              <div className="flex flex-wrap gap-1.5">
                {HAIR_LABELS.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setDraft({ ...draft, hairStyle: h.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      draft.hairStyle === h.id
                        ? 'bg-[#4a321f] text-white'
                        : 'bg-[#efe6d5] text-[#2b2118] hover:bg-[#e3d5be]'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div>
              <div className="text-xs font-semibold mb-1.5">Haarfarbe</div>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft({ ...draft, hairColor: c })}
                    className={`w-8 h-8 rounded-lg border-2 ${
                      draft.hairColor === c ? 'border-[#2b2118] scale-105' : 'border-[#cbb99d]'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Haarfarbe ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Hat */}
            <div>
              <div className="text-xs font-semibold mb-1.5">Kopfbedeckung</div>
              <div className="flex flex-wrap gap-1.5">
                {HAT_LABELS.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setDraft({ ...draft, hat: h.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      draft.hat === h.id
                        ? 'bg-[#4a321f] text-white'
                        : 'bg-[#efe6d5] text-[#2b2118] hover:bg-[#e3d5be]'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Outfit & Overalls Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold mb-1.5">Hemdfarbe</div>
                <div className="flex flex-wrap gap-1.5">
                  {OUTFIT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDraft({ ...draft, outfitColor: c })}
                      className={`w-7 h-7 rounded-md border-2 ${
                        draft.outfitColor === c ? 'border-[#2b2118]' : 'border-[#cbb99d]'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1.5">Latzhose</div>
                <div className="flex flex-wrap gap-1.5">
                  {OVERALL_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDraft({ ...draft, overallsColor: c })}
                      className={`w-7 h-7 rounded-md border-2 ${
                        draft.overallsColor === c ? 'border-[#2b2118]' : 'border-[#cbb99d]'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Beard & Glasses */}
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.beard}
                  onChange={(e) => setDraft({ ...draft, beard: e.target.checked })}
                  className="w-4 h-4 accent-emerald-700"
                />
                Bart tragen
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.glasses}
                  onChange={(e) => setDraft({ ...draft, glasses: e.target.checked })}
                  className="w-4 h-4 accent-emerald-700"
                />
                Brille tragen
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[#efe6d5] border-t border-[#d6c7ae]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#4a321f] hover:bg-[#e3d5be]"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              onSave({
                ...draft,
                farmerName: draft.farmerName.trim() || 'Bauer',
                farmName: draft.farmName.trim() || 'Sonnenhof',
              });
              onClose();
            }}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
          >
            <Save className="w-4 h-4" />
            <span>Avatar speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
