import type { ProfileFormSectionKey } from "./sectionRegistry";

export type ProfileFormFieldInputType =
  | "short_text"
  | "long_text"
  | "number"
  | "boolean"
  | "single_select"
  | "multi_select"
  | "radio"
  | "checkboxes"
  | "tags"
  | "group"
  | "repeater";

export type ProfileFormAppliesTo =
  | "all"
  | "plant"
  | "plant_part"
  | "substrate"
  | "container"
  | "water"
  | "environment"
  | "tool"
  | "pest_threat"
  | "sellable_item";

export type ProfileFormFieldOption = {
  value: string;
  label: string;
};

export type ProfileFormFieldDefinition = {
  name: string;
  label: string;
  section: ProfileFormSectionKey;
  inputType: ProfileFormFieldInputType;
  appliesTo: ProfileFormAppliesTo[];
  repeatable?: boolean;
  required?: boolean;
  description?: string;
  options?: ProfileFormFieldOption[];
  children?: ProfileFormFieldDefinition[];
  showWhen?: {
    field: string;
    equals: string | boolean | number;
  };
};