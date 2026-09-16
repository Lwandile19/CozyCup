import { STANDARD_COLOURS } from '../types';

export interface EstimatedCompletionResult {
  estimatedDate: Date;
  targetDate: Date;
  formattedDate: string; // e.g. "22 Sep 2026"
  isBiggerItem: boolean;
  baseDays: number;
  bufferDays: number;
  totalDays: number;
  isAfterCutoff: boolean;
  isSpecialColour: boolean;
  displayMessage: string;
  breakdown: string;
  bufferReason?: string;
}

const BIGGER_ITEM_KEYWORDS = [
  'bag',
  'tote',
  'backpack',
  'purse',
  'skirt',
  'dress',
  'sweater',
  'cardigan',
  'blanket',
  'large plushie',
  'giant',
  'big plushie',
  'bundle',
  'large'
];

const SMALLER_ITEM_KEYWORDS = [
  'beanie',
  'bracelet',
  'keychain',
  'small plushie',
  'plushie',
  'teddy',
  'cozy',
  'mug cozy',
  'charm',
  'scrunchie',
  'sunflower',
  'flower',
  'coaster',
  'bookmark'
];

export function isSpecialColourRequested(colour: string): boolean {
  if (!colour || !colour.trim()) return false;
  const trimmed = colour.trim().toLowerCase();
  const isStandard = STANDARD_COLOURS.some(
    (c) => c.toLowerCase() === trimmed
  );
  return !isStandard;
}

export function classifyItemSize(
  itemCategory: string,
  itemRequested: string
): { isBiggerItem: boolean; classification: 'Bigger (+-14 to 21 days)' | 'Smaller (+-7 days)' } {
  const combined = `${itemCategory || ''} ${itemRequested || ''}`.toLowerCase();

  // Check bigger item keywords first
  const hasBiggerKeyword = BIGGER_ITEM_KEYWORDS.some((kw) => combined.includes(kw));
  if (hasBiggerKeyword) {
    return { isBiggerItem: true, classification: 'Bigger (+-14 to 21 days)' };
  }

  // Check smaller item keywords
  const hasSmallerKeyword = SMALLER_ITEM_KEYWORDS.some((kw) => combined.includes(kw));
  if (hasSmallerKeyword) {
    return { isBiggerItem: false, classification: 'Smaller (+-7 days)' };
  }

  // Fallback by category
  if (combined.includes('bracelet')) {
    return { isBiggerItem: false, classification: 'Smaller (+-7 days)' };
  }

  return { isBiggerItem: false, classification: 'Smaller (+-7 days)' };
}

export function calculateEstimatedCompletion(
  itemCategory: string,
  itemRequested: string,
  colour: string,
  orderDateInput?: Date | string,
  isMaterialOutOfStock?: boolean
): EstimatedCompletionResult {
  const orderDate = orderDateInput ? new Date(orderDateInput) : new Date();

  // 1. ITEM SIZE CLASSIFICATION
  const { isBiggerItem } = classifyItemSize(itemCategory, itemRequested);
  const baseDays = isBiggerItem ? 14 : 7; // Smaller: 7 days; Bigger: 14 to 21 days (baseline 14)

  // 2. WEEKLY CUTOFF TIME
  // Orders placed BEFORE 9:00 PM Sunday Evening -> counted as current week, completion +-7 days from order date
  // Orders placed AFTER 9:00 PM Sunday Evening -> pushed to following week, completion +-7 days from next week's start (Monday)
  const dayOfWeek = orderDate.getDay(); // 0 is Sunday
  const hours = orderDate.getHours();
  const isSundayAfter9PM = dayOfWeek === 0 && hours >= 21;

  let referenceStartDate = new Date(orderDate.getTime());
  let isAfterCutoff = false;

  if (isSundayAfter9PM) {
    isAfterCutoff = true;
    // Advance to next Monday 08:00 AM
    referenceStartDate.setDate(referenceStartDate.getDate() + 1);
    referenceStartDate.setHours(8, 0, 0, 0);
  }

  // 3. MATERIALS AVAILABILITY & SPECIAL COLOUR
  const specialColour = isSpecialColourRequested(colour);
  let bufferDays = 0;
  let bufferReason = '';

  if (specialColour || isMaterialOutOfStock) {
    bufferDays = 4; // Add 4 days buffer for special sourcing
    bufferReason = 'may take longer due to material sourcing';
  }

  const totalDays = baseDays + bufferDays;
  const estimatedDate = new Date(referenceStartDate.getTime());
  estimatedDate.setDate(estimatedDate.getDate() + totalDays);

  // Format date nicely: e.g. "22 Sep 2026"
  const formattedDate = estimatedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  let displayMessage = `Estimated completion: ${formattedDate}. This is an estimate — we'll update you if anything changes.`;
  if (bufferReason) {
    displayMessage += ` (${bufferReason})`;
  }

  return {
    estimatedDate,
    targetDate: estimatedDate,
    formattedDate,
    isBiggerItem,
    baseDays,
    bufferDays,
    totalDays,
    isAfterCutoff,
    isSpecialColour: specialColour,
    displayMessage,
    breakdown: displayMessage,
    bufferReason: bufferReason || undefined
  };
}
