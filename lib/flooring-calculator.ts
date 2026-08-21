/**
 * Flooring Packaging & Box Calculator Utility
 * Handles conversion between Square Footage (Area) and Boxes (Packaging)
 */

export interface FlooringBoxResult {
  sqftPerBox: number;
  exactBoxes: number;
  roundedBoxes: number;
  roundedSqft: number;
  differenceSqft: number;
  isExactMultiple: boolean;
  boxesPerPallet?: number;
  palletsCount?: number;
  remainingBoxes?: number;
}

/**
 * Extracts square feet per box from product metadata or description text
 * Supports patterns like:
 * - Sqft/Bx: 30.18 sqft
 * - 22.72 sqft/box
 * - 18.72 sqft per box
 * - 30.18 sf/bx
 */
export function extractSqftPerBox(
  productOrDescription?: any
): number | null {
  if (productOrDescription === null || productOrDescription === undefined) return null;

  if (typeof productOrDescription === "number") {
    return !isNaN(productOrDescription) && productOrDescription > 0 ? productOrDescription : null;
  }

  if (typeof productOrDescription === "object") {
    if (productOrDescription.sqftPerBox) {
      const val = Number(productOrDescription.sqftPerBox);
      if (!isNaN(val) && val > 0) return val;
    }
    if (productOrDescription.description) {
      return parseSqftFromText(productOrDescription.description);
    }
    return null;
  }

  if (typeof productOrDescription === "string") {
    return parseSqftFromText(productOrDescription);
  }

  return null;
}

function parseSqftFromText(text: string): number | null {
  if (!text) return null;

  // Match Sqft/Bx: 30.18 or Sqft/Box: 22.72
  const match1 = text.match(/Sqft\/(?:Bx|Box):\s*([0-9.]+)/i);
  if (match1) {
    const val = parseFloat(match1[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  // Match 30.18 sqft/box or 22.72 sf/bx or 18.72 sqft per box
  const match2 = text.match(/([0-9.]+)\s*(?:sqft|sf|sq\s*ft)\s*(?:\/|per)\s*(?:box|bx)/i);
  if (match2) {
    const val = parseFloat(match2[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  // Match 30.18 sqft box
  const match3 = text.match(/([0-9.]+)\s*(?:sqft|sf|sq\s*ft)\s*(?:box|bx)/i);
  if (match3) {
    const val = parseFloat(match3[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

/**
 * Calculates box counts, rounded boxes, and exact sqft from desired sqft quantity
 */
export function calculateFlooringBoxes(
  sqftQuantity: number | string,
  sqftPerBox: number | string,
  boxesPerPallet?: number | null
): FlooringBoxResult | null {
  const sqft = typeof sqftQuantity === "number" ? sqftQuantity : parseFloat(sqftQuantity);
  const boxCoverage = typeof sqftPerBox === "number" ? sqftPerBox : parseFloat(sqftPerBox);

  if (isNaN(sqft) || isNaN(boxCoverage) || boxCoverage <= 0 || sqft <= 0) {
    return null;
  }

  const exactBoxes = sqft / boxCoverage;
  const roundedBoxes = Math.ceil(exactBoxes);
  const roundedSqft = parseFloat((roundedBoxes * boxCoverage).toFixed(2));
  const differenceSqft = parseFloat((roundedSqft - sqft).toFixed(2));
  const isExactMultiple = Math.abs(roundedSqft - sqft) < 0.005;

  let palletsCount: number | undefined;
  let remainingBoxes: number | undefined;

  if (boxesPerPallet && boxesPerPallet > 0) {
    palletsCount = Math.floor(roundedBoxes / boxesPerPallet);
    remainingBoxes = roundedBoxes % boxesPerPallet;
  }

  return {
    sqftPerBox: boxCoverage,
    exactBoxes: parseFloat(exactBoxes.toFixed(2)),
    roundedBoxes,
    roundedSqft,
    differenceSqft,
    isExactMultiple,
    boxesPerPallet: boxesPerPallet || undefined,
    palletsCount,
    remainingBoxes,
  };
}

/**
 * Converts a whole number of boxes into total square footage
 */
export function calculateSqftFromBoxes(boxes: number, sqftPerBox: number): number {
  return parseFloat((boxes * sqftPerBox).toFixed(2));
}

/**
 * Calculates line item total amount when quantity is entered as Boxes:
 * If item has sqftPerBox (coverage), total sqft = boxes * sqftPerBox.
 * Line item total = totalSqft * rate (e.g. 34 boxes * 30.18 sqft/box * $1.49/sqft = $1,528.92)
 * If no sqftPerBox, line item total = boxes * rate.
 */
export function calculateLineItemAmount(
  quantityBoxes: number,
  rate: number,
  sqftPerBox?: number | null
): { totalSqft: number | null; amount: number; pricePerBox: number } {
  const qty = Number(quantityBoxes) || 0;
  const unitRate = Number(rate) || 0;

  if (sqftPerBox && sqftPerBox > 0) {
    const totalSqft = parseFloat((qty * sqftPerBox).toFixed(2));
    const amount = parseFloat((totalSqft * unitRate).toFixed(2));
    const pricePerBox = parseFloat((sqftPerBox * unitRate).toFixed(2));
    return { totalSqft, amount, pricePerBox };
  }

  const amount = parseFloat((qty * unitRate).toFixed(2));
  return { totalSqft: null, amount, pricePerBox: unitRate };
}
