export type ActivityEventSource =
  | "navigation"
  | "questionnaire"
  | "video"
  | "product"
  | "cart"
  | "checkout"
  | "download"
  | "crm";

export type ActivityEventType =
  | "page_view"
  | "engaged_page_view"
  | "return_session"
  | "questionnaire_started"
  | "questionnaire_step_viewed"
  | "questionnaire_answered"
  | "questionnaire_completed"
  | "bookmark_created"
  | "bookmark_resumed"
  | "video_started"
  | "video_progress_50"
  | "video_progress_90"
  | "video_completed"
  | "video_bookmark_created"
  | "video_resumed"
  | "product_viewed"
  | "cart_item_added"
  | "cart_item_removed"
  | "checkout_started"
  | "purchase_completed"
  | "download_requested";

export type ActivityEvent = {
  type: ActivityEventType;
  source: ActivityEventSource;
  occurredAt?: string;
  properties?: Record<string, unknown>;
};

export type ActivityIdentity = {
  visitorId: string;
  sessionId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sessionStartedAt: string;
  anonymousInterestScore: number;
};
