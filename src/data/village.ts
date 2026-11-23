import { ShopVisitorArchetype, VillageBusinessId, VillageFireState, WeatherType } from '../types/game';

export type VillageHouseStyle =
  | 'cottage_red'
  | 'half_timber'
  | 'thatched'
  | 'stone_manor'
  | 'wood_cabin'
  | 'bakery_shop'
  | 'blue_gable'
  | 'garden_villa'
  | 'twin_roof'
  | 'atelier';

export interface VillageHouse {
  id: string;
  name: string;
  style: VillageHouseStyle;
  x: number;
  y: number;
  width: number;
  height: number;
  doorX: number;
  doorY: number;
  streetY: number;
  residentCount: 2 | 3;
}

export type VillageWorkplaceId = VillageBusinessId | 'village_craft';

export interface VillageBusinessSpec {
  id: VillageBusinessId;
  name: string;
  shortLabel: string;
  categoryLabel: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  doorX: number;
  doorY: number;
  streetY: number;
  minLevel: number;
  purchaseCost: number;
  repairCost: number;
  hourlyProfitBase: number;
  dailyProfitRangeLabel: string;
  workforceShareLabel: string;
}

export const VILLAGE_BUSINESS_UNLOCK_LEVEL = 150;

export const VILLAGE_BUSINESSES: VillageBusinessSpec[] = [
  {
    id: 'west_bakery',
    name: 'Meisterbäckerei Sonnental',
    shortLabel: 'Bäckerei',
    categoryLabel: 'Handwerk & Backstube',
    description:
      'Traditionsreiche Großbäckerei im Westviertel mit duftenden Steinöfen, Brötchen-Auslage und täglicher Dorf-Belieferung.',
    x: -10.8,
    y: -15.2,
    width: 2.6,
    height: 2.2,
    doorX: -9.5,
    doorY: -13.0,
    streetY: -12.0,
    minLevel: VILLAGE_BUSINESS_UNLOCK_LEVEL,
    purchaseCost: 750_000,
    repairCost: 9_500,
    hourlyProfitBase: 1_450,
    dailyProfitRangeLabel: 'ca. 32.000 – 38.000 M / Tag',
    workforceShareLabel: 'ca. 10 % der Dorfbewohner',
  },
  {
    id: 'west_supermarket',
    name: 'Sonnental-Supermarkt',
    shortLabel: 'Supermarkt',
    categoryLabel: 'Einzelhandel & Nahversorgung',
    description:
      'Moderner Vollversorger an der mittleren Werkstraße mit Obstständen, Frischetheke und Einkaufswagen-Box für das gesamte Dorf.',
    x: -18.6,
    y: -10.4,
    width: 4.3,
    height: 2.4,
    doorX: -16.45,
    doorY: -8.0,
    streetY: -7.0,
    minLevel: VILLAGE_BUSINESS_UNLOCK_LEVEL,
    purchaseCost: 1_600_000,
    repairCost: 22_000,
    hourlyProfitBase: 3_250,
    dailyProfitRangeLabel: 'ca. 70.000 – 85.000 M / Tag',
    workforceShareLabel: 'ca. 10 % der Dorfbewohner',
  },
  {
    id: 'auto_supplier',
    name: 'Sonnental Antriebstechnik GmbH',
    shortLabel: 'Automobilzulieferer',
    categoryLabel: 'Großindustrie & Werk',
    description:
      'Der größte Arbeitgeber der Region: Zwei große Produktionshallen, Werkshof, Laderampe und Mitarbeiterparkplatz bieten rund 65 % des Dorfes sichere Schichtarbeit.',
    x: -18.8,
    y: -15.6,
    width: 7.4,
    height: 3.2,
    doorX: -15.0,
    doorY: -12.4,
    streetY: -12.0,
    minLevel: VILLAGE_BUSINESS_UNLOCK_LEVEL,
    purchaseCost: 4_500_000,
    repairCost: 58_000,
    hourlyProfitBase: 9_600,
    dailyProfitRangeLabel: 'ca. 210.000 – 250.000 M / Tag',
    workforceShareLabel: 'ca. 65 % der Dorfbewohner',
  },
  {
    id: 'dairy_plant',
    name: 'Sonnental Edel-Molkerei',
    shortLabel: 'Edel-Molkerei',
    categoryLabel: 'Groß-Agrarindustrie (Lvl 205)',
    description:
      'Hochmoderne Käserei- und Molkereianlage im neuen West-Industriepark mit glänzenden Milchtanks, Kühltürmen und eigenem Kühl-LKW.',
    x: -26.4,
    y: -15.4,
    width: 6.4,
    height: 3.0,
    doorX: -23.2,
    doorY: -12.4,
    streetY: -12.0,
    minLevel: 205,
    purchaseCost: 9_500_000,
    repairCost: 120_000,
    hourlyProfitBase: 21_000,
    dailyProfitRangeLabel: 'ca. 465.000 – 545.000 M / Tag',
    workforceShareLabel: 'Milchverarbeitung & Kühlkette',
  },
  {
    id: 'trade_office',
    name: 'Tal-Handelskontor GmbH',
    shortLabel: 'Handelskontor',
    categoryLabel: 'Export & Logistik-Zentrale (Lvl 220)',
    description:
      'Das gläserne Groß-Kontor für überregionalen Agrar-Export, Börsenlogistik und Verladeterminal im äußersten Westviertel.',
    x: -26.4,
    y: -11.0,
    width: 6.6,
    height: 3.0,
    doorX: -23.1,
    doorY: -8.0,
    streetY: -7.0,
    minLevel: 220,
    purchaseCost: 16_500_000,
    repairCost: 215_000,
    hourlyProfitBase: 38_000,
    dailyProfitRangeLabel: 'ca. 840.000 – 985.000 M / Tag',
    workforceShareLabel: 'Überregionaler Tal-Export',
  },
];

