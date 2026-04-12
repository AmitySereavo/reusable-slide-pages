export const profileFormSectionOrder = [
  "profileScope",
  "identity",
  "sensoryOutput",
  "physicalForm",
  "visualDescription",
  "touchDescription",
  "composition",
  "consumption",
  "productionOutput",
  "timeDuration",
  "environment",
  "phProfile",
  "temperatureProfile",
  "stressResponse",
  "weaknesses",
  "effectsBenefitsHarms",
  "controlMaintenance",
  "costEffort",
  "appliedValue",
] as const;

export type ProfileFormSectionKey = (typeof profileFormSectionOrder)[number];

export type ProfileFormSectionDefinition = {
  key: ProfileFormSectionKey;
  title: string;
  description?: string;
};

export const profileFormSections: Record<
  ProfileFormSectionKey,
  ProfileFormSectionDefinition
> = {
  profileScope: {
    key: "profileScope",
    title: "Profile Scope",
    description: "Defines the profile type, purpose, completeness, and target part.",
  },
  identity: {
    key: "identity",
    title: "Identity",
    description: "Basic identifying details for the item or part.",
  },
  sensoryOutput: {
    key: "sensoryOutput",
    title: "Sensory Output",
    description: "Scent, sound, visible effects, and attraction/repelling behavior.",
  },
  physicalForm: {
    key: "physicalForm",
    title: "Physical Form",
    description: "Shape, dimensions, weight, volume, density, and growth habit.",
  },
  visualDescription: {
    key: "visualDescription",
    title: "Visual Description",
    description: "Visual patterns, colors, markings, finish, and transparency.",
  },
  touchDescription: {
    key: "touchDescription",
    title: "Touch Description",
    description: "Texture, softness, moisture feel, and flexibility.",
  },
  composition: {
    key: "composition",
    title: "Composition",
    description: "Materials, internal contents, layers, and building blocks.",
  },
  consumption: {
    key: "consumption",
    title: "Consumption",
    description: "What the item consumes and under what conditions.",
  },
  productionOutput: {
    key: "productionOutput",
    title: "Production / Output",
    description: "What the item produces over unit and time.",
  },
  timeDuration: {
    key: "timeDuration",
    title: "Time / Duration",
    description: "Lifespan, stage, dormancy, and useful life.",
  },
  environment: {
    key: "environment",
    title: "Environment",
    description: "Ideal and current environmental conditions.",
  },
  phProfile: {
    key: "phProfile",
    title: "pH Profile",
    description: "Preferred, tolerable, harmful, and impactful pH behavior.",
  },
  temperatureProfile: {
    key: "temperatureProfile",
    title: "Temperature Profile",
    description: "Temperature ranges and reactions by temperature band.",
  },
  stressResponse: {
    key: "stressResponse",
    title: "Stress Response",
    description: "Responses to force, moisture, agitation, and related stress.",
  },
  weaknesses: {
    key: "weaknesses",
    title: "Weaknesses",
    description: "Vulnerabilities, threats, stress signs, and failure points.",
  },
  effectsBenefitsHarms: {
    key: "effectsBenefitsHarms",
    title: "Effects / Benefits / Harms",
    description: "Environmental, health, food, shelter, mobility, and leisure effects.",
  },
  controlMaintenance: {
    key: "controlMaintenance",
    title: "Control / Maintenance",
    description: "Add/remove interventions, frequency, purpose, and outcomes.",
  },
  costEffort: {
    key: "costEffort",
    title: "Cost / Effort",
    description: "Time, money, labor, skill, and monitoring needs.",
  },
  appliedValue: {
    key: "appliedValue",
    title: "Applied Value",
    description: "Practical uses, benefits, ad-copy angles, and warnings.",
  },
};