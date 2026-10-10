// wa.me link builder (brief D10/D11). No messages are sent automatically: the teacher taps Send in WhatsApp.

/**
 * Turn a typed phone number into the international digits wa.me expects.
 * "01712-345678" → "8801712345678" (Bangladesh by default). Returns null if it can't be a phone number.
 */
export function normalizePhone(raw: string | undefined, countryCode = '880'): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, '');
  if (raw.trim().startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = countryCode + digits.slice(1);
  } else if (!digits.startsWith(countryCode)) {
    digits = countryCode + digits;
  }
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** https://wa.me/<number>?text=<encoded>. Without a number WhatsApp lets the user pick the contact. */
export function whatsappLink(phone: string | undefined, text: string): string {
  const number = normalizePhone(phone);
  return `https://wa.me/${number ?? ''}?text=${encodeURIComponent(text)}`;
}
