import type { ProfileFormFieldDefinition } from "../schema/fieldTypes";

const dimensionUnitOptions = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "m", label: "m" },
  { value: "in", label: "in" },
  { value: "ft", label: "ft" },
];

const weightUnitOptions = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
];

const volumeUnitOptions = [
  { value: "ml", label: "mL" },
  { value: "l", label: "L" },
  { value: "cm3", label: "cm³" },
  { value: "m3", label: "m³" },
  { value: "gal", label: "gal" },
];

export const physicalFormSectionFields: ProfileFormFieldDefinition[] = [
  {
    name: "shape",
    label: "Shape",
    section: "physicalForm",
    inputType: "short_text",
    appliesTo: ["all"],
  },
  {
    name: "widthValue",
    label: "Width value",
    section: "physicalForm",
    inputType: "number",
    appliesTo: ["all"],
  },
  {
    name: "widthUnit",
    label: "Width unit",
    section: "physicalForm",
    inputType: "single_select",
    appliesTo: ["all"],
    options: dimensionUnitOptions,
  },
  {
    name: "lengthValue",
    label: "Length value",
    section: "physicalForm",
    inputType: "number",
    appliesTo: ["all"],
  },
  {
    name: "lengthUnit",
    label: "Length unit",
    section: "physicalForm",
    inputType: "single_select",
    appliesTo: ["all"],
    options: dimensionUnitOptions,
  },
  {
    name: "depthHeightValue",
    label: "Depth / height value",
    section: "physicalForm",
    inputType: "number",
    appliesTo: ["all"],
  },
  {
    name: "depthHeightUnit",
    label: "Depth / height unit",
    section: "physicalForm",
    inputType: "single_select",
    appliesTo: ["all"],
    options: dimensionUnitOptions,
  },
  {
    name: "weightValue",
    label: "Weight value",
    section: "physicalForm",
    inputType: "number",
    appliesTo: ["all"],
  },
  {
    name: "weightUnit",
    label: "Weight unit",
    section: "physicalForm",
    inputType: "single_select",
    appliesTo: ["all"],
    options: weightUnitOptions,
  },
  {
    name: "volumeValue",
    label: "Volume value",
    section: "physicalForm",
    inputType: "number",
    appliesTo: ["all"],
  },
  {
    name: "volumeUnit",
    label: "Volume unit",
    section: "physicalForm",
    inputType: "single_select",
    appliesTo: ["all"],
    options: volumeUnitOptions,
  },
  {
    name: "density",
    label: "Density",
    section: "physicalForm",
    inputType: "short_text",
    appliesTo: ["all"],
  },
  {
    name: "growthHabitStructuralForm",
    label: "Growth habit / structural form",
    section: "physicalForm",
    inputType: "checkboxes",
    appliesTo: ["plant", "plant_part"],
    options: [
      { value: "upright", label: "Upright" },
      { value: "spreading", label: "Spreading" },
      { value: "trailing", label: "Trailing" },
      { value: "climbing", label: "Climbing" },
      { value: "bushy", label: "Bushy" },
      { value: "compact", label: "Compact" },
      { value: "layered", label: "Layered" },
      { value: "creeping", label: "Creeping" },
      { value: "other", label: "Other" },
    ],
  },
  {
    name: "growthHabitOther",
    label: "Other growth habit / structural form",
    section: "physicalForm",
    inputType: "short_text",
    appliesTo: ["plant", "plant_part"],
    showWhen: {
      field: "growthHabitStructuralForm",
      equals: "other",
    },
  },
];