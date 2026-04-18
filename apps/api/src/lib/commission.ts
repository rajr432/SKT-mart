import { getSettings } from "./settings";
import { prisma } from "./prisma";

export interface CommissionResult {
  amountPaise: number;
  percent: number;
  basePaise: number;
}

/**
 * Compute platform commission for a single order line item.
 * Default rule: 10% on items priced above ₹500 (per unit), 5% otherwise.
 * Vendor's commissionOverride takes precedence (if set).
 */
export async function computeCommission(
  unitPricePaise: number,
  quantity: number,
  vendorId?: string,
): Promise<CommissionResult> {
  const settings = await getSettings();
  const base = unitPricePaise * quantity;

  let percent: number;
  if (unitPricePaise >= settings.commissionThreshold) {
    percent = settings.commissionPercent;
  } else {
    percent = settings.commissionPercentBelow;
  }

  if (vendorId) {
    const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (v?.commissionOverride !== null && v?.commissionOverride !== undefined) {
      percent = v.commissionOverride;
    }
  }

  const amountPaise = Math.floor((base * percent) / 100);
  return { amountPaise, percent, basePaise: base };
}
