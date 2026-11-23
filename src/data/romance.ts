import { INITIAL_NEIGHBORS } from './catalog';
import { AvatarConfig, RomanceDateId } from '../types/game';

export const ROMANCE_UNLOCK_LEVEL = 80;

export interface RomanceMorningGiftSpec {
  kind: 'item' | 'fertilizer' | 'elixir';
  itemId?: string;
  qty: number;
  label: string;
}

export interface RomanceCandidateSpec {
  id: string;
  name: string;
  role: string;
  originLabel: string;
  avatar: AvatarConfig;
  bio: string;
  eventQuotes: string[];
  favoriteGiftIds: string[];
  partnerPerkTitle: string;
  partnerPerkDesc: string;
  shopTipBonusPct: number;
  sellPriceBonusPct: number;
  xpBonusPct: number;
  morningGiftPool: RomanceMorningGiftSpec[];
}

export interface RomanceDateSpec {
  id: RomanceDateId;
  title: string;
  description: string;
  costCoins: number;
  affectionGain: number;
  xpReward: number;
  requiresThemePark?: boolean;
}

const NEIGHBOR_BY_ID = new Map(INITIAL_NEIGHBORS.map((n) => [n.id, n]));

function neighborAvatarOrFallback(id: string, fallback: AvatarConfig): AvatarConfig {
  return NEIGHBOR_BY_ID.get(id)?.avatar ? { ...NEIGHBOR_BY_ID.get(id)!.avatar } : fallback;
}

