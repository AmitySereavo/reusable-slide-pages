export type PrimitiveValue = string | number | boolean;

export type QuestionnaireVariables = Record<string, string | number>;

export type Option = {
  label: string;
  value: PrimitiveValue;
  disabled?: boolean;
};

export type ChoiceItem = {
  value: PrimitiveValue;
  label: string;
  goto?: string;
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

export type FieldType = "text" | "email" | "tel" | "checkbox" | "textarea";

export type FormField = {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
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

export type SlideType =
  | "score"
  | "content"
  | "contact"
  | "choice"
  | "result"
  | "story"
  | "form"
  | "video";

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
  variables?: QuestionnaireVariables;
};

export type QuestionnaireAnswers = Record<string, PrimitiveValue>;

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
  goto?: string;
  run?: string;
  fields?: FormField[];
  choices?: ChoiceItem[];
  routeRules?: SlideRouteRule[];
  backRouteRules?: SlideRouteRule[];
  showIfRules?: ConditionRule[];
};

export type ParsedQuestionnaireDocument = {
  slides: Slide[];
};