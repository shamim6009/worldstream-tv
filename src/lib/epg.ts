import type { Channel, EpgData, EpgProgram } from '../types/catalog';

export function programsFor(epg: EpgData | undefined, channel: Channel): EpgProgram[] {
  if (!epg) return [];
  const list = epg.channels[channel.epgId ?? ''] ?? epg.channels[channel.id] ?? [];
  return [...list].sort((a, b) => a.start.localeCompare(b.start));
}

export function nowAndNext(programs: EpgProgram[], now = Date.now()): { current: EpgProgram | null; upcoming: EpgProgram[] } {
  let current: EpgProgram | null = null;
  const upcoming: EpgProgram[] = [];
  for (const program of programs) {
    const start = Date.parse(program.start);
    const stop = Date.parse(program.stop);
    if (!Number.isFinite(start) || !Number.isFinite(stop)) continue;
    if (start <= now && now < stop) current = program;
    else if (start > now) upcoming.push(program);
  }
  return { current, upcoming };
}

export function programsOnDay(programs: EpgProgram[], dayStart: Date): EpgProgram[] {
  const from = dayStart.getTime();
  const to = from + 24 * 60 * 60 * 1000;
  return programs.filter((program) => Date.parse(program.stop) > from && Date.parse(program.start) < to);
}

export function progress(program: EpgProgram, now = Date.now()): number {
  const start = Date.parse(program.start);
  const stop = Date.parse(program.stop);
  if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) return 0;
  return Math.min(1, Math.max(0, (now - start) / (stop - start)));
}
