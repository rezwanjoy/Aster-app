import type { Lang } from '@/types';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Replace Latin digits with Bangla digits. */
export function toBanglaDigits(text: string): string {
  return text.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

// Bangla digits are shown only when the UI language is Bangla AND the option is on.
const useBnDigits = (lang: Lang, banglaNumerals: boolean) => lang === 'bn' && banglaNumerals;

export function formatNumber(
  value: number,
  lang: Lang,
  banglaNumerals: boolean,
  opts?: Intl.NumberFormatOptions,
): string {
  const text = new Intl.NumberFormat(lang === 'bn' ? 'bn-BD-u-nu-latn' : 'en-US', opts).format(value);
  return useBnDigits(lang, banglaNumerals) ? toBanglaDigits(text) : text;
}

export function formatDate(
  value: Date | string,
  lang: Lang,
  banglaNumerals: boolean,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const text = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD-u-nu-latn' : 'en-GB', opts).format(date);
  return useBnDigits(lang, banglaNumerals) ? toBanglaDigits(text) : text;
}

/** "2026-10" → "October 2026" / "অক্টোবর ২০২৬". */
export function formatMonth(month: string, lang: Lang, banglaNumerals: boolean, style: "long" | "short" = "long"): string {
  const [y, m] = month.split("-").map(Number);
  const text = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD-u-nu-latn" : "en-GB", { month: style, year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  return lang === "bn" && banglaNumerals ? toBanglaDigits(text) : text;
}

/** "18:00" → "6:00 PM" / "সন্ধ্যা ৬:০০". Returns the input unchanged if it isn't HH:mm. */
export function formatTime(time: string | undefined, lang: Lang, banglaNumerals: boolean): string {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return time ?? '';
  const [h, m] = time.split(':').map(Number);
  const text = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD-u-nu-latn' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
  return lang === 'bn' && banglaNumerals ? toBanglaDigits(text) : text;
}
