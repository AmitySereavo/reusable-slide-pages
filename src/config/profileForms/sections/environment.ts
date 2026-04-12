import type { ProfileFormFieldDefinition } from "../schema/fieldTypes";

const buildEnvironmentGroup = (
  name: string,
  label: string
): ProfileFormFieldDefinition => ({
  name,
  label,
  section: "environment",
  inputType: "group",
  appliesTo: ["all"],
  children: [
    {
      name: `${name}Light`,
      label: "Light",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}Temperature`,
      label: "Temperature",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}MoistureHumidity`,
      label: "Moisture / humidity",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}Airflow`,
      label: "Airflow",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}IsolationExposure`,
      label: "Isolation / exposure",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}PressureCrowding`,
      label: "Pressure / crowding",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}NeighboringOrganisms`,
      label: "Neighboring organisms",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}SoilSubstrateCondition`,
      label: "Soil / substrate condition",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}ContainerCondition`,
      label: "Container condition",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}WaterQuality`,
      label: "Water quality",
      section: "environment",
      inputType: "long_text",
      appliesTo: ["all"],
    },
    {
      name: `${name}PhLevel`,
      label: "pH level",
      section: "environment",
      inputType: "short_text",
      appliesTo: ["all"],
    },
  ],
});

export const environmentSectionFields: ProfileFormFieldDefinition[] = [
  buildEnvironmentGroup("idealEnvironment", "Ideal environment"),
  buildEnvironmentGroup("currentEnvironment", "Current environment"),
];