export const VILLAGE_BUSINESS_BY_ID: Record<VillageBusinessId, VillageBusinessSpec> = {
  west_bakery: VILLAGE_BUSINESSES[0],
  west_supermarket: VILLAGE_BUSINESSES[1],
  auto_supplier: VILLAGE_BUSINESSES[2],
  dairy_plant: VILLAGE_BUSINESSES[3],
  trade_office: VILLAGE_BUSINESSES[4],
};

export interface VillageResident {
  id: string;
  houseId: string;
  name: string;
  archetype: ShopVisitorArchetype;
  shirtColor: string;
  hairColor: string;
  skinTone: string;
  hatColor?: string;
  neighborId?: string;
  workplace: VillageWorkplaceId;
  workplaceLabel: string;
}

export interface Waypoint {
  x: number;
  y: number;
}

const HOUSE_SPECS: Array<{
  name: string;
  style: VillageHouseStyle;
  residentCount: 2 | 3;
}> = [
  // Row 1 (Obere Dorfstraße, y = -15, streetY = -12)
  { name: 'Waldrandkate', style: 'wood_cabin', residentCount: 2 },
  { name: 'Haus Apfelblüte', style: 'cottage_red', residentCount: 3 },
  { name: 'Fachwerkhof West', style: 'half_timber', residentCount: 2 },
  { name: 'Reetdachhaus', style: 'thatched', residentCount: 3 },
  { name: 'Dorfbäckerei', style: 'bakery_shop', residentCount: 3 },
  { name: 'Blaue Giebelstube', style: 'blue_gable', residentCount: 2 },
  { name: 'Alte Steinvilla', style: 'stone_manor', residentCount: 3 },
  { name: 'Kräutergarten-Haus', style: 'garden_villa', residentCount: 2 },
  { name: 'Maler-Atelier', style: 'atelier', residentCount: 2 },
  { name: 'Osthang-Kate', style: 'twin_roof', residentCount: 3 },

  // Row 2 (Mittlere Dorfstraße / Dorfplatz, y = -10, streetY = -7)
  { name: 'Schreiner-Werkstatt', style: 'half_timber', residentCount: 3 },
  { name: 'Sonnenkate', style: 'atelier', residentCount: 2 },
  { name: 'Töpferei am Platz', style: 'twin_roof', residentCount: 3 },
  { name: 'Rathaus-Nebenhaus', style: 'stone_manor', residentCount: 3 },
  { name: 'Gasthof Zum Tal', style: 'bakery_shop', residentCount: 3 },
  { name: 'Blumenhäuschen', style: 'garden_villa', residentCount: 2 },
  { name: 'Schmiedehaus', style: 'cottage_red', residentCount: 3 },
  { name: 'Seehaus Nord', style: 'blue_gable', residentCount: 2 },
  { name: 'Imker-Hütte', style: 'thatched', residentCount: 3 },
  { name: 'Jäger-Blockhaus', style: 'wood_cabin', residentCount: 2 },

  // Row 3 (Untere Dorfstraße, y = -5, streetY = -2)
  { name: 'Eichenhaus', style: 'wood_cabin', residentCount: 2 },
  { name: 'Mühlenblick', style: 'thatched', residentCount: 3 },
  { name: 'Kornkammer-Haus', style: 'half_timber', residentCount: 3 },
  { name: 'Torwärterhaus', style: 'cottage_red', residentCount: 2 },
  { name: 'Kräuter-Apotheke', style: 'garden_villa', residentCount: 3 },
  { name: 'Weber-Haus', style: 'blue_gable', residentCount: 2 },
  { name: 'Winzerhaus', style: 'twin_roof', residentCount: 3 },
  { name: 'Schieferhof', style: 'stone_manor', residentCount: 2 },
  { name: 'Honigstube', style: 'atelier', residentCount: 2 },
  { name: 'Flussuferkate', style: 'bakery_shop', residentCount: 3 },
];

