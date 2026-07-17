export type PrimitiveValue = string | number | boolean;

export interface QuestionnaireVariableMap {
  [key: string]: QuestionnaireVariableValue | undefined;
}

export type QuestionnaireAnswerValue = QuestionnaireVariableValue | undefined;
export type QuestionnaireAnswers = Record<string, QuestionnaireAnswerValue>;

export type QuestionnaireVariableValue =
  | PrimitiveValue
  | null
  | QuestionnaireVariableMap
  | QuestionnaireVariableValue[];

export type FulfillmentType = "physical" | "digital" | "ticket";

export type DownloadButton = {
  key: string;
  label: string;
  styleKey?: string;
};

export type SlideFooterActionKind =
  | "media"
  | "goto"
  | "textpanel"
  | "download"
  | "auth"
  | "link";

export type SlideFooterActionVisibility = "always" | "logged-in" | "logged-out";

export type TextPanelMode = "lines" | "song" | "learn" | "shop";
export type ActionBarOrder = "choices-first" | "nav-first";

export type SlideFooterAction = {
  kind: SlideFooterActionKind;
  key: string;
  label: string;
  target?: string;
  href?: string;
  visibility?: SlideFooterActionVisibility;
  disabled?: boolean;
};

export type DownloadRequestTarget = {
  scope: "song" | "album";
  itemId?: string;
};

export type DownloadRequestMap = Record<string, DownloadRequestTarget>;

export type DownloadFormatOption = {
  format: "mp3" | "wav";
  label: string;
  styleKey?: string;
};

export type ShopMealSelectionRequirement = {
  mode: "required" | "optional";
  menuId: string;
  label?: string;
  price?: number;
};

export type ShopPurchaseMode = {
  id: string;
  sku?: string;
  label: string;
  priceAdjustment: number;
  requiresPhysicalFulfillment?: boolean;
  mealSelection?: ShopMealSelectionRequirement;
  bundledCartItems?: ShopBundledCartItem[];
  metadata?: QuestionnaireVariableMap;
};

export type ShopBundledCartItem = {
  productId: string;
  sizeOptionId: string;
  purchaseModeId?: string;
  quantity?: number;
};

export type ShopCatalogSizeOption = {
  id: string;
  sku?: string;
  label: string;
  description?: string;
  price: number;
  weight?: number;
  mealSelection?: ShopMealSelectionRequirement;
  purchaseModes?: ShopPurchaseMode[];
};

export type ShopCatalogProduct = {
  id: string;
  sku?: string;
  slug?: string;
  title: string;
  imageUrl?: string;
  description?: string;
  detailsDescription?: string;
  eventVenueLabel?: string;
  eventAddress?: string;
  eventDateLabel?: string;
  eventTimeLabel?: string;
  fulfillmentType?: FulfillmentType;
  enableStoreCreditPurchase?: boolean;
  enablePurchaseForOthers?: boolean;
  maxPurchaseForOthers?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  maxAccountHolderQuantity?: number;
  minRecipientQuantity?: number;
  maxRecipientQuantity?: number;
  metadata?: QuestionnaireVariableMap;
  sizeOptions: ShopCatalogSizeOption[];
};

export type ShopCatalog = {
  currencyCode?: string;
  baseCurrencyCode?: string;
  exchangeRate?: number;
  weightUnit?: string;
  products: ShopCatalogProduct[];
};

export type MealMenuOption = {
  id: string;
  label: string;
  price?: number;
};

export type MealMenuGroup = {
  id: string;
  label: string;
  required?: boolean;
  billingMode?: "included" | "pay";
  includedServings?: number;
  options: MealMenuOption[];
};

export type MealMenu = {
  id: string;
  label: string;
  groups: MealMenuGroup[];
};

export type MealMenuCatalog = {
  menus: MealMenu[];
};

export type TicketMealSelection = Record<string, Record<string, number>>;

export type TicketOwnerPaymentMode =
  | "purchaser_pays_ticket_and_addons"
  | "owner_selects_sender_pays_addons"
  | "owner_pays_addons"
  | "owner_pays_ticket_and_addons";
  
