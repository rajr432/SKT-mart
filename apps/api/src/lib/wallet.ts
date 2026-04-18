import { prisma } from "./prisma";
import type { WalletTxnReason } from "@prisma/client";

export interface WalletTxnInput {
  amountPaise: number;
  reason: WalletTxnReason;
  ref?: string;
  note?: string;
}

export async function creditUserWallet(userId: string, input: WalletTxnInput) {
  return prisma.$transaction(async (tx) => {
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
  });
}

export async function debitUserWallet(userId: string, input: WalletTxnInput) {
  return prisma.$transaction(async (tx) => {
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
  });
}

export async function creditVendorWallet(vendorId: string, input: WalletTxnInput) {
  return prisma.$transaction(async (tx) => {
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
  });
}

export async function debitVendorWallet(vendorId: string, input: WalletTxnInput) {
  return prisma.$transaction(async (tx) => {
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
  });
}