const HOUSE_X_SLOTS = [-0.4, 3.1, 5.1, 9.1, 11.1, 15.2, 17.6, 21.1, 23.1, 26.2];
const ROW_SPECS = [
  { y: -15.0, streetY: -12.0 },
  { y: -10.0, streetY: -7.0 },
  { y: -5.0, streetY: -2.0 },
];

const WEST_DISTRICT_HOUSE_SPECS: Array<{
  name: string;
  style: VillageHouseStyle;
  x: number;
  y: number;
  streetY: number;
  residentCount: 2 | 3;
}> = [
  // Westviertel Row 1 (east of Bäckerei & Industriegebiet)
  { name: 'Werkssiedlung Nord', style: 'half_timber', x: -6.9, y: -15.0, streetY: -12.0, residentCount: 3 },
  { name: 'Bäckerstieg-Haus', style: 'cottage_red', x: -4.9, y: -15.0, streetY: -12.0, residentCount: 2 },
  { name: 'Westtor-Kate', style: 'blue_gable', x: -2.9, y: -15.0, streetY: -12.0, residentCount: 3 },

  // Westviertel Row 2 (east of Supermarkt)
  { name: 'Schichtarbeiter-Haus', style: 'wood_cabin', x: -12.8, y: -10.0, streetY: -7.0, residentCount: 3 },
  { name: 'Ulmenweg-Haus', style: 'garden_villa', x: -10.4, y: -10.0, streetY: -7.0, residentCount: 2 },
  { name: 'Maschinenbau-Hof', style: 'stone_manor', x: -6.9, y: -10.0, streetY: -7.0, residentCount: 3 },
  { name: 'Gewerbeplatz-Haus', style: 'twin_roof', x: -4.9, y: -10.0, streetY: -7.0, residentCount: 2 },
  { name: 'Lindenallee West', style: 'atelier', x: -2.9, y: -10.0, streetY: -7.0, residentCount: 3 },

  // Westviertel Row 3 (südliche Wohnzeile West)
  { name: 'Industrieweg-Kate', style: 'wood_cabin', x: -18.5, y: -5.0, streetY: -2.0, residentCount: 3 },
  { name: 'Werksblick-Haus', style: 'cottage_red', x: -16.3, y: -5.0, streetY: -2.0, residentCount: 2 },
  { name: 'Südwest-Villa', style: 'stone_manor', x: -12.8, y: -5.0, streetY: -2.0, residentCount: 3 },
  { name: 'Kornblumenhaus', style: 'blue_gable', x: -10.4, y: -5.0, streetY: -2.0, residentCount: 2 },
  { name: 'Feierabend-Kate', style: 'thatched', x: -6.9, y: -5.0, streetY: -2.0, residentCount: 3 },
  { name: 'Westwinkel', style: 'garden_villa', x: -4.9, y: -5.0, streetY: -2.0, residentCount: 2 },
  { name: 'Eckhaus am Tor', style: 'half_timber', x: -2.9, y: -5.0, streetY: -2.0, residentCount: 3 },
];