export type TicketAssignment = {
  ticketCode: string;
  lineKey: string;
  productId: string;
  sizeOptionId: string;
  purchaseModeId?: string;
  purchaseModeLabel?: string;
  ticketUpgradeOverride?: boolean;
  invitationDeliveryMode?: "digital" | "physical";
  invitationMailingAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  isPlusOneTicket?: boolean;
  plusOneHostTicketIndex?: number;
  plusOneHostName?: string;
  physicalInvitationFulfillmentDetails?: string;
  ticketIndex: number;
  ticketSelectionTimestamp?: string;
  ticketLabel: string;
  productTitle: string;
  ownerName?: string;
  printedTicketName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  purchaserContactPrefilled?: boolean;
  isPurchaserTicket?: boolean;
  ownerLockedFromRecipient?: boolean;
  emailTicketToOwner?: boolean;
  ticketOwnerPaymentMode?: TicketOwnerPaymentMode;
  ticketOwnerAddonBudget?: number;
  mealMode?: "required" | "optional";
  mealMenuId?: string;
  mealLabel?: string;
  mealAddOnPrice?: number;
  mealEnabled?: boolean;
  mealSelection?: TicketMealSelection;
  wantsExtraFood?: boolean;
  hasMealNotes?: boolean;
  mealNotes?: string;
};

export type TicketAssignments = TicketAssignment[];

export type MealSelections = Record<
  string,
  Record<string, Record<string, number>>
>;

export type ShopMode = "browse" | "review";

export type DiscountType = "percentage" | "fixed_amount";

export type DiscountScope = "order" | "product" | "size_option";

export type DiscountDefinition = {
  code: string;
  label: string;
  active: boolean;
  type: DiscountType;
  scope: DiscountScope;
  amount: number;
  productIds?: string[];
  sizeOptionIds?: string[];
};

export type DiscountedOrderSummary = {
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  grandTotal: number;
};

export type PromotionEligibleItem = {
  productId: string;
  slug: string;
  label: string;
};

export type ShopCartLine = {
  productId: string;
  sizeOptionId: string;
  selected: boolean;
  quantity: number;
  availabilityStatus?: "available" | "unavailable";
  unavailableReason?: string;
  purchaseModeId?: string;
  bundledFromLineKey?: string;
  bundledByPurchaseModeId?: string;
  ticketAddOnAttendeeName?: string;
  ticketAddOnTicketCode?: string;
  purchaseRecipients?: ShopPurchaseRecipient[];
  unitPriceOverride?: number;
  compareAtUnitPrice?: number;
  discountLabel?: string;
  isComplimentaryGift?: boolean;
  lockedQuantity?: boolean;
  lockedPurchaseMode?: boolean;
};

export type ShopCart = Record<string, ShopCartLine>;

export type ShopPurchaseRecipient = {
  name: string;
  email: string;
  quantity?: number;
  note?: string;
  purchaseModeId?: string;
  purchaseModeLabel?: string;
};

export type ShopResolvedCartLine = {
  lineKey: string;
  selected?: boolean;
  availabilityStatus?: "available" | "unavailable";
  unavailableReason?: string;
  productId: string;
  productSku?: string;
  productTitle: string;
  productImageUrl?: string;
  sizeOptionId: string;
  sizeOptionSku?: string;
  sizeLabel: string;
  quantity: number;
  fulfillmentType?: FulfillmentType;
  requiresPhysicalFulfillment?: boolean;
  purchaseModeId?: string;
  purchaseModeSku?: string;
  purchaseModeLabel?: string;
  bundledFromLineKey?: string;
  bundledByPurchaseModeId?: string;
  ticketAddOnAttendeeName?: string;
  ticketAddOnTicketCode?: string;
  sku?: string;
  purchaseRecipients?: ShopPurchaseRecipient[];
  mealSelection?: ShopMealSelectionRequirement;
  unitPrice: number;
  lineTotal: number;
  unitWeight?: number;
  lineWeight?: number;
  baseUnitPrice?: number;
  baseLineTotal?: number;
  unitDiscount?: number;
  lineDiscount?: number;
  discountCode?: string;
  discountLabel?: string;
};

export type DeliveryCountryCode = "JM" | "US" | "CA" | "AE";

export type DeliveryRegionOption = {
  code: string;
  label: string;
};

export type StablePickupLocation = {
  id: string;
  label: string;
  parishOrRegion: string;
  countryCode: DeliveryCountryCode;
  nextVisitDate: string;
  pickupWindowLabel: string;
  notes?: string;
};

