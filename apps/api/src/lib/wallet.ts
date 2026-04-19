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
  const cur = await tx.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });
  if (!cur || cur.walletBalance < input.amountPaise) {
    throw new Error("Insufficient wallet balance");
  }
  const u = await tx.user.update({
    where: { id: userId },
    data: { walletBalance: { decrement: input.amountPaise } },
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
  const cur = await tx.vendor.findUnique({
    where: { id: vendorId },
    select: { walletBalance: true },
  });
  if (!cur || cur.walletBalance < input.amountPaise) {
    throw new Error("Insufficient vendor wallet balance");
  }
  const v = await tx.vendor.update({
    where: { id: vendorId },
    data: { walletBalance: { decrement: input.amountPaise } },
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