export const ROMANCE_CANDIDATES: RomanceCandidateSpec[] = [
  {
    id: 'greta',
    name: 'Bäuerin Greta',
    role: 'Obst- & Gemüsehof',
    originLabel: 'Hof Apfelwiese',
    avatar: neighborAvatarOrFallback('greta', {
      farmerName: 'Greta',
      farmName: 'Apfelwiese',
      skinTone: '#f5d0b5',
      hairStyle: 'braids',
      hairColor: '#92400e',
      eyeColor: '#1e3a8a',
      outfitColor: '#15803d',
      overallsColor: '#78350f',
      hat: 'straw',
      beard: false,
      glasses: false,
    }),
    bio: 'Greta liebt sonnige Obstgärten, frischen Apfelkuchen und ruhige Abende auf der Veranda.',
    eventQuotes: [
      '„Zwischen all den Preis-Äpfeln habe ich heute eigentlich nur dich gesucht … Wollen wir bald zusammen über deine Wiesen schlendern?“',
      '„Dein Hof strahlt heute genauso herzlich wie dein Lächeln. Hättest du Lust auf eine gemeinsame Tasse Apfelpunsch?“',
    ],
    favoriteGiftIds: ['apple_pie', 'strawberry_jam', 'carrot'],
    partnerPerkTitle: 'Obstgarten-Segen',
    partnerPerkDesc: 'Gießt täglich bis zu 8 Felder, bringt Obst & Dünger mit und steigert Hofladen-Trinkgelder um +6 %.',
    shopTipBonusPct: 6,
    sellPriceBonusPct: 2,
    xpBonusPct: 4,
    morningGiftPool: [
      { kind: 'fertilizer', qty: 3, label: '3× Hof-Dünger' },
      { kind: 'item', itemId: 'apple_pie', qty: 1, label: '1× Apfelkuchen' },
      { kind: 'item', itemId: 'strawberry_jam', qty: 1, label: '1× Erdbeer-Konfitüre' },
    ],
  },
  {
    id: 'leni',
    name: 'Pilzsammlerin Leni',
    role: 'Mooswald-Gärtnerei',
    originLabel: 'Moosgrund',
    avatar: neighborAvatarOrFallback('leni', {
      farmerName: 'Leni',
      farmName: 'Moosgrund',
      skinTone: '#fde2c8',
      hairStyle: 'bob',
      hairColor: '#b91c1c',
      eyeColor: '#14532d',
      outfitColor: '#0f766e',
      overallsColor: '#334155',
      hat: 'beret',
      beard: false,
      glasses: true,
    }),
    bio: 'Leni kennt jeden geheimen Waldpfad im Nebelmorgen und mischt aus Kräutern wunderbare Elixiere.',
    eventQuotes: [
      '„Dieser Glückspilz am Feststand verblasst völlig neben deinem Lächeln. Darf ich dich demnächst auf einen Waldspaziergang einladen?“',
      '„Ich glaube, zwischen uns wächst etwas ganz Besonderes – schneller als jeder Pfifferling nach dem Regen!“',
    ],
    favoriteGiftIds: ['mushroom_ragout', 'truffle_butter', 'champignon'],
    partnerPerkTitle: 'Mooswald-Magie',
    partnerPerkDesc: 'Gießt täglich Felder, legt Elixiere oder Waldpilze bereit und gibt +8 % Extra-XP.',
    shopTipBonusPct: 3,
    sellPriceBonusPct: 2,
    xpBonusPct: 8,
    morningGiftPool: [
      { kind: 'elixir', qty: 1, label: '1× Wachstums-Elixier' },
      { kind: 'item', itemId: 'mushroom_ragout', qty: 1, label: '1× Waldpilz-Ragout' },
      { kind: 'item', itemId: 'truffle', qty: 1, label: '1× Edeltrüffel' },
    ],
  },
  {
    id: 'hannes',
    name: 'Imker Hannes',
    role: 'Blütenweide & Bienenhaus',
    originLabel: 'Summtal',
    avatar: neighborAvatarOrFallback('hannes', {
      farmerName: 'Hannes',
      farmName: 'Summtal',
      skinTone: '#e6b89c',
      hairStyle: 'curly',
      hairColor: '#451a03',
      eyeColor: '#3f6212',
      outfitColor: '#d97706',
      overallsColor: '#1e3a8a',
      hat: 'cap',
      beard: true,
      glasses: false,
    }),
    bio: 'Hannes summt den ganzen Tag fröhliche Melodien und weiß, wie man mit Geduld das süßeste Glück erntet.',
    eventQuotes: [
      '„Selbst meine Bienen summen heute aufgeregter, sobald du in der Nähe bist! Gehen wir nach dem Fest zusammen an den Fluss?“',
      '„Mit dir an meiner Seite schmeckt sogar der Herbst-Honig doppelt so süß.“',
    ],
    favoriteGiftIds: ['honey_cake', 'sunflower', 'apple_cider'],
    partnerPerkTitle: 'Goldene Blütenweide',
    partnerPerkDesc: 'Gießt täglich Felder, schenkt Honigkuchen oder Dünger und erhöht alle Verkaufserlöse um +5 %.',
    shopTipBonusPct: 4,
    sellPriceBonusPct: 5,
    xpBonusPct: 3,
    morningGiftPool: [
      { kind: 'item', itemId: 'honey_cake', qty: 1, label: '1× Honigkuchen' },
      { kind: 'fertilizer', qty: 3, label: '3× Hof-Dünger' },
      { kind: 'item', itemId: 'apple_cider', qty: 1, label: '1× Land-Cidre' },
    ],
  },
  {
    id: 'jakob',
    name: 'Müller Jakob',
    role: 'Alte Talmühle',
    originLabel: 'Talmühle',
    avatar: neighborAvatarOrFallback('jakob', {
      farmerName: 'Jakob',
      farmName: 'Talmühle',
      skinTone: '#d4a373',
      hairStyle: 'short',
      hairColor: '#cbd5e1',
      eyeColor: '#1e293b',
      outfitColor: '#b45309',
      overallsColor: '#475569',
      hat: 'none',
      beard: true,
      glasses: true,
    }),
    bio: 'Jakob packt zuverlässig mit an, backt herzhaftes Bauernbrot und kennt jede Geschichte des Tals.',
    eventQuotes: [
      '„In all den Jahren an der Mühle habe ich selten jemanden getroffen, der so viel Wärme ins Tal bringt wie du.“',
      '„Was meinst du – teilen wir bald nicht nur Mehl und Brot, sondern auch unseren Alltag auf deinem Hof?“',
    ],
    favoriteGiftIds: ['farmhouse_bread', 'potato_bread', 'cream_cheese'],
    partnerPerkTitle: 'Talmühlen-Fleiß',
    partnerPerkDesc: 'Gießt täglich Felder, bringt frisches Brot und steigert Verkaufspreise (+4 %) sowie XP (+5 %).',
    shopTipBonusPct: 3,
    sellPriceBonusPct: 4,
    xpBonusPct: 5,
    morningGiftPool: [
      { kind: 'item', itemId: 'farmhouse_bread', qty: 1, label: '1× Bauernbrot' },
      { kind: 'item', itemId: 'potato_bread', qty: 1, label: '1× Kartoffelbrot' },
      { kind: 'fertilizer', qty: 3, label: '3× Hof-Dünger' },
    ],
  },
  {
    id: 'clara',
    name: 'Meisterbäckerin Clara',
    role: 'Meisterbäckerei im Westviertel',
    originLabel: 'Westviertel-Bäckerei',
    avatar: {
      farmerName: 'Clara',
      farmName: 'Backstube Sonnental',
      skinTone: '#fde2c8',
      hairStyle: 'long',
      hairColor: '#7c2d12',
      eyeColor: '#1e3a8a',
      outfitColor: '#be185d',
      overallsColor: '#f8fafc',
      hat: 'beret',
      beard: false,
      glasses: false,
    },
    bio: 'Clara leitet die duftende Backstube im Westviertel und träumt von einem gemeinsamen Sonntagskaffee auf einem echten Hof.',
    eventQuotes: [
      '„Alle reden nur über meine Torten – aber eigentlich bin ich heute nur hierher gekommen, um dich wiederzusehen!“',
      '„Dein Hofduft und frisches Gebäck gehören einfach zusammen. Wollen wir uns besser kennenlernen?“',
    ],
    favoriteGiftIds: ['royal_feast_cake', 'pumpkin_pie', 'cherry_jam'],
    partnerPerkTitle: 'Backstuben-Zauber',
    partnerPerkDesc: 'Gießt täglich Felder, legt feines Gebäck bereit und erhöht Hofladen-Trinkgelder um +8 %.',
    shopTipBonusPct: 8,
    sellPriceBonusPct: 3,
    xpBonusPct: 3,
    morningGiftPool: [
      { kind: 'item', itemId: 'pumpkin_pie', qty: 1, label: '1× Kürbiskuchen' },
      { kind: 'item', itemId: 'cherry_jam', qty: 1, label: '1× Kirsch-Konfitüre' },
      { kind: 'item', itemId: 'honey_cake', qty: 1, label: '1× Honigkuchen' },
    ],
  },
  {
    id: 'lukas',
    name: 'Feinschmecker Lukas',
    role: 'Dorf-Genießer & Käsekenner',
    originLabel: 'Dorfplatz-Herrenhaus',
    avatar: {
      farmerName: 'Lukas',
      farmName: 'Sonneneck',
      skinTone: '#e6b89c',
      hairStyle: 'short',
      hairColor: '#1e293b',
      eyeColor: '#4c1d95',
      outfitColor: '#4c1d95',
      overallsColor: '#334155',
      hat: 'none',
      beard: false,
      glasses: true,
    },
    bio: 'Lukas liebt erlesene Hofladen-Köstlichkeiten, schätzt ehrliche Handarbeit und schreibt heimlich Gedichte über das Tal.',
    eventQuotes: [
      '„Ich habe im ganzen Land gekostet – aber nichts ist so verzaubernd wie ein Abendspaziergang mit dir durch Sonnental.“',
      '„Darf ich dich auf einen gemeinsamen Kaffee einladen, wenn der Trubel auf dem Platz etwas nachlässt?“',
    ],
    favoriteGiftIds: ['saffron_cheese', 'herb_goat_cheese', 'smoked_deluxe'],
    partnerPerkTitle: 'Feinschmecker-Empfehlung',
    partnerPerkDesc: 'Gießt täglich Felder, bringt edlen Käse mit und sorgt für +7 % Hofladen-Trinkgeld & +4 % Erlös.',
    shopTipBonusPct: 7,
    sellPriceBonusPct: 4,
    xpBonusPct: 3,
    morningGiftPool: [
      { kind: 'item', itemId: 'herb_goat_cheese', qty: 1, label: '1× Kräuter-Ziegenkäse' },
      { kind: 'item', itemId: 'cream_cheese', qty: 1, label: '1× Frischkäse' },
      { kind: 'elixir', qty: 1, label: '1× Wachstums-Elixier' },
    ],
  },
  {
    id: 'marie',
    name: 'Blumenbinderin Marie',
    role: 'Dorfplatz-Atelier',
    originLabel: 'Blumen-Atelier',
    avatar: {
      farmerName: 'Marie',
      farmName: 'Blüteneck',
      skinTone: '#f5d0b5',
      hairStyle: 'curly',
      hairColor: '#ca8a04',
      eyeColor: '#047857',
      outfitColor: '#0d9488',
      overallsColor: '#4d7c0f',
      hat: 'flower',
      beard: false,
      glasses: false,
    },
    bio: 'Marie schmückt den ganzen Dorfplatz zu jedem Fest und bringt überall frische Farben und Lebensfreude hin.',
    eventQuotes: [
      '„Diese Fest-Blumen habe ich eigentlich für den Stand gebunden – aber sie passen viel besser zu dir!“',
      '„Mit dir blüht ganz Sonnental noch ein bisschen bunter. Hättest du Lust auf ein Picknick am Talbach?“',
    ],
    favoriteGiftIds: ['sunflower', 'strawberry', 'strawberry_jam'],
    partnerPerkTitle: 'Blüten-Harmonie',
    partnerPerkDesc: 'Gießt täglich Felder, schenkt Dünger oder Elixier und schenkt dir +7 % Hof-XP.',
    shopTipBonusPct: 4,
    sellPriceBonusPct: 3,
    xpBonusPct: 7,
    morningGiftPool: [
      { kind: 'fertilizer', qty: 4, label: '4× Hof-Dünger' },
      { kind: 'elixir', qty: 1, label: '1× Wachstums-Elixier' },
      { kind: 'item', itemId: 'strawberry_jam', qty: 1, label: '1× Erdbeer-Konfitüre' },
    ],
  },
  {
    id: 'felix',
    name: 'Zimmermann Felix',
    role: 'Dorfhandwerk & Holzbau',
    originLabel: 'Sägemühle Sonnental',
    avatar: {
      farmerName: 'Felix',
      farmName: 'Holzwerk',
      skinTone: '#d4a373',
      hairStyle: 'short',
      hairColor: '#78350f',
      eyeColor: '#1e293b',
      outfitColor: '#2563eb',
      overallsColor: '#78350f',
      hat: 'cap',
      beard: true,
      glasses: false,
    },
    bio: 'Felix zimmert Bänke, Ställe und Zäune im ganzen Tal und hilft immer sofort, wenn irgendwo eine Hand gebraucht wird.',
    eventQuotes: [
      '„Einen stabilen Hof aufzubauen ist das eine – aber gemeinsam darauf zu wohnen wäre noch viel schöner!“',
      '„Ich bin sonst besser mit Hammer als mit großen Worten … wollen wir demnächst mal zusammen spazieren gehen?“',
    ],
    favoriteGiftIds: ['asparagus_quiche', 'chili_stout', 'pumpkin_pie'],
    partnerPerkTitle: 'Handwerker-Tatkräftigkeit',
    partnerPerkDesc: 'Gießt täglich Felder, schenkt Dünger/Herzhaftes und steigert alle Verkaufspreise um +5 %.',
    shopTipBonusPct: 4,
    sellPriceBonusPct: 5,
    xpBonusPct: 4,
    morningGiftPool: [
      { kind: 'fertilizer', qty: 3, label: '3× Hof-Dünger' },
      { kind: 'item', itemId: 'asparagus_quiche', qty: 1, label: '1× Spargel-Quiche' },
      { kind: 'item', itemId: 'farmhouse_bread', qty: 1, label: '1× Bauernbrot' },
    ],
  },
];

export const ROMANCE_CANDIDATE_BY_ID: Record<string, RomanceCandidateSpec> = Object.fromEntries(
  ROMANCE_CANDIDATES.map((c) => [c.id, c])
);

export const ROMANCE_DATES: RomanceDateSpec[] = [
  {
    id: 'village_stroll',
    title: 'Spaziergang durchs Dorf',
    description: 'Schlendert gemütlich vorbei am Dorfplatz, den Fachwerkhäusern und der Talbrücke.',
    costCoins: 0,
    affectionGain: 14,
    xpReward: 160,
  },
  {
    id: 'river_picnic',
    title: 'Picknick am Talbach',
    description: 'Mit frischem Gebäck und Decke direkt am rauschenden Fluss – perfekt für tiefe Gespräche.',
    costCoins: 240,
    affectionGain: 22,
    xpReward: 280,
  },
  {
    id: 'park_ferris',
    title: 'Riesenrad im Abenteuerpark',
    description: 'Genießt den Sonnenuntergang hoch über ganz Sonnental in der Panorama-Gondel!',
    costCoins: 650,
    affectionGain: 32,
    xpReward: 480,
    requiresThemePark: true,
  },
];
