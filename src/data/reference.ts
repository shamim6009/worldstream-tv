/** Static reference data used by the UI. These are links and labels, never streams. */

export interface SportCategory {
  id: string;
  name: string;
  nameBn?: string;
  emoji: string;
}

export const SPORT_CATEGORIES: SportCategory[] = [
  { id: 'football', name: 'Football / Soccer', nameBn: 'ফুটবল', emoji: '⚽' },
  { id: 'cricket', name: 'Cricket', nameBn: 'ক্রিকেট', emoji: '🏏' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'formula', name: 'Formula Racing', emoji: '🏎️' },
  { id: 'motorsport', name: 'Motorsport', emoji: '🏁' },
  { id: 'volleyball', name: 'Volleyball', emoji: '🏐' },
  { id: 'badminton', name: 'Badminton', emoji: '🏸' },
  { id: 'hockey', name: 'Hockey', emoji: '🏑' },
  { id: 'baseball', name: 'Baseball', emoji: '⚾' },
  { id: 'rugby', name: 'Rugby', emoji: '🏉' },
  { id: 'combat', name: 'Combat Sports', emoji: '🥊' },
  { id: 'esports', name: 'Esports', emoji: '🎮' },
  { id: 'other', name: 'Other Sports', emoji: '🏅' },
];

export function sportName(id: string): string {
  return SPORT_CATEGORIES.find((sport) => sport.id === id)?.name ?? id;
}

export interface OfficialDestination {
  name: string;
  url: string;
  description: string;
  /** 'free' streams on the provider's own site, 'subscription' needs a paid plan. */
  plan: 'free' | 'subscription';
}

/** Official free sports destinations. Opened on the provider site; never embedded or proxied. */
export const OFFICIAL_SPORTS_DESTINATIONS: OfficialDestination[] = [
  {
    name: 'FIFA+',
    url: 'https://www.plus.fifa.com/',
    description: 'FIFA’s official streaming service with free live matches from selected competitions in many regions.',
    plan: 'free',
  },
  {
    name: 'UEFA.tv',
    url: 'https://www.uefa.tv/',
    description: 'Free official UEFA streams of youth, women’s and futsal competitions plus archive matches.',
    plan: 'free',
  },
  {
    name: 'Olympics.com',
    url: 'https://www.olympics.com/en/watch',
    description: 'Official Olympic Channel live events, qualifiers and documentaries.',
    plan: 'free',
  },
  {
    name: 'Red Bull TV',
    url: 'https://www.redbull.com/int-en/discover',
    description: 'Free live action sports, motorsport and esports events published by Red Bull.',
    plan: 'free',
  },
  {
    name: 'ICC.tv',
    url: 'https://www.icc-cricket.com/',
    description: 'International Cricket Council official site; free match streams are offered in selected regions.',
    plan: 'free',
  },
];

/**
 * Sports services that require a paid subscription in at least some regions.
 * Listed for discovery only: we link to the rights holder's own page and never
 * embed, proxy or restream their feed. Several are free in their home market
 * (A Sports and Geo Super in Pakistan, Sport1 in Germany), which is noted below.
 */
