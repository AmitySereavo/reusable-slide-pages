import { prisma } from "@/lib/prisma";

export async function getUserStoreCreditBalance(
  userId: string,
  currencyCode = "USD"
) {
  const [purchasedAggregate, returnedAggregate] = await Promise.all([
    prisma.storeCreditLedgerEntry.aggregate({
      where: {
        userId,
        currencyCode,
        creditType: "PURCHASED",
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.storeCreditLedgerEntry.aggregate({
      where: {
        userId,
        currencyCode,
        creditType: "RETURNED",
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const purchased = toBalanceNumber(purchasedAggregate._sum.amount);
  const returned = toBalanceNumber(returnedAggregate._sum.amount);

  return {
    purchased,
    returned,
    total: purchased + returned,
    currencyCode,
  };
}

function toBalanceNumber(value: unknown) {
  const balance = Number(value ?? 0);

  return Number.isFinite(balance) ? balance : 0;
}

export async function getUserStoreCreditTotal(
  userId: string,
  currencyCode = "USD"
) {
  const aggregate = await prisma.storeCreditLedgerEntry.aggregate({
    where: {
      userId,
      currencyCode,
    },
    _sum: {
      amount: true,
    },
  });

  return toBalanceNumber(aggregate._sum.amount);
}

export function getStoreCreditUsePolicy() {
  return {
    purchasedCanBuyForOthers: true,
    returnedCanBuyForOthers: false,
  };
}
