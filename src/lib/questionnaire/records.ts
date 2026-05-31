import type {
  DataBlockRow,
  PrimitiveValue,
  QuestionnaireAnswers,
  QuestionnaireVariableMap,
  QuestionnaireVariableValue,
  RecordListItem,
  SlideRouteRule,
} from "@/types/questionnaire";
import { evaluateConditionRule } from "@/lib/questionnaire/engine";

export function getRecordArray(
  variables: QuestionnaireVariableMap,
  key: string
): Array<Record<string, QuestionnaireVariableValue>> {
  const raw = variables[key];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(
    (item): item is Record<string, QuestionnaireVariableValue> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

export function getSelectedRecordFromSource(
  variables: QuestionnaireVariableMap,
  sourceKey: string | undefined,
  selectedValue: string
): Record<string, QuestionnaireVariableValue> | null {
  if (!sourceKey || !selectedValue) {
    return null;
  }

  const records = getRecordArray(variables, sourceKey);

  return (
    records.find((record) => {
      const value =
        typeof record.value === "string"
          ? record.value
          : typeof record.code === "string"
            ? record.code
            : typeof record.id === "string"
              ? record.id
              : "";

      return value === selectedValue;
    }) ?? null
  );
}

export function getDisplayValueFromBlockRow(row: DataBlockRow) {
  if (
    typeof row.value === "string" ||
    typeof row.value === "number" ||
    typeof row.value === "boolean"
  ) {
    return row.value;
  }

  return undefined;
}

export function formatBlockRowValue(
  row: DataBlockRow,
  value: PrimitiveValue | undefined
) {
  if (value === undefined || value === null || value === "") {
    return row.emptyText ?? "—";
  }

  if (row.format === "boolean_yes_no") {
    return value === true ? "Yes" : "No";
  }

  return String(value);
}

export function shouldShowBlockItem(
  rules: {
    showIf?: {
      field: string;
      operator: SlideRouteRule["operator"];
      value: string;
    }[];
  },
  context: QuestionnaireAnswers
) {
  if (!rules.showIf?.length) {
    return true;
  }

  return rules.showIf.every((rule) => evaluateConditionRule(rule, context));
}

export function getPrimitiveRecordValue(
  record: Record<string, QuestionnaireVariableValue> | null,
  key: string | undefined
): PrimitiveValue | undefined {
  if (!record || !key) {
    return undefined;
  }

  const value = record[key];

  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? value
    : undefined;
}

export function getRecordListItems(
  variables: QuestionnaireVariableMap,
  slide: {
    recordSourceKey?: string;
    recordTitleField?: string;
    recordSubtitleField?: string;
    recordMetaFields?: string[];
  }
): RecordListItem[] {
  if (!slide.recordSourceKey) {
    return [];
  }

  const raw = variables[slide.recordSourceKey];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, QuestionnaireVariableValue>;

      const value =
        typeof record.value === "string"
          ? record.value
          : typeof record.code === "string"
            ? record.code
            : typeof record.id === "string"
              ? record.id
              : undefined;

      if (!value) {
        return null;
      }

      const titleField = slide.recordTitleField ?? "title";
      const subtitleField = slide.recordSubtitleField ?? "subtitle";
      const metaFields = slide.recordMetaFields ?? [];

      const titleValue = record[titleField];
      const subtitleValue = record[subtitleField];

      const title =
        typeof titleValue === "string" && titleValue.trim().length > 0
          ? titleValue
          : value;

      const subtitle =
        typeof subtitleValue === "string" && subtitleValue.trim().length > 0
          ? subtitleValue
          : undefined;

      const meta = metaFields
        .map((field) => {
          const fieldValue = record[field];

          if (
            typeof fieldValue === "string" ||
            typeof fieldValue === "number" ||
            typeof fieldValue === "boolean"
          ) {
            return String(fieldValue);
          }

          return null;
        })
        .filter(Boolean) as string[];

      const childCount =
        typeof record.childCount === "number" ? record.childCount : undefined;

      return {
        value,
        title,
        subtitle,
        meta: meta.length ? meta : undefined,
        childCount,
      };
    })
    .filter(Boolean) as RecordListItem[];
}