export type PopupShopLocation = {
  id: string;
  label: string;
  parishOrRegion: string;
  countryCode: DeliveryCountryCode;
  eventDate: string;
  eventDateLabel: string;
  notes?: string;
};

export type DeliveryZoneRate = {
  countryCode: DeliveryCountryCode;
  regionCode: string;
  regionLabel: string;
  feeJmd: number;
  notes?: string;
};

export type DeliveryConfig = {
  countries: Array<{
    code: DeliveryCountryCode;
    label: string;
  }>;
  regionOptions: Record<DeliveryCountryCode, DeliveryRegionOption[]>;
  stablePickupLocations: StablePickupLocation[];
  popupShopLocations: PopupShopLocation[];
  deliveryZoneRates: DeliveryZoneRate[];
};

export type DeliveryMethod =
  | "pickup_stable"
  | "pickup_popup"
  | "delivery";

export type DeliverySelection = {
  method?: DeliveryMethod;
  stablePickupLocationId?: string;
  popupShopLocationId?: string;
  countryCode?: DeliveryCountryCode;
  regionCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  apartmentOrUnit?: string;
  cityOrTown?: string;
  postalCode?: string;
  deliveryFee?: number;
  deliveryCurrencyCode?: string;
  deliveryBaseFee?: number;
  deliveryBaseCurrencyCode?: string;
};

export type OrderContact = {
  fullName?: string;
  email?: string;
  phone?: string;
  whatsappOptIn?: boolean;
};

export type ContactMode = "lead" | "order";