const CORE_VILLAGE_HOUSES: VillageHouse[] = HOUSE_SPECS.map((spec, idx) => {
  const rowIdx = Math.floor(idx / 10);
  const colIdx = idx % 10;
  const x = HOUSE_X_SLOTS[colIdx];
  const row = ROW_SPECS[rowIdx];
  const width = 1.8;
  const height = 1.9;
  return {
    id: `vh_${String(idx + 1).padStart(2, '0')}`,
    name: spec.name,
    style: spec.style,
    x,
    y: row.y,
    width,
    height,
    doorX: Number((x + width * 0.5 - 0.1).toFixed(2)),
    doorY: Number((row.y + height - 0.15).toFixed(2)),
    streetY: row.streetY,
    residentCount: spec.residentCount,
  };
});

const WEST_DISTRICT_HOUSES: VillageHouse[] = WEST_DISTRICT_HOUSE_SPECS.map((spec, idx) => {
  const width = 1.8;
  const height = 1.9;
  return {
    id: `vh_${String(31 + idx).padStart(2, '0')}`,
    name: spec.name,
    style: spec.style,
    x: spec.x,
    y: spec.y,
    width,
    height,
    doorX: Number((spec.x + width * 0.5 - 0.1).toFixed(2)),
    doorY: Number((spec.y + height - 0.15).toFixed(2)),
    streetY: spec.streetY,
    residentCount: spec.residentCount,
  };
});

export const VILLAGE_HOUSES: VillageHouse[] = [...CORE_VILLAGE_HOUSES, ...WEST_DISTRICT_HOUSES];

export const VILLAGE_HOUSE_BY_ID: Record<string, VillageHouse> = Object.fromEntries(
  VILLAGE_HOUSES.map((h) => [h.id, h])
);

const FIRST_NAMES = [
  'Anna', 'Lukas', 'Mia', 'Jonas', 'Klara', 'Tim', 'Hannah', 'Paul', 'Lina', 'Ben',
  'Sophie', 'Felix', 'Nora', 'Jan', 'Laura', 'Moritz', 'Elena', 'Emil', 'Greta', 'Leon',
  'Frida', 'Oskar', 'Lotte', 'Jakob', 'Marie', 'Anton', 'Ella', 'Theo', 'Maja', 'Henry',
  'Johanna', 'Matteo', 'Ida', 'Mats', 'Amelie', 'Noah', 'Paula', 'Carl', 'Martha', 'Hugo',
  'Helene', 'Franz', 'Rosa', 'Ludwig', 'Emma', 'Konrad', 'Theresa', 'Stefan', 'Bettina', 'Georg',
  'Silke', 'Martin', 'Heike', 'Peter', 'Sabine', 'Thomas', 'Katrin', 'Frank', 'Birgit', 'Dieter',
  'Gisela', 'Uwe', 'Ines', 'Bernd', 'Anja', 'Ralf', 'Petra', 'Jürgen',
];

const SHIRT_COLORS = [
  '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0d9488', '#be185d', '#4f46e5', '#b45309', '#15803d',
];
const HAIR_COLORS = ['#3f2e21', '#78350f', '#facc15', '#1e293b', '#b45309', '#94a3b8', '#7c2d12'];
const SKIN_TONES = ['#fde2c8', '#f5d0b5', '#e2b18d', '#b87d52'];

// Map the real neighbors from INITIAL_NEIGHBORS into fitting village houses
const FEATURED_NEIGHBORS: Array<{
  houseIdx: number;
  neighborId: string;
  name: string;
  shirtColor: string;
  hairColor: string;
  skinTone: string;
  hatColor?: string;
}> = [
  { houseIdx: 1, neighborId: 'greta', name: 'Bäuerin Greta', shirtColor: '#15803d', hairColor: '#92400e', skinTone: '#f5d0b5', hatColor: '#fde68a' },
  { houseIdx: 7, neighborId: 'leni', name: 'Pilzsammlerin Leni', shirtColor: '#0f766e', hairColor: '#b91c1c', skinTone: '#fde2c8', hatColor: '#fde68a' },
  { houseIdx: 18, neighborId: 'hannes', name: 'Imker Hannes', shirtColor: '#d97706', hairColor: '#451a03', skinTone: '#e6b89c', hatColor: '#fde68a' },
  { houseIdx: 21, neighborId: 'jakob', name: 'Müller Jakob', shirtColor: '#b45309', hairColor: '#cbd5e1', skinTone: '#d4a373' },
];

