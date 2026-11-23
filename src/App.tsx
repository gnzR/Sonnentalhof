import React, { lazy, Suspense, useState } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { createRandomAvatar, DEFAULT_SETTINGS } from './data/appMeta';
import { loadSettings, peekSavedBootInfo } from './engine/storageBoot';
import type { InitialBootConfig } from './GameApp';
import { AvatarConfig, PetType } from './types/game';

const GameApp = lazy(() => import('./GameApp'));

export default function App() {
  const [bootInfo] = useState(() => peekSavedBootInfo());
  const [settings] = useState(() => loadSettings(DEFAULT_SETTINGS));
  const [avatar, setAvatar] = useState<AvatarConfig>(() => bootInfo.avatar ?? createRandomAvatar());
  const [selectedPet, setSelectedPet] = useState<PetType>('dog');
  const [bootConfig, setBootConfig] = useState<InitialBootConfig | null>(null);

  if (bootConfig) {
    return (
      <Suspense
        fallback={
          <div className="h-screen w-full bg-[#243d1d] flex items-center justify-center p-6 text-[#faf6ee]">
            <div className="bg-[#4a321f] border-4 border-[#6e4a2e] rounded-2xl px-8 py-6 shadow-2xl text-center space-y-2">
              <div className="font-display text-2xl font-extrabold">Sonnental Hof wird geladen…</div>
              <div className="text-xs text-amber-200/90">Bereite Hof, Dorf &amp; Tiere vor.</div>
            </div>
          </div>
        }
      >
        <GameApp initialBoot={bootConfig} />
      </Suspense>
    );
  }

  return (
    <TitleScreen
      hasSave={bootInfo.hasSave}
      avatar={avatar}
      selectedPet={selectedPet}
      onSelectPet={setSelectedPet}
      onContinue={() =>
        setBootConfig({
          mode: 'continue',
          selectedPet,
          avatar,
          settings,
        })
      }
      onNewGame={() =>
        setBootConfig({
          mode: 'new',
          selectedPet,
          avatar,
          settings,
        })
      }
      onRandomizeAvatar={() =>
        setAvatar((prev) => createRandomAvatar(prev.farmerName, prev.farmName))
      }
      onOpenOptions={() =>
        setBootConfig({
          mode: 'options',
          selectedPet,
          avatar,
          settings,
        })
      }
    />
  );
}
