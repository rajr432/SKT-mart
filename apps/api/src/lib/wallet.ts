import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { WalletTxnReason } from "@prisma/client";

export interface WalletTxnInput {
  amountPaise: number;
  reason: WalletTxnReason;
  ref?: string;
  note?: string;
}

// A Prisma "transaction client" — either the top-level client or the one handed
// to an interactive `$transaction(async (tx) => ...)` callback. Accepting this
// as an optional arg lets callers compose these wallet writes into a larger
// atomic unit (e.g. "zero the gift card AND credit the wallet in one tx").
export type Tx = Prisma.TransactionClient;

async function creditUser(tx: Tx, userId: string, input: WalletTxnInput) {
  const u = await tx.user.update({
    where: { id: userId },
    data: { walletBalance: { increment: input.amountPaise } },
    select: { walletBalance: true },
  });
  return tx.walletTransaction.create({
    data: {
      userId,
      type: "CREDIT",
      reason: input.reason,
      amountPaise: input.amountPaise,
      balanceAfter: u.walletBalance,
      ref: input.ref,
      note: input.note,
    },
  });
}

async function debitUser(tx: Tx, userId: string, input: WalletTxnInput) {
  // Race-safe debit: the sufficiency check and the decrement are a single
  // conditional UPDATE. Two concurrent debits cannot both "pass the check" —
  // whichever transaction loses the row-level lock re-evaluates the predicate
  // against the freshly committed balance and either succeeds (if there's
  // still enough) or is rejected by claim.count === 0.
  const claim = await tx.user.updateMany({
    where: { id: userId, walletBalance: { gte: input.amountPaise } },
    data: { walletBalance: { decrement: input.amountPaise } },
  });
  if (claim.count === 0) throw new Error("Insufficient wallet balance");
  const u = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { walletBalance: true },
  });
  return tx.walletTransaction.create({
    data: {
      userId,
      type: "DEBIT",
      reason: input.reason,
      amountPaise: input.amountPaise,
      balanceAfter: u.walletBalance,
      ref: input.ref,
      note: input.note,
    },
  });
}

async function creditVendor(tx: Tx, vendorId: string, input: WalletTxnInput) {
  const v = await tx.vendor.update({
    where: { id: vendorId },
    data: { walletBalance: { increment: input.amountPaise } },
    select: { walletBalance: true },
  });
  return tx.walletTransaction.create({
    data: {
      vendorId,
      type: "CREDIT",
      reason: input.reason,
      amountPaise: input.amountPaise,
      balanceAfter: v.walletBalance,
      ref: input.ref,
      note: input.note,
    },
  });
}

async function debitVendor(tx: Tx, vendorId: string, input: WalletTxnInput) {
  // Race-safe debit — see debitUser for rationale.
  const claim = await tx.vendor.updateMany({
    where: { id: vendorId, walletBalance: { gte: input.amountPaise } },
    data: { walletBalance: { decrement: input.amountPaise } },
  });
  if (claim.count === 0) throw new Error("Insufficient vendor wallet balance");
  const v = await tx.vendor.findUniqueOrThrow({
    where: { id: vendorId },
    select: { walletBalance: true },
  });
  return tx.walletTransaction.create({
    data: {
      vendorId,
      type: "DEBIT",
      reason: input.reason,
      amountPaise: input.amountPaise,
      balanceAfter: v.walletBalance,
      ref: input.ref,
      note: input.note,
    },
  });
}

export async function creditUserWallet(userId: string, input: WalletTxnInput, tx?: Tx) {
  return tx ? creditUser(tx, userId, input) : prisma.$transaction((t) => creditUser(t, userId, input));
}

export async function debitUserWallet(userId: string, input: WalletTxnInput, tx?: Tx) {
  return tx ? debitUser(tx, userId, input) : prisma.$transaction((t) => debitUser(t, userId, input));
}

export async function creditVendorWallet(vendorId: string, input: WalletTxnInput, tx?: Tx) {
  return tx ? creditVendor(tx, vendorId, input) : prisma.$transaction((t) => creditVendor(t, vendorId, input));
}

export async function debitVendorWallet(vendorId: string, input: WalletTxnInput, tx?: Tx) {
  return tx ? debitVendor(tx, vendorId, input) : prisma.$transaction((t) => debitVendor(t, vendorId, input));
}