function assignResidentWorkplace(residentIndex: number, isFeaturedNeighbor: boolean): {
  workplace: VillageWorkplaceId;
  workplaceLabel: string;
} {
  if (isFeaturedNeighbor) {
    return { workplace: 'village_craft', workplaceLabel: 'Hof & Dorfhandwerk' };
  }
  const slot = residentIndex % 20;
  // 13 out of 20 residents (~65%) work at the big automotive supplier!
  if (slot < 13) {
    return { workplace: 'auto_supplier', workplaceLabel: 'Automobilzulieferer' };
  }
  if (slot < 15) {
    return { workplace: 'west_bakery', workplaceLabel: 'Meisterbäckerei' };
  }
  if (slot < 17) {
    return { workplace: 'west_supermarket', workplaceLabel: 'Supermarkt' };
  }
  return { workplace: 'village_craft', workplaceLabel: 'Dorfhandwerk' };
}

export const VILLAGE_RESIDENTS: VillageResident[] = (() => {
  const list: VillageResident[] = [];
  let nameCursor = 0;

  VILLAGE_HOUSES.forEach((house, hIdx) => {
    const featured = FEATURED_NEIGHBORS.find((n) => n.houseIdx === hIdx);

    for (let slot = 0; slot < house.residentCount; slot++) {
      if (slot === 0 && featured) {
        const wp = assignResidentWorkplace(list.length, true);
        list.push({
          id: `res_${house.id}_${slot}`,
          houseId: house.id,
          name: featured.name,
          archetype: 'neighbor',
          shirtColor: featured.shirtColor,
          hairColor: featured.hairColor,
          skinTone: featured.skinTone,
          hatColor: featured.hatColor,
          neighborId: featured.neighborId,
          workplace: wp.workplace,
          workplaceLabel: wp.workplaceLabel,
        });
        continue;
      }

      const rawName = FIRST_NAMES[nameCursor % FIRST_NAMES.length];
      nameCursor++;
      const seed = hIdx * 7 + slot * 13;

      let archetype: ShopVisitorArchetype = 'wanderer';
      let displayName = rawName;
      let hatColor: string | undefined;

      if (house.style === 'bakery_shop' && slot === 0) {
        archetype = 'bulk_buyer';
        displayName = `Dorfkoch ${rawName}`;
        hatColor = '#ffffff';
      } else if (house.style === 'stone_manor' && slot === 0) {
        archetype = 'gourmet';
        displayName = `Feinschmecker ${rawName}`;
        hatColor = '#4c1d95';
      } else if (seed % 5 === 1) {
        archetype = 'gourmet';
        displayName = `Feinschmecker ${rawName}`;
        hatColor = '#4c1d95';
      } else if (seed % 5 === 2) {
        archetype = 'bulk_buyer';
        displayName = `Dorfkoch ${rawName}`;
        hatColor = '#ffffff';
      }

      const wp = assignResidentWorkplace(list.length, false);
      list.push({
        id: `res_${house.id}_${slot}`,
        houseId: house.id,
        name: displayName,
        archetype,
        shirtColor: SHIRT_COLORS[(hIdx + slot * 3) % SHIRT_COLORS.length],
        hairColor: HAIR_COLORS[(hIdx * 2 + slot) % HAIR_COLORS.length],
        skinTone: SKIN_TONES[(hIdx + slot) % SKIN_TONES.length],
        hatColor,
        workplace: wp.workplace,
        workplaceLabel: wp.workplaceLabel,
      });
    }
  });

  return list;
})();

export function getResidentsForHouse(houseId: string): VillageResident[] {
  return VILLAGE_RESIDENTS.filter((r) => r.houseId === houseId);
}

/**
 * Generates waypoints from a village house front door along the village streets,
 * through the north farm gate (wx = 7.5), onto the farmhouse lane, and to the Hofladen door.
 */
export function buildWaypointsToShop(house: VillageHouse, laneOffset = 0): Waypoint[] {
  const streetLaneY = Number((house.streetY + laneOffset).toFixed(2));
  const gateX = Number((7.45 + laneOffset * 0.8).toFixed(2));
  return [
    { x: house.doorX, y: streetLaneY },
    { x: gateX, y: streetLaneY },
    { x: gateX, y: 3.05 },
    { x: 3.0, y: 3.05 },
    { x: 3.0, y: 6.25 },
    { x: 1.95, y: 6.25 },
  ];
}

