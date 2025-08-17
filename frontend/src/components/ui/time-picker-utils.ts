// utils to format/parse HH:mm and generate options

export const pad = (n: number) => String(n).padStart(2, "0");

export const HOURS_24 = Array.from({ length: 24 }, (_, i) => pad(i));

export const minutesByStep = (step: number) =>
  Array.from({ length: Math.floor(60 / step) }, (_, i) => pad(i * step));

export function parseHHmm(v?: string | null) {
  if (!v) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hour: h, minute: min };
}

export function formatHHmm(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`;
}
