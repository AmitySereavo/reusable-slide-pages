"use client";

import type { ActivityEvent } from "./types";

export const APP_ACTIVITY_EVENT = "app-activity-event";

export function trackActivity(event: ActivityEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ActivityEvent>(APP_ACTIVITY_EVENT, { detail: event })
  );
}

export function trackProductViewed(product: Record<string, unknown>) {
  trackActivity({
    type: "product_viewed",
    source: "product",
    properties: { product },
  });
}

export function trackCartItemAdded(item: Record<string, unknown>) {
  trackActivity({
    type: "cart_item_added",
    source: "cart",
    properties: { item },
  });
}

export function trackCartItemRemoved(item: Record<string, unknown>) {
  trackActivity({
    type: "cart_item_removed",
    source: "cart",
    properties: { item },
  });
}

export function trackCheckoutStarted(cart: Record<string, unknown>) {
  trackActivity({
    type: "checkout_started",
    source: "checkout",
    properties: { cart },
  });
}

export function trackPurchaseCompleted(order: Record<string, unknown>) {
  trackActivity({
    type: "purchase_completed",
    source: "checkout",
    properties: { order },
  });
}

export function trackDownloadRequested(download: Record<string, unknown>) {
  trackActivity({
    type: "download_requested",
    source: "download",
    properties: { download },
  });
}