/**
 * Generates exact return waypoints from the Hofladen back through the north gate
 * and along village streets right into the resident's own front door.
 */
export function buildWaypointsToHouse(house: VillageHouse, laneOffset = 0): Waypoint[] {
  const streetLaneY = Number((house.streetY + laneOffset).toFixed(2));
  const gateX = Number((7.55 + laneOffset * 0.8).toFixed(2));
  return [
    { x: 3.0, y: 6.25 },
    { x: 3.0, y: 3.0 },
    { x: gateX, y: 3.0 },
    { x: gateX, y: streetLaneY },
    { x: house.doorX, y: streetLaneY },
    { x: house.doorX, y: house.doorY },
  ];
}

export interface VillageFireCauseSpec {
  id: string;
  title: string;
  detail: string;
  styles?: VillageHouseStyle[];
  houseIds?: string[];
  weatherOnly?: WeatherType;
}

const FIRE_CAUSES: VillageFireCauseSpec[] = [
  {
    id: 'fat_fire',
    title: 'Entzündetes Bratfett auf dem Herd',
    detail: 'Eine unbeaufsichtigte Pfanne erhitzte sich zu stark und setzte die Dunstabzugshaube in Brand.',
    styles: ['bakery_shop', 'cottage_red', 'half_timber', 'twin_roof'],
  },
  {
    id: 'overheated_oven',
    title: 'Überhitzter Backofen',
    detail: 'Durch einen defekten Temperaturregler geriet die Holzverkleidung neben dem Ofen in Brand.',
    houseIds: ['vh_05', 'vh_15', 'vh_30', 'vh_02'],
  },
  {
    id: 'short_circuit',
    title: 'Kurzschluss an alter Steckdosenleiste',
    detail: 'Eine überlastete Mehrfachsteckdose löste einen Schwelbrand an der Wohnzimmerwand aus.',
  },
  {
    id: 'appliance_cable',
    title: 'Defektes Elektrokabel am Haushaltsgerät',
    detail: 'Ein durchgescheuertes Netzkabel entfachte Funken hinter dem Küchengerät.',
  },
  {
    id: 'battery_overheat',
    title: 'Überhitzter Werkstatt-Akku',
    detail: 'Ein defekter Lithium-Akku auf der Werkbank entzündete sich während des Ladevorgangs.',
    styles: ['half_timber', 'atelier', 'twin_roof'],
  },
  {
    id: 'unattended_candle',
    title: 'Unbeaufsichtigte Kerze auf dem Holztisch',
    detail: 'Ein leichter Luftzug wehte eine Gardine direkt über die brennende Tischkerze.',
  },
  {
    id: 'chimney_sparks',
    title: 'Kaminfunkenflug durch trockenen Ruß',
    detail: 'Glühende Holzstückchen entzündeten Ablagerungen im Rauchfang und Dachgebälk.',
    styles: ['thatched', 'stone_manor', 'wood_cabin', 'blue_gable'],
  },
  {
    id: 'space_heater',
    title: 'Wärmestau am Heizlüfter',
    detail: 'Zu nah am Heizgerät abgestellte Wäsche fing Feuer und griff auf den Flur über.',
  },
  {
    id: 'forge_sparks',
    title: 'Funkenflug beim Schmieden',
    detail: 'Glühende Eisenfunken gerieten in einen Stapel trockener Sägespäne neben dem Amboss.',
    houseIds: ['vh_17', 'vh_11'],
  },
  {
    id: 'herb_dryer',
    title: 'Überhitzter Kräutertrockner',
    detail: 'Zu stark gedörrte Heilkräuter auf dem Speicher fingen im warmen Luftstrom Feuer.',
    houseIds: ['vh_08', 'vh_25', 'vh_23'],
  },
  {
    id: 'smoldering_ash',
    title: 'Glimmende Asche im Holz-Eimer',
    detail: 'Noch heiße Ofenasche entzündete am späten Nachmittag den abgestellten Holzkorb.',
    styles: ['wood_cabin', 'thatched'],
  },
  {
    id: 'lightning_strike',
    title: 'Blitzeinschlag ins Dachgebälk',
    detail: 'Während des Unwetters schlug ein Blitz in den Dachfirst ein und löste sofortigen Rauch aus.',
    weatherOnly: 'stormy',
  },
];

