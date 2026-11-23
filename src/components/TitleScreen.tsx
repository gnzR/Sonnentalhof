import React from 'react';
import { APP_DEVELOPER, APP_VERSION_LABEL, PET_CATALOG } from '../data/appMeta';
import { AvatarConfig, PetType } from '../types/game';
import { isDesktopClient } from '../utils/runtimeEnv';
import { PixelAvatarCanvas } from './PixelAvatarCanvas';
import { DesktopDownloadsCard } from './DesktopDownloadsCard';

const IconSprout: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M7 20h10" />
    <path d="M10 20c5.5-2.5.8-6.4 3-10" />
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8Z" />
    <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2Z" />
  </svg>
);

const IconSettings: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconDices: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect width="12" height="12" x="2" y="10" rx="2" ry="2" />
    <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" />
    <path d="M6 18h.01" />
    <path d="M10 14h.01" />
    <path d="M15 6h.01" />
    <path d="M18 9h.01" />
  </svg>
);

const IconPawPrint: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="11" cy="4" r="2" />
    <circle cx="18" cy="8" r="2" />
    <circle cx="20" cy="16" r="2" />
    <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
  </svg>
);

const IconPlay: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

interface TitleScreenProps {
  hasSave: boolean;
  avatar: AvatarConfig;
  selectedPet: PetType;
  onSelectPet: (pet: PetType) => void;
  onContinue: () => void;
  onNewGame: () => void;
  onRandomizeAvatar: () => void;
  onOpenOptions: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSave,
  avatar,
  selectedPet,
  onSelectPet,
  onContinue,
  onNewGame,
  onRandomizeAvatar,
  onOpenOptions,
}) => {
  return (
    <div className="h-screen w-full bg-[#243d1d] flex items-center justify-center p-4 sm:p-6 relative overflow-y-auto overflow-x-hidden">
      <div
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #3c6b2d 0px, #3c6b2d 24px, #2f5724 24px, #2f5724 48px)',
        }}
      />

      <div className="relative z-10 my-auto w-full max-w-4xl bg-[#faf6ee] border-4 border-[#4a321f] rounded-2xl shadow-2xl overflow-hidden text-[#2b2118]">
        <div className="bg-[#4a321f] px-8 py-5 text-[#faf6ee] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <IconSprout className="w-7 h-7 text-emerald-400" />
              <h1 className="font-display text-3xl font-extrabold tracking-tight">Sonnental Hof</h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-emerald-50 font-mono-num text-xs font-bold">
                {APP_VERSION_LABEL}
              </span>
            </div>
            <p className="text-sm text-amber-200/90 mt-0.5">
              2D-Pixel-Bauernhof · Level 1–249 · 4-Etagen-Bauernhaus · Hofladen · von {APP_DEVELOPER}
            </p>
          </div>
          <button
            onClick={onOpenOptions}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6e4a2e] hover:bg-[#7d5535] text-xs font-semibold transition-colors"
          >
            <IconSettings className="w-4 h-4" />
            <span>Optionen</span>
          </button>
        </div>

        <div className="p-7 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-7 items-start">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl overflow-hidden border-4 border-[#6e4a2e] shadow-md">
              <PixelAvatarCanvas avatar={avatar} size={148} />
            </div>
            <div className="text-center">
              <div className="font-display font-bold text-base">{avatar.farmerName}</div>
              <div className="text-xs text-[#5c4632]">{avatar.farmName}</div>
            </div>
            {!hasSave && (
              <button
                onClick={onRandomizeAvatar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#efe6d5] hover:bg-[#e2d3ba] text-xs font-semibold transition-colors"
              >
                <IconDices className="w-3.5 h-3.5" />
                <span>Zufalls-Avatar</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="text-sm text-[#4a321f] leading-relaxed">
              Lege Felder im Sonnental an, baue dein <strong>Bauernhaus auf bis zu 4 Etagen</strong> aus, züchte Pflanzen, Pilze und Tiere und ziehe mit der rechten Maustaste frei über die Weltkarte.
            </div>

            {/* Pet Selection for New Farm */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-display font-bold text-[#4a321f]">
                <IconPawPrint className="w-4 h-4 text-amber-700" />
                <span>Wähle deinen tierischen Hof-Helfer (levelbar):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(PET_CATALOG) as PetType[]).map((pt) => {
                  const info = PET_CATALOG[pt];
                  const active = selectedPet === pt;
                  return (
                    <button
                      key={pt}
                      onClick={() => onSelectPet(pt)}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        active
                          ? 'bg-emerald-700 text-white border-emerald-900'
                          : 'bg-white text-[#2b2118] border-[#d6c7ae] hover:bg-[#f2eadb]'
                      }`}
                    >
                      <div className="font-display font-bold text-xs">{info.title}</div>
                      <div className={`text-[11px] mt-0.5 leading-tight ${active ? 'text-emerald-100' : 'text-[#5c4632]'}`}>
                        {info.abilityName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {hasSave ? (
                <>
                  <button
                    onClick={onContinue}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-display font-bold text-base shadow-md transition-colors"
                  >
                    <IconPlay className="w-5 h-5" />
                    <span>Hof fortsetzen</span>
                  </button>
                  <button
                    onClick={onNewGame}
                    className="px-4 py-3 rounded-xl bg-[#efe6d5] hover:bg-[#e2d3ba] text-[#4a321f] text-xs font-semibold transition-colors"
                  >
                    Neuen Hof mit {PET_CATALOG[selectedPet].title} starten
                  </button>
                </>
              ) : (
                <button
                  onClick={onNewGame}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-display font-bold text-base shadow-md transition-colors"
                >
                  <IconPlay className="w-5 h-5" />
                  <span>Spiel starten</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#6e4a2e]">
              {APP_VERSION_LABEL} · Entwickler: {APP_DEVELOPER} · 11 ruhige MIDI-Stücke · Level 1–249 · 100 % lokal gespeichert
            </p>

            {!isDesktopClient() && <DesktopDownloadsCard compact />}
          </div>
        </div>
      </div>
    </div>
  );
};
