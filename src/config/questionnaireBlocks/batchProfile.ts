import { DataBlockDefinition } from "@/types/questionnaire";

export function buildBatchProfileBlock(): DataBlockDefinition {
  return {
    key: "batchProfile",
    sourceKey: "nurseryBatches",
    sections: [
      {
        key: "batch-summary",
        rows: [
          {
            key: "batch-code",
            label: "Batch code",
            valueField: "code",
            emptyText: "—",
          },
          {
            key: "plant-name",
            label: "Plant",
            valueField: "plantName",
            emptyText: "—",
          },
          {
            key: "start-date",
            label: "Start date",
            valueField: "startDate",
            emptyText: "—",
          },
          {
            key: "start-method",
            label: "Start method",
            valueField: "startMethod",
            emptyText: "—",
          },
          {
            key: "quantity-started",
            label: "Quantity started",
            valueField: "quantityStarted",
          },
          {
            key: "quantity-alive",
            label: "Quantity alive",
            valueField: "quantityAlive",
          },
          {
            key: "quantity-lost",
            label: "Quantity lost",
            valueField: "quantityLost",
          },
          {
            key: "quantity-transplanted",
            label: "Quantity transplanted",
            valueField: "quantityTransplanted",
          },
        ],
      },
      {
        key: "commercial-summary",
        rows: [
          {
            key: "intended-use",
            label: "Intended use",
            valueField: "intendedUse",
            emptyText: "—",
          },
          {
            key: "target-buyer",
            label: "Target buyer",
            valueField: "targetBuyerType",
            emptyText: "—",
          },
          {
            key: "labeled-for-sale",
            label: "Labeled for sale",
            valueField: "labeledForSale",
            format: "boolean_yes_no",
          },
        ],
      },
      {
        key: "container-summary",
        rows: [
          {
            key: "container-type",
            label: "Container type",
            valueField: "containerType",
            emptyText: "—",
          },
          {
            key: "container-quantity",
            label: "Container quantity",
            valueField: "containerQuantity",
          },
          {
            key: "container-description",
            label: "Container description",
            valueField: "containerDescription",
            emptyText: "—",
          },
        ],
      },
      {
        key: "medium-location-summary",
        rows: [
          {
            key: "medium-name",
            label: "Medium",
            valueField: "mediumName",
            emptyText: "—",
          },
          {
            key: "medium-quality",
            label: "Medium quality",
            valueField: "mediumQuality",
            emptyText: "—",
          },
          {
            key: "location-code",
            label: "Location code",
            valueField: "locationCode",
            emptyText: "—",
          },
          {
            key: "location-description",
            label: "Location description",
            valueField: "locationDescription",
            emptyText: "—",
          },
        ],
      },
      {
        key: "source-summary",
        rows: [
          {
            key: "source-name",
            label: "Source name",
            valueField: "sourceName",
            emptyText: "—",
          },
          {
            key: "source-notes",
            label: "Source notes",
            valueField: "sourceNotes",
            emptyText: "—",
          },
          {
            key: "start-notes",
            label: "Start notes",
            valueField: "startNotes",
            emptyText: "—",
          },
          {
            key: "commercial-notes",
            label: "Commercial notes",
            valueField: "commercialNotes",
            emptyText: "—",
          },
        ],
      },
    ],
    actions: [
      {
        key: "record-transplant",
        label: "Record Transplant",
        kind: "goto",
        target: "transplant-details",
        styleKey: "c1",
        showIf: [
          {
            field: "batchIndividualsVisible",
            operator: "neq",
            value: "true",
          },
        ],
      },
      {
        key: "view-individuals",
        label: "View Individuals",
        kind: "goto",
        target: "batch-individuals-list",
        styleKey: "primary",
        showIf: [
          {
            field: "batchIndividualsVisible",
            operator: "eq",
            value: "true",
          },
        ],
      },
      {
        key: "log-batch-activity",
        label: "Log Batch Activity",
        kind: "goto",
        target: "activity-batch-select",
        styleKey: "c2",
      },
      {
        key: "delete-batch",
        label: "Delete Batch",
        kind: "delete_record",
        deleteEndpoint: "/api/questionnaires/nursery-ops/batches",
        deleteIdField: "id",
        deleteCodeField: "code",
        deleteIdPayloadKey: "batchId",
        deleteCodePayloadKey: "batchCode",
        deleteConfirmationPayloadKey: "confirmation",
        deleteSuccessGoto: "batches-list",
        deleteRefreshSources: ["nurseryBatches", "nurseryBatchPlants"],
        deleteClearAnswerKeys: ["opsSelectedBatchCode", "opsSelectedPlantCode"],
        confirmationPhrase: "delete batch",
        styleKey: "c3",
      },
    ],
  };
}

export function buildBatchIndividualProfileBlock(): DataBlockDefinition {
  return {
    key: "batchIndividualProfile",
    sourceKey: "nurseryBatchPlants",
    sections: [
      {
        key: "individual-summary",
        rows: [
          {
            key: "individual-code",
            label: "Container code",
            valueField: "code",
            emptyText: "—",
          },
          {
            key: "batch-code",
            label: "Batch code",
            valueField: "batchCode",
            emptyText: "—",
          },
          {
            key: "plant-name",
            label: "Plant",
            valueField: "plantName",
            emptyText: "—",
          },
          {
            key: "condition-status",
            label: "Condition status",
            valueField: "conditionStatus",
            emptyText: "—",
          },
          {
            key: "location",
            label: "Location",
            valueField: "location",
            emptyText: "—",
          },
          {
            key: "label-status",
            label: "Label status",
            valueField: "labelStatus",
            emptyText: "—",
          },
        ],
      },
    ],
    actions: [
      {
        key: "record-individual-transplant",
        label: "Record Transplant",
        kind: "goto",
        target: "transplant-details",
        styleKey: "c1",
      },
      {
        key: "view-transplanted",
        label: "View Transplanted",
        kind: "goto",
        target: "transplanted-individuals-list",
        styleKey: "primary",
        showIf: [
          {
            field: "hasTransplantedIndividuals",
            operator: "eq",
            value: "true",
          },
        ],
      },
      {
        key: "log-individual-activity",
        label: "Log Individual Activity",
        kind: "goto",
        target: "activity-batch-select",
        styleKey: "c2",
      },
    ],
  };
}

export function buildQuestionnaireBlocks(): Record<string, DataBlockDefinition> {
  return {
    batchProfile: buildBatchProfileBlock(),
    batchIndividualProfile: buildBatchIndividualProfileBlock(),
  };
}