export function pickFireCauseForHouse(house: VillageHouse, weather: WeatherType): { title: string; detail: string } {
  const weatherSpecific = FIRE_CAUSES.filter((c) => c.weatherOnly === weather);
  if (weatherSpecific.length > 0 && Math.random() < 0.65) {
    const picked = weatherSpecific[Math.floor(Math.random() * weatherSpecific.length)];
    return { title: picked.title, detail: picked.detail };
  }

  const houseSpecific = FIRE_CAUSES.filter(
    (c) => !c.weatherOnly && ((c.houseIds && c.houseIds.includes(house.id)) || (c.styles && c.styles.includes(house.style)))
  );
  const general = FIRE_CAUSES.filter((c) => !c.weatherOnly && !c.houseIds && !c.styles);
  const pool = [...houseSpecific, ...houseSpecific, ...general];
  const chosen = pool[Math.floor(Math.random() * pool.length)] || FIRE_CAUSES[2];
  return { title: chosen.title, detail: chosen.detail };
}

export interface FireBrigadeVisualState {
  phase: 'outbreak' | 'arriving' | 'extinguishing' | 'leaving';
  fireIntensity: number; // 0..1
  steamIntensity: number; // 0..1
  truckX: number;
  truckY: number;
  truckDir: 1 | -1;
  truckMoving: boolean;
  sprayingWater: boolean;
}

export function getFireBrigadeVisualState(
  fire: VillageFireState,
  house: VillageHouse
): FireBrigadeVisualState {
  const total = Math.max(1, fire.totalMs);
  const elapsedRatio = Math.max(0, Math.min(1, 1 - fire.remainingMs / total));
  // Park slightly right/left of the house door along its streetY so the water stream reaches the roof cleanly
  const parkX = house.x > 21 ? house.x - 1.35 : house.x + house.width + 0.55;
  const entryFromRight = house.x >= 14;
  const startX = entryFromRight ? 26.8 : -19.2;
  const streetY = house.streetY - 0.15;

  if (elapsedRatio < 0.08) {
    // Initial outbreak before truck arrives
    const ramp = Math.min(1, 0.45 + (elapsedRatio / 0.08) * 0.55);
    return {
      phase: 'outbreak',
      fireIntensity: ramp,
      steamIntensity: 0,
      truckX: startX,
      truckY: streetY,
      truckDir: entryFromRight ? -1 : 1,
      truckMoving: false,
      sprayingWater: false,
    };
  }

  if (elapsedRatio < 0.18) {
    // Fire engine racing along streetY toward the burning house
    const t = (elapsedRatio - 0.08) / 0.1;
    const smooth = t * t * (3 - 2 * t);
    return {
      phase: 'arriving',
      fireIntensity: 1,
      steamIntensity: 0.1,
      truckX: startX + (parkX - startX) * smooth,
      truckY: streetY,
      truckDir: parkX < startX ? -1 : 1,
      truckMoving: true,
      sprayingWater: false,
    };
  }

  if (elapsedRatio < 0.88) {
    // Firefighters spraying animated water stream until flames subside
    const t = (elapsedRatio - 0.18) / 0.7;
    const fireIntensity = Math.max(0.08, 1 - t * 0.94);
    const steamIntensity = Math.min(1, 0.25 + t * 0.85);
    return {
      phase: 'extinguishing',
      fireIntensity,
      steamIntensity,
      truckX: parkX,
      truckY: streetY,
      truckDir: parkX > house.doorX ? -1 : 1,
      truckMoving: false,
      sprayingWater: true,
    };
  }

  // Extinguished! Steam wisps rising & fire truck driving back out
  const t = (elapsedRatio - 0.88) / 0.12;
  const exitX = entryFromRight ? 27.2 : -19.4;
  return {
    phase: 'leaving',
    fireIntensity: 0,
    steamIntensity: Math.max(0, 0.75 * (1 - t)),
    truckX: parkX + (exitX - parkX) * t,
    truckY: streetY,
    truckDir: exitX > parkX ? 1 : -1,
    truckMoving: true,
    sprayingWater: false,
  };
}
