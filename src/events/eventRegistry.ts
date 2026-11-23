import type React from 'react';
import type { audioEngine } from '../audio/midiEngine';
import { GRID_SIZE } from '../data/catalog';
import { VILLAGE_HOUSE_BY_ID } from '../data/village';
import {
  triggerBusinessOutageEvent,
  triggerEconomyInspectionEvent,
  triggerFireworksEvent,
  triggerMarketCrashEvent,
  triggerRomanceSparkForced,
  triggerSantaSleighEvent,
  triggerShopSpoilageEvent,
  triggerSuperstormWarningEvent,
  triggerVillageFireEvent,
} from '../engine/gameLogic';
import type { GameState, ToastMessage } from '../types/game';

export type GameEventCategory = 'hof' | 'dorf' | 'fest';

export const GAME_EVENT_CATEGORY_LABELS: Record<GameEventCategory, string> = {
  hof: 'Hof-Ereignisse',
  dorf: 'Dorf-Ereignisse',
  fest: 'Feste & Saison-Events',
};

export interface GameEventContext {
  state: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  triggerUfoAt: (x: number, y: number) => void;
  spawnFloat: (x: number, y: number, text: string, color: string, isWorldCoord?: boolean) => void;
  pushToast: (title: string, description: string, tone?: ToastMessage['tone']) => void;
  playSfx: (kind: Parameters<typeof audioEngine.playSfx>[0]) => void;
  openRomanceModal?: () => void;
}

export interface GameEventDefinition {
  /** Eindeutige Event-ID */
  id: string;
  /** Anzeigename im Admin-Menü */
  name: string;
  /** Kurze Beschreibung, was beim Auslösen im Spiel passiert */
  description: string;
  /** Automatische Gruppierung im Admin-Menü */
  category: GameEventCategory;
  /** Icon / Emoji */
  icon: string;
  /** Optionale Aktiv-Erkennung für Live-Status-Badge */
  isActive?: (state: GameState) => boolean;
  /** Sofort-Auslöser zum Testen in der Vorschau */
  trigger: (ctx: GameEventContext) => void;
}

/**
 * Prüft sowohl zur Build-Zeit (import.meta.env.DEV) als auch zur Laufzeit,
 * ob das Vorschau-Admin-Menü aktiv sein darf.
 * In fertigen Desktop-Builds (.tar.gz / .exe) ist import.meta.env.DEV === false,
 * sodass Vite das gesamte Admin-Menü per Tree-Shaking aus dist/ entfernt.
 */
export function isPreviewAdminAvailable(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  if (window.location.protocol === 'file:') return false;
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')) {
    return false;
  }
  return true;
}

/**
 * Zentrale Event-Registry („Event“):
 * Jedes hier eingetragene neue Event erscheint automatisch im Vorschau-Admin-Menü
 * und kann dort direkt ausgelöst und getestet werden.
 */
