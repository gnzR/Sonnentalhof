import { AvatarConfig, GameSettings, PetType } from '../types/game';

export const APP_DEVELOPER = 'w33derlich';
export const APP_VERSION_LABEL = 'Beta 1.1';

export interface PetCatalogEntry {
  type: PetType;
  title: string;
  defaultName: string;
  abilityName: string;
  description: string;
  helpSummary: string;
  primaryColor: string;
}

export const PET_CATALOG: Record<PetType, PetCatalogEntry> = {
  pig: {
    type: 'pig',
    title: 'Schwein',
    defaultName: 'Grunzi',
    abilityName: 'Ernte- & Trüffelschnüffler',
    description: 'Ein treues kleines Hofschwein mit feiner Nase für reife Früchte und Pilze.',
    helpSummary: 'Erntet reife Pilze & Pflanzen automatisch und findet Bonus-Münzen.',
    primaryColor: '#fda4af',
  },
  dog: {
    type: 'dog',
    title: 'Hund',
    defaultName: 'Bello',
    abilityName: 'Hofwächter & Gießhelfer',
    description: 'Ein wachsamer Hütehund, der Unwetter-Krähen verjagt und Felder gießt.',
    helpSummary: 'Gießt trockene Felder und verringert Katastrophen-Schäden zusätzlich.',
    primaryColor: '#d97706',
  },
  cat: {
    type: 'cat',
    title: 'Katze',
    defaultName: 'Minka',
    abilityName: 'Glückskatze & Stallhelfer',
    description: 'Eine flinke Hofkatze, die Tierprodukte einsammelt und Glück auf dem Markt bringt.',
    helpSummary: 'Sammelt reife Eier/Milch/Wolle ein und schenkt kleine Extra-XP.',
    primaryColor: '#f59e0b',
  },
  alien: {
    type: 'alien',
    title: 'Alien',
    defaultName: 'Zirp',
    abilityName: 'Kosmischer Wachstumsstrahl',
    description: 'Ein freundlicher kleiner Besucher aus dem All mit leuchtenden Fühlern.',
    helpSummary: 'Beschleunigt das Wachstum auf Beeten mit sanfter Sternenenergie und gießt.',
    primaryColor: '#4ade80',
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  resolution: '1080p',
  graphicsQuality: 'high',
  masterVolume: 0.75,
  musicVolume: 0.45,
  sfxVolume: 0.7,
  muted: false,
  currentTrackIndex: 0,
  musicPlaying: true,
  showGrid: true,
  showTimers: true,
  keybinds: {
    toolHand: '1',
    toolHoe: '2',
    toolWater: '3',
    toolFertilize: '4',
    toolPlant: '5',
    toolBuild: '9',
    toolRemove: '6',
    openMarket: 'b',
    openNeighbors: 'n',
    openEvents: 'e',
    openAvatar: 'p',
    openOptions: 'o',
    toggleMusic: 'm',
  },
};

export const SKIN_TONES = ['#fde2c8', '#f5d0b5', '#e6b89c', '#d4a373', '#a67451', '#734b32'];
export const HAIR_COLORS = ['#292524', '#573720', '#92400e', '#d97706', '#b91c1c', '#cbd5e1', '#facc15'];
export const OUTFIT_COLORS = ['#15803d', '#b91c1c', '#1d4ed8', '#d97706', '#0f766e', '#7c2d12', '#4f46e5'];
export const OVERALL_COLORS = ['#1e3a8a', '#334155', '#78350f', '#365314', '#581c87'];
export const EYE_COLORS = ['#1e293b', '#1e3a8a', '#14532d', '#78350f'];

export function createRandomAvatar(existingName?: string, existingFarm?: string): AvatarConfig {
  const firstNames = ['Lukas', 'Mia', 'Felix', 'Hannah', 'Tobias', 'Clara', 'Jonas', 'Emma', 'Moritz', 'Lea'];
  const farmNames = ['Sonnenhof', 'Lindenhof', 'Kleeblatt-Hof', 'Eichenhof', 'Wiesenblick', 'Bachmühle'];
  const hairStyles: AvatarConfig['hairStyle'][] = ['short', 'long', 'bob', 'curly', 'braids', 'bald'];
  const hats: AvatarConfig['hat'][] = ['none', 'straw', 'cap', 'beret', 'flower', 'beanie'];

  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  return {
    farmerName: existingName || pick(firstNames),
    farmName: existingFarm || pick(farmNames),
    skinTone: pick(SKIN_TONES),
    hairStyle: pick(hairStyles),
    hairColor: pick(HAIR_COLORS),
    eyeColor: pick(EYE_COLORS),
    outfitColor: pick(OUTFIT_COLORS),
    overallsColor: pick(OVERALL_COLORS),
    hat: pick(hats),
    beard: Math.random() < 0.25,
    glasses: Math.random() < 0.3,
  };
}