export const PREMIUM_SPORTS_SERVICES: OfficialDestination[] = [
  {
    name: 'Star Sports',
    url: 'https://www.starsports.com/',
    description: 'Disney Star’s Indian sports network (cricket, football, kabaddi). Live streams need a JioHotstar subscription.',
    plan: 'subscription',
  },
  {
    name: 'Sky Sports',
    url: 'https://www.skysports.com/',
    description: 'UK rights holder for Premier League, EFL, cricket and F1. Live coverage needs a Sky or NOW subscription.',
    plan: 'subscription',
  },
  {
    name: 'TNT Sports',
    url: 'https://www.tntsports.co.uk/',
    description: 'UK coverage of Champions League, Premier League fixtures and MotoGP via discovery+ or a TV package.',
    plan: 'subscription',
  },
  {
    name: 'ESPN / ESPN+',
    url: 'https://www.espn.com/watch/',
    description: 'US sports including NBA, NFL, MLB and college sports. ESPN+ is a paid add-on; some events need a TV provider login.',
    plan: 'subscription',
  },
  {
    name: 'Willow TV',
    url: 'https://www.willow.tv/',
    description: 'Cricket specialist carrying international and franchise cricket for North America on a paid plan.',
    plan: 'subscription',
  },
  {
    name: 'DAZN',
    url: 'https://www.dazn.com/',
    description: 'Global subscription service with boxing, football and NFL in several markets.',
    plan: 'subscription',
  },
  {
    name: 'SuperSport',
    url: 'https://supersport.com/',
    description: 'Sub-Saharan African sports network (football, cricket, rugby) available on DStv or Showmax.',
    plan: 'subscription',
  },
  {
    name: 'Sony LIV (Sony Ten)',
    url: 'https://www.sonyliv.com/',
    description: 'Indian platform carrying Sony Ten’s cricket and football rights on a paid plan.',
    plan: 'subscription',
  },
  {
    name: 'beIN SPORTS',
    url: 'https://www.beinsports.com/',
    description: 'MENA and Asia-Pacific rights holder for major football leagues plus motorsport, on a paid plan.',
    plan: 'subscription',
  },
  {
    name: 'Eurosport / discovery+',
    url: 'https://www.eurosport.com/',
    description: 'European coverage of the Olympics, cycling, tennis Grand Slams and winter sport via discovery+.',
    plan: 'subscription',
  },
  {
    name: 'Kayo Sports',
    url: 'https://kayosports.com.au/',
    description: 'Australian streaming service carrying Fox Cricket, AFL, NRL and F1 on a paid plan.',
    plan: 'subscription',
  },
  {
    name: 'Optus Sport',
    url: 'https://sport.optus.com.au/',
    description: 'Australian rights holder for Premier League and Champions League on a paid plan.',
    plan: 'subscription',
  },
  {
    name: 'TSN',
    url: 'https://www.tsn.ca/',
    description: 'Canadian sports network; live streams require a cable, satellite or TSN+ subscription.',
    plan: 'subscription',
  },
  {
    name: 'Sportsnet',
    url: 'https://www.sportsnet.ca/',
    description: 'Canadian rights holder for NHL, MLB and Premier League via a TV provider or Sportsnet+ plan.',
    plan: 'subscription',
  },
  {
    name: 'Canal+ Sport',
    url: 'https://www.canalplus.com/sport/',
    description: 'French pay-TV sports coverage including Ligue 1, Champions League and Formula 1.',
    plan: 'subscription',
  },
  {
    name: 'Movistar Plus+ Deportes',
    url: 'https://www.movistarplus.es/deportes',
    description: 'Spanish pay-TV sports package with LaLiga, Champions League, basketball and motorsport.',
    plan: 'subscription',
  },
  {
    name: 'A Sports',
    url: 'https://a-sports.tv/',
    description: 'ARY’s Pakistani sports channel. Free to air in Pakistan and also in this catalog via its official YouTube live feed.',
    plan: 'subscription',
  },
  {
    name: 'Sport1',
    url: 'https://www.sport1.de/',
    description: 'German sports broadcaster; some events stream free on its own site, others need a TV package.',
    plan: 'subscription',
  },
];

export const BD_CATEGORIES: { id: string; en: string; bn: string; match: (categories: string[]) => boolean }[] = [
  { id: 'news', en: 'Bangladeshi News', bn: 'সংবাদ', match: (c) => c.includes('news') },
  {
    id: 'entertainment',
    en: 'Bangladeshi Entertainment',
    bn: 'বিনোদন',
    match: (c) => c.includes('entertainment') || c.includes('family') || c.includes('movies'),
  },
  { id: 'sports', en: 'Bangladeshi Sports', bn: 'খেলাধুলা', match: (c) => c.includes('sports') },
  { id: 'music', en: 'Bangla Music', bn: 'বাংলা গান', match: (c) => c.includes('music') },
  { id: 'religious', en: 'Religious Channels', bn: 'ধর্মীয়', match: (c) => c.includes('religious') },
  { id: 'education', en: 'Educational TV', bn: 'শিক্ষা', match: (c) => c.includes('education') },
  { id: 'kids', en: 'Kids', bn: 'শিশু', match: (c) => c.includes('kids') },
  { id: 'regional', en: 'Regional TV', bn: 'আঞ্চলিক', match: (c) => c.includes('regional') },
];

export const BD_STRINGS = {
  en: {
    eyebrow: 'Bangladesh TV',
    title: 'Bangladeshi Live TV',
    description:
      'News, entertainment, sports and music from official Bangladeshi broadcasters. Switch channels instantly from the list.',
    search: 'Search Bangladesh channels…',
    all: 'All channels',
    nowWatching: 'Now watching',
    pick: 'Pick a channel to start watching.',
    noChannels: 'No approved channels in this category yet.',
    localTitle: 'ISP-local & BDIX playlists',
    localDescription:
      'Import your own M3U playlist from your ISP. It stays in this browser and is never uploaded.',
    channels: 'channels',
  },
  bn: {
    eyebrow: 'বাংলাদেশ টিভি',
    title: 'বাংলাদেশের লাইভ টিভি',
    description:
      'অফিসিয়াল বাংলাদেশি সম্প্রচারকদের সংবাদ, বিনোদন, খেলা ও গান। তালিকা থেকে সাথে সাথে চ্যানেল বদলান।',
    search: 'বাংলাদেশি চ্যানেল খুঁজুন…',
    all: 'সব চ্যানেল',
    nowWatching: 'এখন দেখছেন',
    pick: 'দেখা শুরু করতে একটি চ্যানেল বেছে নিন।',
    noChannels: 'এই বিভাগে এখনো কোনো অনুমোদিত চ্যানেল নেই।',
    localTitle: 'আইএসপি-লোকাল ও BDIX প্লেলিস্ট',
    localDescription:
      'আপনার আইএসপির M3U প্লেলিস্ট ইমপোর্ট করুন। এটি শুধু এই ব্রাউজারে থাকে, কোথাও আপলোড হয় না।',
    channels: 'টি চ্যানেল',
  },
} as const;
