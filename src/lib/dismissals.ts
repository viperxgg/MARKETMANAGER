import { prisma } from "./db";
import { ProductSlug } from "./product-data";

export type DismissibleCard = {
  itemType: string;
  itemId: string;
};

export function dismissalKey(item: DismissibleCard) {
  return `${item.itemType}:${item.itemId}`;
}

export async function getDismissedCardKeys(items: DismissibleCard[]) {
  if (items.length === 0) {
    return new Set<string>();
  }

  const dismissals = await prisma.dashboardDismissal.findMany({
    where: {
      OR: items.map((item) => ({
        itemType: item.itemType,
        itemId: item.itemId
      }))
    },
    select: {
      itemType: true,
      itemId: true
    }
  });

  return new Set(dismissals.map((item) => dismissalKey(item)));
}

export async function dismissCard(input: {
  itemType: string;
  itemId: string;
  productSlug?: ProductSlug;
  dismissReason?: string;
}) {
  const product = input.productSlug
    ? await prisma.product.findUnique({
        where: { slug: input.productSlug },
        select: { id: true }
      })
    : null;

  return prisma.dashboardDismissal.upsert({
    where: {
      itemType_itemId: {
        itemType: input.itemType,
        itemId: input.itemId
      }
    },
    update: {
      dismissedAt: new Date(),
      dismissedByOwner: true,
      dismissReason: input.dismissReason,
      productId: product?.id
    },
    create: {
      itemType: input.itemType,
      itemId: input.itemId,
      dismissedByOwner: true,
      dismissReason: input.dismissReason,
      productId: product?.id
    }
  });
}

export async function restoreDismissedCard(input: { itemType: string; itemId: string }) {
  await prisma.dashboardDismissal.deleteMany({
    where: {
      itemType: input.itemType,
      itemId: input.itemId
    }
  });
}
