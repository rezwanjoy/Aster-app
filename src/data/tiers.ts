// The three planned plans (demo prices in taka per month; nothing can be bought). Brief §23b.
export type TierId = 'solo' | 'plus' | 'pro';

export interface Tier {
  id: TierId;
  /** monthly demo price in taka */
  price: number;
  /** students: "up to" for Solo and Plus, "more than" for Pro */
  limit: number;
  over?: boolean;
  popular?: boolean;
  soon?: boolean;
}

export const TIERS: Tier[] = [
  { id: 'solo', price: 0, limit: 60 },
  { id: 'plus', price: 2500, limit: 300, popular: true },
  { id: 'pro', price: 7500, limit: 300, over: true, soon: true },
];

export const ITEM_KEYS = ['i1', 'i2', 'i3', 'i4'] as const;
