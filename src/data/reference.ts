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
}

/** Official free sports destinations. Opened on the provider site; never embedded or proxied. */
export const OFFICIAL_SPORTS_DESTINATIONS: OfficialDestination[] = [
  {
    name: 'FIFA+',
    url: 'https://www.plus.fifa.com/',
    description: 'FIFA’s official streaming service with free live matches from selected competitions in many regions.',
  },
  {
    name: 'UEFA.tv',
    url: 'https://www.uefa.tv/',
    description: 'Free official UEFA streams of youth, women’s and futsal competitions plus archive matches.',
  },
  {
    name: 'Olympics.com',
    url: 'https://www.olympics.com/en/watch',
    description: 'Official Olympic Channel live events, qualifiers and documentaries.',
  },
  {
    name: 'Red Bull TV',
    url: 'https://www.redbull.com/int-en/discover',
    description: 'Free live action sports, motorsport and esports events published by Red Bull.',
  },
  {
    name: 'ICC.tv',
    url: 'https://www.icc-cricket.com/',
    description: 'International Cricket Council official site; free match streams are offered in selected regions.',
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