export const GAME_EVENTS: GameEventDefinition[] = [
  {
    id: 'ufo',
    name: 'UFO-Besuch (Traktorstrahl)',
    description:
      'Lässt sofort eine fliegende Untertasse über einer Kuh bzw. der Weide einschweben, zündet den Lichtstrahl und fliegt wieder ab.',
    category: 'hof',
    icon: '🛸',
    trigger: ({ state, triggerUfoAt, playSfx, spawnFloat, pushToast }) => {
      const cowTiles: { x: number; y: number }[] = [];
      const unlockedTiles: { x: number; y: number }[] = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const tile = state.tiles[y]?.[x];
          if (!tile?.unlocked) continue;
          if (tile.entity?.itemId === 'cow') {
            cowTiles.push({ x, y });
          } else if (!tile.entity) {
            unlockedTiles.push({ x, y });
          }
        }
      }
      const target =
        cowTiles.length > 0
          ? cowTiles[Math.floor(Math.random() * cowTiles.length)]
          : unlockedTiles.length > 0
            ? unlockedTiles[Math.floor(Math.random() * unlockedTiles.length)]
            : { x: 6, y: 6 };

      playSfx('alert');
      triggerUfoAt(target.x, target.y);
      spawnFloat(target.x, target.y, '👽 Muuuuh?!', '#67e8f9');
      pushToast(
        'Event ausgelöst: UFO-Besuch',
        `Untertasse steuert Feld (${target.x + 1}, ${target.y + 1}) an (Test-Vorschau ohne Tierverlust).`,
        'info'
      );
    },
  },
  {
    id: 'village_fire',
    name: 'Dorfbrand & Feuerwehr',
    description:
      'Entzündet sofort ein Dorfhaus (2–3 Ingame-Std.), lässt die Feuerwehr animiert anrücken, blockiert dortige Einkäufer und bereitet den Zeitungsbericht vor.',
    category: 'dorf',
    icon: '🚒',
    isActive: (state) => Boolean(state.villageFire?.active),
    trigger: ({ state, setGameState, playSfx, spawnFloat, pushToast }) => {
      const fireRes = triggerVillageFireEvent(state);
      setGameState((prev) => ({
        ...prev,
        villageFire: fireRes.nextState.villageFire,
      }));
      playSfx('alert');
      const fh = VILLAGE_HOUSE_BY_ID[fireRes.houseId];
      if (fh) {
        spawnFloat(fh.doorX, fh.y - 0.3, '🔥 Feuerwehreinsatz!', '#fb7185', true);
      }
      pushToast(
        `Event ausgelöst: Brand bei „${fireRes.houseName}“`,
        `Ursache: ${fireRes.causeTitle} · Feuerwehr rückt aus!`,
        'warning'
      );
    },
  },
  {
    id: 'santa',
    name: 'Weihnachtsmann-Schlitten',
    description:
      'Schickt sofort den Weihnachtsmann samt Rentieren über Hof & Dorf und wirft ein Festtags-Geschenk per Fallschirm auf ein freies Feld ab.',
    category: 'fest',
    icon: '🎅',
    isActive: (state) => Boolean(state.winterFestival?.santaSleigh?.active),
    trigger: ({ setGameState, playSfx, pushToast }) => {
      setGameState((prev) => triggerSantaSleighEvent(prev).nextState);
      playSfx('santa');
      pushToast(
        'Event ausgelöst: Weihnachtsmann',
        'Ho Ho Ho! Der Schlitten fliegt gleich über den Hof und wirft ein Geschenk ab.',
        'success'
      );
    },
  },
  {
    id: 'new_year_fireworks',
    name: 'Silvester-Feuerwerk',
    description:
      'Startet sofort die 3-minütige Silvester-Show mit bunten Raketen und Leuchtspuren am Himmel über Sonnental.',
    category: 'fest',
    icon: '🎆',
    isActive: (state) => Boolean(state.winterFestival?.fireworks?.active),
    trigger: ({ setGameState, playSfx, pushToast }) => {
      setGameState((prev) => triggerFireworksEvent(prev));
      playSfx('firework');
      pushToast(
        'Event ausgelöst: Silvester-Feuerwerk',
        'Raketen & Leuchtsterne steigen sofort über Hof und Dorf auf!',
        'success'
      );
    },
  },
  {
    id: 'romance_spark',
    name: 'Herzklopfen-Moment (Lvl 80+)',
    description:
      'Löst sofort eine romantische Event-Begegnung mit einem Dorfbewohner aus, um das Social- & Heiratssystem direkt zu testen.',
    category: 'dorf',
    icon: '💘',
    isActive: (state) => Boolean(state.romance?.pendingSpark),
    trigger: ({ state, setGameState, playSfx, pushToast, openRomanceModal }) => {
      const res = triggerRomanceSparkForced(state, 'Saison-Dorffest (Vorschau-Event)');
      setGameState((prev) => ({
        ...prev,
        romance: res.state.romance,
      }));
      playSfx('levelup');
      pushToast(
        `Herzklopfen: ${res.candidate.name}!`,
        'Öffne Nachbarn & Liebe → Herzenssache, um zu antworten.',
        'success'
      );
      openRomanceModal?.();
    },
  },
  {
    id: 'market_crash',
    name: 'Markt-Preissturz (-30 %)',
    description:
      'Löst sofort einen -30 % Preissturz auf 2 Hofprodukte aus (Lvl 200+ Marktkrise zum direkten Testen).',
    category: 'dorf',
    icon: '📉',
    isActive: (state) => (state.marketCrashedItems?.length || 0) > 0,
    trigger: ({ state, setGameState, playSfx, pushToast }) => {
      const res = triggerMarketCrashEvent({ ...state, level: Math.max(state.level, 200) });
      setGameState((prev) => ({
        ...prev,
        marketCrashedItems: res.nextState.marketCrashedItems,
      }));
      playSfx('alert');
      pushToast(
        'Event ausgelöst: Markt-Preissturz',
        res.itemNames.length > 0
          ? `Preissturz (-30 %): ${res.itemNames.join(', ')}.`
          : 'Preissturz-Ereignis ausgelöst.',
        'warning'
      );
    },
  },
  {
    id: 'business_outage',
    name: 'Betriebs-Störung / Sabotage',
    description:
      'Legt einen gekauften Westviertel-Betrieb oder den Abenteuerpark vorübergehend lahm bis zur Reparatur.',
    category: 'dorf',
    icon: '🔧',
    isActive: (state) =>
      Object.keys(state.villageBusinesses?.brokenById || {}).length > 0 ||
      Boolean(state.themePark?.breakdown),
    trigger: ({ state, setGameState, playSfx, pushToast }) => {
      const res = triggerBusinessOutageEvent(state);
      if (res) {
        setGameState((prev) => ({
          ...prev,
          villageBusinesses: res.nextState.villageBusinesses,
          themePark: res.nextState.themePark,
        }));
      }
      playSfx('alert');
      pushToast(
        'Event ausgelöst: Betriebs-Ausfall',
        res
          ? `Betroffen: ${res.label} (${res.reason})`
          : 'Kaufe zuerst einen Betrieb oder Freizeitpark für Störungen.',
        res ? 'warning' : 'info'
      );
    },
  },
  {
    id: 'economy_inspection',
    name: 'Finanzamt & Sonderabgabe',
    description:
      'Zieht die 2-Tages-Gewerbeprüfung ein (2,5 % des Barvermögens, min. 25k, max. 350k M).',
    category: 'dorf',
    icon: '🏛️',
    trigger: ({ state, setGameState, playSfx, pushToast }) => {
      const previewState = {
        ...state,
        level: Math.max(state.level, 200),
        coins: Math.max(state.coins, 200_000),
      };
      const res = triggerEconomyInspectionEvent(previewState);
      setGameState((prev) => ({
        ...prev,
        coins: Math.max(0, prev.coins - res.levyCoins),
        economyCrisis: res.nextState.economyCrisis,
        stats: res.nextState.stats,
      }));
      playSfx('alert');
      pushToast(
        'Event ausgelöst: Sonderabgabe',
        res.levyCoins > 0
          ? `Finanzprüfung eingezogen: -${res.levyCoins.toLocaleString('de-DE')} M`
          : 'Gewerbeprüfung durchgeführt.',
        'warning'
      );
    },
  },
  {
    id: 'shop_spoilage',
    name: 'Hofladen-Nachtverderb',
    description:
      'Simuliert den Mitternachts-Verderb ungeschützter Veredelungen (>3 Stk. pro Fach im Hofladen).',
    category: 'hof',
    icon: '🧀',
    trigger: ({ state, setGameState, playSfx, pushToast }) => {
      const res = triggerShopSpoilageEvent(state);
      if (res.totalLostQty > 0) {
        setGameState((prev) => ({
          ...prev,
          farmShop: res.nextState.farmShop,
        }));
      }
      playSfx(res.totalLostQty > 0 ? 'alert' : 'click');
      pushToast(
        res.totalLostQty > 0 ? `Hofladen-Verderb: -${res.totalLostQty} Stk.` : 'Kein Verderb ausgelöst',
        res.totalLostQty > 0
          ? 'Zu viel Vorrat ohne 4. Etage/2 Helfer/6 Extras über Nacht verdorben!'
          : state.farmShop?.stock && Object.keys(state.farmShop.stock).length > 0
          ? 'Dein Hofladen ist vollständig gekühlt oder unter 3 Stk./Fach!'
          : 'Lege zuerst >3 Stk. einer Spezialität ins Hofladen-Regal.',
        res.totalLostQty > 0 ? 'warning' : 'info'
      );
    },
  },
  {
    id: 'superstorm',
    name: 'Jahrhundert-Superzelle',
    description:
      'Startet eine 18-Sekunden-Unwetterwarnung (Lvl 200+ Superzelle), die einfache Vogelscheuchen teilweise durchschlägt.',
    category: 'hof',
    icon: '⛈️',
    isActive: (state) => state.disasterWarning?.type === 'superstorm',
    trigger: ({ setGameState, playSfx, pushToast }) => {
      setGameState((prev) => triggerSuperstormWarningEvent(prev));
      playSfx('alert');
      pushToast(
        'Event ausgelöst: Jahrhundert-Superzelle',
        'Schwere Sturmfront erreicht deinen Hof in 18 Sekunden!',
        'warning'
      );
    },
  },
];
