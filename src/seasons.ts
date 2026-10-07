export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// Time zones south of the equator. Anything else is treated as northern hemisphere.
const SOUTHERN_ZONES = [
  /^Australia\//,
  /^Antarctica\//,
  /^Pacific\/(Auckland|Chatham|Fiji|Noumea|Tongatapu|Apia|Efate|Port_Moresby|Rarotonga|Tahiti)$/,
  /^America\/(Argentina\/.*|Buenos_Aires|Sao_Paulo|Santiago|Montevideo|Asuncion|La_Paz|Lima|Punta_Arenas|Campo_Grande|Cuiaba|Porto_Velho|Recife|Bahia|Maceio|Fortaleza|Belem)$/,
  /^Africa\/(Johannesburg|Maseru|Mbabane|Windhoek|Gaborone|Harare|Maputo|Lusaka|Blantyre|Lubumbashi|Luanda|Dar_es_Salaam|Kigali|Bujumbura)$/,
  /^Indian\/(Antananarivo|Mauritius|Reunion|Mayotte|Comoro)$/,
  /^Atlantic\/(St_Helena|Stanley)$/,
];

export function isSouthernHemisphere(): boolean {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    return SOUTHERN_ZONES.some((re) => re.test(zone));
  } catch {
    return false;
  }
}

// prettier-ignore
const NORTHERN_BY_MONTH: Season[] = [
  'winter', 'winter', 'spring', 'spring', 'spring', 'summer',
  'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter',
];
const OPPOSITE: Record<Season, Season> = { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' };

export function currentSeason(now: Date = new Date(), southern: boolean = isSouthernHemisphere()): Season {
  const northern = NORTHERN_BY_MONTH[now.getMonth()];
  return southern ? OPPOSITE[northern] : northern;
}

const ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** "Spring / Summer" */
export function formatSeasons(seasons: Season[]): string {
  return [...seasons]
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(' / ');
}

export interface SowingAdvice {
  inSeason: boolean;
  message: string;
}

export function sowingAdvice(seasons: Season[], now: Date = new Date()): SowingAdvice {
  const season = currentSeason(now);
  return seasons.includes(season)
    ? { inSeason: true, message: `Good time to sow – it's ${season} now.` }
    : { inSeason: false, message: `Best sown in ${formatSeasons(seasons).toLowerCase()} – it's ${season} now.` };
}