export type Option = {
  label: string;
  value: PrimitiveValue;
  disabled?: boolean;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type RecordListItem = {
  value: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  childCount?: number;
};

export type DataBlockRow = {
  key: string;
  label: string;
  valueField?: string;
  value?: PrimitiveValue;
  emptyText?: string;
  format?: "text" | "boolean_yes_no";
  showIf?: ConditionRule[];
};

export type DataBlockAction = {
  key: string;
  label: string;
  kind: "goto" | "delete_record";
  target?: string;
  deleteEndpoint?: string;
  deleteIdField?: string;
  deleteCodeField?: string;
  deleteIdPayloadKey?: string;
  deleteCodePayloadKey?: string;
  deleteConfirmationPayloadKey?: string;
  deleteSuccessGoto?: string;
  deleteRefreshSources?: string[];
  deleteClearAnswerKeys?: string[];
  confirmationPhrase?: string;
  styleKey?: string;
  showIf?: ConditionRule[];
};

export type DataBlockSectionAction = {
  key: string;
  label: string;
  kind: "goto";
  target: string;
  styleKey?: string;
  showIf?: ConditionRule[];
};

export type DataBlockSection = {
  key: string;
  title?: string;
  rows: DataBlockRow[];
  action?: DataBlockSectionAction;
  showIf?: ConditionRule[];
};

export type DataBlockDefinition = {
  key: string;
  sourceKey?: string;
  sections: DataBlockSection[];
  actions?: DataBlockAction[];
};

export type ChoicePlacement = "actionbar" | "inline";
export type SlideTitlePlacement = "body" | "progress_overlay";

export type ChoiceItem = {
  value: PrimitiveValue;
  label: string;
  goto?: string;
  styleKey?: string;
};

export type RouteOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in";

export type ConditionRule = {
  field: string;
  operator: RouteOperator;
  value: string;
};

export type SlideRouteRule = ConditionRule & {
  goto: string;
};

export type ShowIfRule = {
  field: string;
  in: PrimitiveValue[];
};

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "password"
  | "number"
  | "date"
  | "checkbox"
  | "textarea"
  | "select";

export type FormField = {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
};

export type SlideFeature =
  | {
      type: "numberscale";
      options: Option[];
    };

export type SlideSection =
  | { type: "heading"; text: string; colorKey?: string }
  | { type: "subheading"; text: string; colorKey?: string }
  | { type: "paragraph"; text: string; colorKey?: string }
  | { type: "break" }
  | { type: "feature"; feature: SlideFeature };

export type MediaType = "image" | "video";
export type MediaAspect = "horizontal" | "vertical" | "square";
export type AnnotatedTextMode = "lyrics" | "article" | "chapter" | "story";
export type SlideProgressMode = "slide" | "video";
export type SlideProgressPlacement = "overlay" | "footer-edge";
export type VideoResumeMode =
  | "none"
  | "auto"
  | "prompt-once"
  | "prompt-every-time";

export type VideoRoute = {
  atSeconds: number;
  goto: string;
};
export type SlideType =
  | "score"
  | "content"
  | "contact"
  | "choice"
  | "result"
  | "story"
  | "form"
  | "video"
  | "media"
  | "shop"
  | "tickets"
  | "meal"
  | "delivery"
  | "authverify"
  | "authform"
  | "accountsummary"
  | "purchaserecipients"
  | "recordlist"
  | "annotatedtext";

export type Slide = {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string;
  body?: string;
  helperText?: string;
  helperTextBelowOptions?: boolean;
  options?: Option[];
  choices?: ChoiceItem[];
  choicePlacement?: ChoicePlacement;
  downloadButtons?: DownloadButton[];
  downloadRequestKey?: string;
  downloadRequests?: DownloadRequestMap;
  downloadFormatOptions?: DownloadFormatOption[];
  footerActions?: SlideFooterAction[];
  footerContentLabel?: string;
  footerTransparentUntilExpanded?: boolean;
  textPanelSongModeLabel?: string;
  actionBarOrder?: ActionBarOrder;
  nextLabel?: string;
  backLabel?: string;
  backGoto?: string;
  showBack?: boolean;
  showNext?: boolean;
  countStep?: boolean;
  showStepText?: boolean;
  showProgressBar?: boolean;
  progressPlacement?: SlideProgressPlacement;
  showReturnHome?: boolean;
  showCancel?: boolean;
  showAuthControls?: boolean;
  syncUrl?: boolean;
  titlePlacement?: SlideTitlePlacement;
  cancelGoto?: string;
  storeAs?: string;
  showIf?: ShowIfRule;
  showIfRules?: ConditionRule[];
  goto?: string;
  run?: string;
  downloadKey?: string;
  feature?: SlideFeature;
  sections?: SlideSection[];
  fields?: FormField[];
  routeRules?: SlideRouteRule[];
  backRouteRules?: SlideRouteRule[];
  buttonStyleKey?: string;
  backStyleKey?: string;
  nextStyleKey?: string;
  mediaUrl?: string;
  embedUrl?: string;
  annotatedTextSourceUrl?: string;
  annotatedTextMode?: AnnotatedTextMode;
  annotationCatalogKey?: string;
  textPanelEnabled?: boolean;
  textPanelSongMediaUrl?: string;
  textPanelLinesMediaUrl?: string;
  mediaType?: MediaType;
  mediaAspect?: MediaAspect;
  autoplay?: boolean;
  progressMode?: SlideProgressMode;
  videoRoutes?: VideoRoute[];
  videoStartAtSeconds?: number;
  videoResumeMode?: VideoResumeMode;
  pageBackgroundColor?: string;
  pageBackgroundImage?: string;
  pageBackgroundSize?: string;
  pageBackgroundPosition?: string;
  cardOpacity?: number;
  catalogKey?: string;
  shopMode?: ShopMode;
  deliveryGoto?: string;
  contactGoto?: string;
  reviewGoto?: string;
  ticketGoto?: string;
  mealGoto?: string;
  mealMenuKey?: string;
  deliveryConfigKey?: string;
  completionCheck?: "contact";
  gotoIfComplete?: string;
  gotoIfIncomplete?: string;
  contactMode?: ContactMode;
  authFormKey?: string;
  signupTags?: string[];
  signupSource?: string;
  dripSequenceKey?: string;
  dripUnlockKey?: string;
  requiresDripUnlock?: boolean;
  dripCountdownSequenceKey?: string;
  progressOverlayBackgroundColor?: string;
  actionBarBackgroundColor?: string;
  progressOverlayTextColor?: string;
  actionBarTextColor?: string;
  recordSourceKey?: string;
  recordTitleField?: string;
  recordSubtitleField?: string;
  recordMetaFields?: string[];
  recordEmptyText?: string;
  blockKey?: string;
  blockSourceKey?: string;
};

export type ThemeConfig = {
  colors: {
    background: string;
    card: string;
    text: string;
    primary: string;
    primaryHover: string;
    soft: string;
    border: string;
    disabled: string;
    accent?: string;
    subtitle?: string;
    lineColors?: Record<string, string>;
    cardAlt?: string;
  };
  radius?: {
    card?: string;
    button?: string;
    option?: string;
  };
  shadow?: {
    card?: string;
  };
};

export type QuestionnaireConfig = {
  slug: string;
  name: string;
  themeKey: string;
  slides: Slide[];
  variables?: QuestionnaireVariableMap;
  dynamicVariablesEndpoint?: string;
  showStepText?: boolean;
  overlayMode?: "transparent" | "opaque";
  blocks?: Record<string, DataBlockDefinition>;
};

export type LeadFormData = {
  fullName: string;
  email: string;
  phone: string;
  whatsappOptIn: boolean;
};

export type ParsedSlideDraft = {
  id?: string;
  type?: SlideType;
  title?: string;
  subtitle?: string;
  paragraphs: string[];
  sections: SlideSection[];
  feature?: SlideFeature;
  storeAs?: string;
  backLabel?: string;
  backGoto?: string;
  showBack?: boolean;
  showNext?: boolean;
  nextLabel?: string;
  countStep?: boolean;
  showStepText?: boolean;
  showProgressBar?: boolean;
  progressPlacement?: SlideProgressPlacement;
  showReturnHome?: boolean;
  showCancel?: boolean;
  showAuthControls?: boolean;
  syncUrl?: boolean;
  titlePlacement?: SlideTitlePlacement;
  cancelGoto?: string;
  goto?: string;
  run?: string;
  downloadKey?: string;
  downloadButtons?: DownloadButton[];
  downloadRequestKey?: string;
  downloadRequests?: DownloadRequestMap;
  downloadFormatOptions?: DownloadFormatOption[];
  footerActions?: SlideFooterAction[];
  footerContentLabel?: string;
  footerTransparentUntilExpanded?: boolean;
  textPanelSongModeLabel?: string;
  actionBarOrder?: ActionBarOrder;
  fields?: FormField[];
  choices?: ChoiceItem[];
  choicePlacement?: ChoicePlacement;
  routeRules?: SlideRouteRule[];
  backRouteRules?: SlideRouteRule[];
  showIfRules?: ConditionRule[];
  buttonStyleKey?: string;
  backStyleKey?: string;
  nextStyleKey?: string;
  mediaUrl?: string;
  embedUrl?: string;
  annotatedTextSourceUrl?: string;
  annotatedTextMode?: AnnotatedTextMode;
  annotationCatalogKey?: string;
  textPanelEnabled?: boolean;
  textPanelSongMediaUrl?: string;
  textPanelLinesMediaUrl?: string;
  mediaType?: MediaType;
  mediaAspect?: MediaAspect;
  autoplay?: boolean;
  progressMode?: SlideProgressMode;
  videoRoutes?: VideoRoute[];
  videoStartAtSeconds?: number;
  videoResumeMode?: VideoResumeMode;
  pageBackgroundColor?: string;
  pageBackgroundImage?: string;
  pageBackgroundSize?: string;
  pageBackgroundPosition?: string;
  cardOpacity?: number;
  catalogKey?: string;
  shopMode?: ShopMode;
  deliveryGoto?: string;
  contactGoto?: string;
  reviewGoto?: string;
  ticketGoto?: string;
  mealGoto?: string;
  mealMenuKey?: string;
  deliveryConfigKey?: string;
  completionCheck?: "contact";
  gotoIfComplete?: string;
  gotoIfIncomplete?: string;
  contactMode?: ContactMode;
  authFormKey?: string;
  signupTags?: string[];
  signupSource?: string;
  dripSequenceKey?: string;
  dripUnlockKey?: string;
  requiresDripUnlock?: boolean;
  dripCountdownSequenceKey?: string;
  progressOverlayBackgroundColor?: string;
  actionBarBackgroundColor?: string;
  progressOverlayTextColor?: string;
  actionBarTextColor?: string;
  recordSourceKey?: string;
  recordTitleField?: string;
  recordSubtitleField?: string;
  recordMetaFields?: string[];
    recordEmptyText?: string;
  blockKey?: string;
  blockSourceKey?: string;
};

export type ParsedQuestionnaireDocument = {
  slides: Slide[];
};
