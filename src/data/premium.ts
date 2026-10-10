// Premium features shown LOCKED in the demo (brief §4.2, §11). Nothing here is built or sold.
import type { ComponentType, SVGProps } from 'react';
import { IconBell, IconChart, IconCloud, IconFile, IconLayers, IconMic, IconPencil, IconSparkle, IconStar } from '@/components/icons';

export type PremiumId = 'recorder' | 'practice' | 'alerts' | 'pdf' | 'paper' | 'center' | 'school' | 'teacherAi' | 'sync' | 'planPro' | 'planCenter';
export type PlanId = 'pro' | 'center';

export interface PremiumFeature {
  id: PremiumId;
  plan: PlanId;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  { id: 'recorder', plan: 'pro', Icon: IconMic },
  { id: 'practice', plan: 'pro', Icon: IconPencil },
  { id: 'alerts', plan: 'pro', Icon: IconBell },
  { id: 'pdf', plan: 'pro', Icon: IconFile },
  { id: 'paper', plan: 'pro', Icon: IconChart },
  { id: 'center', plan: 'center', Icon: IconLayers },
  { id: 'school', plan: 'center', Icon: IconLayers },
  { id: 'teacherAi', plan: 'center', Icon: IconSparkle },
  { id: 'sync', plan: 'center', Icon: IconCloud },
  { id: 'planPro', plan: 'pro', Icon: IconStar },
  { id: 'planCenter', plan: 'center', Icon: IconStar },
];

export const featureById = (id: PremiumId): PremiumFeature => PREMIUM_FEATURES.find((f) => f.id === id)!;

/** Monthly price points to choose from, in taka (planned pricing: Tutor Pro ≈ ৳600–1,000, Center ≈ $20–35). */
export const PRICE_POINTS: Record<PlanId, number[]> = {
  pro: [300, 600, 800, 1000, 1500],
  center: [2500, 3500, 5000, 7000],
};

/** How a chosen price is stored in the interest log, e.g. "pro:600" or "pro:none". */
export const priceKey = (plan: PlanId, amount: number | 'none') => `${plan}:${amount}`;

/** "pro:600" → "৳600/month · Tutor Pro" parts for display. */
export function parsePriceKey(key: string): { plan: PlanId; amount: number | 'none' } | null {
  const [plan, amount] = key.split(':');
  if ((plan !== 'pro' && plan !== 'center') || !amount) return null;
  return { plan, amount: amount === 'none' ? 'none' : Number(amount) };
}
