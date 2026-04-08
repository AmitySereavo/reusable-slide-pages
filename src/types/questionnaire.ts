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

export type ShopPurchaseMode = {
  id: string;
  label: string;
  priceAdjustment: number;
};

export type ShopCatalogSizeOption = {
  id: string;
  label: string;
  price: number;
  weight?: number;
  purchaseModes?: ShopPurchaseMode[];
};

export type ShopCatalogProduct = {
  id: string;
  slug?: string;
  title: string;
  imageUrl?: string;
  description?: string;
  sizeOptions: ShopCatalogSizeOption[];
};

export type ShopCatalog = {
  currencyCode?: string;
  weightUnit?: string;
  products: ShopCatalogProduct[];
};

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
  purchaseModeId?: string;
  unitPriceOverride?: number;
  compareAtUnitPrice?: number;
  discountLabel?: string;
  isComplimentaryGift?: boolean;
  lockedQuantity?: boolean;
  lockedPurchaseMode?: boolean;
};

export type ShopCart = Record<string, ShopCartLine>;

export type ShopResolvedCartLine = {
  lineKey: string;
  productId: string;
  productTitle: string;
  productImageUrl?: string;
  sizeOptionId: string;
  sizeLabel: string;
  quantity: number;
  purchaseModeId?: string;
  purchaseModeLabel?: string;
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
  deliveryFeeJmd?: number;
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
  | "delivery";

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
  nextLabel?: string;
  backLabel?: string;
  backGoto?: string;
  showBack?: boolean;
  showNext?: boolean;
  countStep?: boolean;
  showStepText?: boolean;
  storeAs?: string;
  showIf?: ShowIfRule;
  showIfRules?: ConditionRule[];
  goto?: string;
  run?: string;
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
  mediaType?: MediaType;
  mediaAspect?: MediaAspect;
  autoplay?: boolean;
  pageBackgroundColor?: string;
  pageBackgroundImage?: string;
  pageBackgroundSize?: string;
  pageBackgroundPosition?: string;
  cardOpacity?: number;
  catalogKey?: string;
  shopMode?: ShopMode;
  deliveryGoto?: string;
  reviewGoto?: string;
  deliveryConfigKey?: string;
  completionCheck?: "contact";
  gotoIfComplete?: string;
  gotoIfIncomplete?: string;
  contactMode?: ContactMode;
  progressOverlayBackgroundColor?: string;
  actionBarBackgroundColor?: string;
  progressOverlayTextColor?: string;
  actionBarTextColor?: string;
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
  goto?: string;
  run?: string;
  fields?: FormField[];
  choices?: ChoiceItem[];
  routeRules?: SlideRouteRule[];
  backRouteRules?: SlideRouteRule[];
  showIfRules?: ConditionRule[];
  buttonStyleKey?: string;
  backStyleKey?: string;
  nextStyleKey?: string;
  mediaUrl?: string;
  embedUrl?: string;
  mediaType?: MediaType;
  mediaAspect?: MediaAspect;
  autoplay?: boolean;
  pageBackgroundColor?: string;
  pageBackgroundImage?: string;
  pageBackgroundSize?: string;
  pageBackgroundPosition?: string;
  cardOpacity?: number;
  catalogKey?: string;
  shopMode?: ShopMode;
  deliveryGoto?: string;
  reviewGoto?: string;
  deliveryConfigKey?: string;
  completionCheck?: "contact";
  gotoIfComplete?: string;
  gotoIfIncomplete?: string;
  contactMode?: ContactMode;
  progressOverlayBackgroundColor?: string;
  actionBarBackgroundColor?: string;
  progressOverlayTextColor?: string;
  actionBarTextColor?: string;
};

export type ParsedQuestionnaireDocument = {
  slides: Slide[];
};