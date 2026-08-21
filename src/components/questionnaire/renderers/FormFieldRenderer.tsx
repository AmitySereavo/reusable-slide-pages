"use client";

import type {
  FormField,
  QuestionnaireAnswers,
  QuestionnaireVariableMap,
  QuestionnaireVariableValue,
  ThemeConfig,
} from "@/types/questionnaire";
import { useEffect, useState } from "react";
import {
  getPasswordRequirementResults,
  getPasswordStrength,
} from "@/customerAccess/utils/passwordPolicy";
import { replaceDynamicText } from "@/lib/questionnaire/dynamicText";
import styles from "../QuestionnaireShell.module.css";

const COPYABLE_INFO_FIELD_NAMES = new Set([
  "paymentScotiaDetails",
  "paymentNcbDetails",
]);

const INVITATION_REGION_OPTIONS_BY_COUNTRY: Record<string, string[]> = {
  jamaica: [
    "kingston",
    "st-andrew",
    "st-catherine",
    "clarendon",
    "manchester",
    "st-elizabeth",
    "westmoreland",
    "hanover",
    "st-james",
    "trelawny",
    "st-ann",
    "st-mary",
    "portland",
    "st-thomas",
  ],
  "united-kingdom": [
    "uk-london",
    "uk-west-midlands",
    "uk-north-west",
    "uk-south-west",
    "uk-east-midlands",
    "uk-east-of-england",
    "uk-north-east",
    "uk-south-east",
    "uk-yorkshire-humber",
    "uk-scotland",
    "uk-wales",
    "uk-northern-ireland",
  ],
  "united-states": [
    "us-alabama",
    "us-alaska",
    "us-arizona",
    "us-arkansas",
    "california",
    "us-colorado",
    "us-connecticut",
    "us-delaware",
    "us-district-of-columbia",
    "florida",
    "georgia",
    "us-hawaii",
    "us-idaho",
    "us-illinois",
    "us-indiana",
    "us-iowa",
    "us-kansas",
    "us-kentucky",
    "us-louisiana",
    "us-maine",
    "us-maryland",
    "us-massachusetts",
    "us-michigan",
    "us-minnesota",
    "us-mississippi",
    "us-missouri",
    "us-montana",
    "us-nebraska",
    "us-nevada",
    "us-new-hampshire",
    "us-new-jersey",
    "us-new-mexico",
    "new-york",
    "us-north-carolina",
    "us-north-dakota",
    "us-ohio",
    "us-oklahoma",
    "us-oregon",
    "us-pennsylvania",
    "us-rhode-island",
    "us-south-carolina",
    "us-south-dakota",
    "us-tennessee",
    "texas",
    "us-utah",
    "us-vermont",
    "us-virginia",
    "us-washington",
    "us-west-virginia",
    "us-wisconsin",
    "us-wyoming",
    "us-american-samoa",
    "us-guam",
    "us-northern-mariana-islands",
    "us-puerto-rico",
    "us-virgin-islands",
  ],
  france: [
    "fr-auvergne-rhone-alpes",
    "fr-bourgogne-franche-comte",
    "fr-brittany",
    "fr-centre-val-de-loire",
    "fr-corsica",
    "fr-grand-est",
    "fr-hauts-de-france",
    "fr-ile-de-france",
    "fr-normandy",
    "fr-nouvelle-aquitaine",
    "fr-occitanie",
    "fr-pays-de-la-loire",
    "fr-provence-alpes-cote-dazur",
    "fr-guadeloupe",
    "fr-french-guiana",
    "fr-martinique",
    "fr-mayotte",
    "fr-reunion",
  ],
  germany: [
    "de-baden-wurttemberg",
    "de-bavaria",
    "de-berlin",
    "de-brandenburg",
    "de-bremen",
    "de-hamburg",
    "de-hesse",
    "de-lower-saxony",
    "de-mecklenburg-vorpommern",
    "de-north-rhine-westphalia",
    "de-rhineland-palatinate",
    "de-saarland",
    "de-saxony",
    "de-saxony-anhalt",
    "de-schleswig-holstein",
    "de-thuringia",
  ],
  canada: [
    "ca-alberta",
    "british-columbia",
    "ca-manitoba",
    "ca-new-brunswick",
    "ca-newfoundland-and-labrador",
    "ca-northwest-territories",
    "ca-nova-scotia",
    "ca-nunavut",
    "ontario",
    "ca-prince-edward-island",
    "quebec",
    "ca-saskatchewan",
    "ca-yukon",
  ],
  netherlands: [
    "nl-drenthe",
    "nl-flevoland",
    "nl-friesland",
    "nl-gelderland",
    "nl-groningen",
    "nl-limburg",
    "nl-north-brabant",
    "nl-north-holland",
    "nl-overijssel",
    "nl-south-holland",
    "nl-utrecht",
    "nl-zeeland",
  ],
  spain: [
    "es-andalusia",
    "es-aragon",
    "es-asturias",
    "es-balearic-islands",
    "es-canary-islands",
    "es-cantabria",
    "es-castile-and-leon",
    "es-castile-la-mancha",
    "es-catalonia",
    "es-valencian-community",
    "es-extremadura",
    "es-galicia",
    "es-community-of-madrid",
    "es-region-of-murcia",
    "es-navarre",
    "es-basque-country",
    "es-la-rioja",
    "es-ceuta",
    "es-melilla",
  ],
  japan: [
    "jp-hokkaido",
    "jp-aomori",
    "jp-iwate",
    "jp-miyagi",
    "jp-akita",
    "jp-yamagata",
    "jp-fukushima",
    "jp-ibaraki",
    "jp-tochigi",
    "jp-gunma",
    "jp-saitama",
    "jp-chiba",
    "tokyo",
    "jp-kanagawa",
    "jp-niigata",
    "jp-toyama",
    "jp-ishikawa",
    "jp-fukui",
    "jp-yamanashi",
    "jp-nagano",
    "jp-gifu",
    "jp-shizuoka",
    "jp-aichi",
    "jp-mie",
    "jp-shiga",
    "jp-kyoto",
    "osaka",
    "jp-hyogo",
    "jp-nara",
    "jp-wakayama",
    "jp-tottori",
    "jp-shimane",
    "jp-okayama",
    "jp-hiroshima",
    "jp-yamaguchi",
    "jp-tokushima",
    "jp-kagawa",
    "jp-ehime",
    "jp-kochi",
    "jp-fukuoka",
    "jp-saga",
    "jp-nagasaki",
    "jp-kumamoto",
    "jp-oita",
    "jp-miyazaki",
    "jp-kagoshima",
    "jp-okinawa",
  ],
  ghana: [
    "gh-ahafo",
    "gh-ashanti",
    "gh-bono",
    "gh-bono-east",
    "gh-central",
    "gh-eastern",
    "gh-greater-accra",
    "gh-north-east",
    "gh-northern",
    "gh-oti",
    "gh-savannah",
    "gh-upper-east",
    "gh-upper-west",
    "gh-volta",
    "gh-western",
    "gh-western-north",
  ],
  kenya: [
    "ke-baringo",
    "ke-bomet",
    "ke-bungoma",
    "ke-busia",
    "ke-elgeyo-marakwet",
    "ke-embu",
    "ke-garissa",
    "ke-homa-bay",
    "ke-isiolo",
    "ke-kajiado",
    "ke-kakamega",
    "ke-kericho",
    "ke-kiambu",
    "ke-kilifi",
    "ke-kirinyaga",
    "ke-kisii",
    "ke-kisumu",
    "ke-kitui",
    "ke-kwale",
    "ke-laikipia",
    "ke-lamu",
    "ke-machakos",
    "ke-makueni",
    "ke-mandera",
    "ke-marsabit",
    "ke-meru",
    "ke-migori",
    "ke-mombasa",
    "ke-muranga",
    "ke-nairobi-city",
    "ke-nakuru",
    "ke-nandi",
    "ke-narok",
    "ke-nyamira",
    "ke-nyandarua",
    "ke-nyeri",
    "ke-samburu",
    "ke-siaya",
    "ke-taita-taveta",
    "ke-tana-river",
    "ke-tharaka-nithi",
    "ke-trans-nzoia",
    "ke-turkana",
    "ke-uasin-gishu",
    "ke-vihiga",
    "ke-wajir",
    "ke-west-pokot",
  ],
  brazil: [
    "br-acre",
    "br-alagoas",
    "br-amapa",
    "br-amazonas",
    "br-bahia",
    "br-ceara",
    "br-distrito-federal",
    "br-espirito-santo",
    "br-goias",
    "br-maranhao",
    "br-mato-grosso",
    "br-mato-grosso-do-sul",
    "br-minas-gerais",
    "br-para",
    "br-paraiba",
    "br-parana",
    "br-pernambuco",
    "br-piaui",
    "br-rio-grande-do-norte",
    "br-rio-de-janeiro",
    "br-rio-grande-do-sul",
    "br-rondonia",
    "br-roraima",
    "br-santa-catarina",
    "br-sao-paulo",
    "br-sergipe",
    "br-tocantins",
  ],
  "south-africa": [
    "za-eastern-cape",
    "za-free-state",
    "za-gauteng",
    "za-kwazulu-natal",
    "za-limpopo",
    "za-mpumalanga",
    "za-north-west",
    "za-northern-cape",
    "za-western-cape",
  ],
  belgium: [
    "be-antwerp",
    "be-east-flanders",
    "be-flemish-brabant",
    "be-limburg",
    "be-west-flanders",
    "be-hainaut",
    "be-liege",
    "be-luxembourg",
    "be-namur",
    "be-walloon-brabant",
    "be-brussels-capital-region",
  ],
  nigeria: [
    "ng-abia",
    "ng-adamawa",
    "ng-akwa-ibom",
    "ng-anambra",
    "ng-bauchi",
    "ng-bayelsa",
    "ng-benue",
    "ng-borno",
    "ng-cross-river",
    "ng-delta",
    "ng-ebonyi",
    "ng-edo",
    "ng-ekiti",
    "ng-enugu",
    "ng-federal-capital-territory-abuja",
    "ng-gombe",
    "ng-imo",
    "ng-jigawa",
    "ng-kaduna",
    "ng-kano",
    "ng-katsina",
    "ng-kebbi",
    "ng-kogi",
    "ng-kwara",
    "ng-lagos",
    "ng-nasarawa",
    "ng-niger",
    "ng-ogun",
    "ng-ondo",
    "ng-osun",
    "ng-oyo",
    "ng-plateau",
    "ng-rivers",
    "ng-sokoto",
    "ng-taraba",
    "ng-yobe",
    "ng-zamfara",
  ],
  switzerland: [
    "ch-aargau",
    "ch-appenzell-ausserrhoden",
    "ch-appenzell-innerrhoden",
    "ch-basel-landschaft",
    "ch-basel-stadt",
    "ch-bern",
    "ch-fribourg",
    "ch-geneva",
    "ch-glarus",
    "ch-graubunden",
    "ch-jura",
    "ch-lucerne",
    "ch-neuchatel",
    "ch-nidwalden",
    "ch-obwalden",
    "ch-schaffhausen",
    "ch-schwyz",
    "ch-solothurn",
    "ch-st-gallen",
    "ch-thurgau",
    "ch-ticino",
    "ch-uri",
    "ch-vaud",
    "ch-valais",
    "ch-zug",
    "ch-zurich",
  ],
  italy: [
    "it-abruzzo",
    "it-aosta-valley",
    "it-apulia",
    "it-basilicata",
    "it-calabria",
    "it-campania",
    "it-emilia-romagna",
    "it-friuli-venezia-giulia",
    "it-lazio",
    "it-liguria",
    "it-lombardy",
    "it-marche",
    "it-molise",
    "it-piedmont",
    "it-sardinia",
    "it-sicily",
    "it-trentino-alto-adige",
    "it-tuscany",
    "it-umbria",
    "it-veneto",
  ],
  sweden: [
    "se-blekinge",
    "se-dalarna",
    "se-gavleborg",
    "se-gotland",
    "se-halland",
    "se-jamtland",
    "se-jonkoping",
    "se-kalmar",
    "se-kronoberg",
    "se-norrbotten",
    "se-orebro",
    "se-ostergotland",
    "se-skane",
    "se-sodermanland",
    "se-stockholm",
    "se-uppsala",
    "se-varmland",
    "se-vasterbotten",
    "se-vasternorrland",
    "se-vastmanland",
    "se-vastra-gotaland",
  ],
  australia: [
    "au-australian-capital-territory",
    "au-new-south-wales",
    "au-northern-territory",
    "au-queensland",
    "au-south-australia",
    "au-tasmania",
    "au-victoria",
    "au-western-australia",
  ],
  "new-zealand": [
    "nz-northland",
    "nz-auckland",
    "nz-waikato",
    "nz-bay-of-plenty",
    "nz-gisborne",
    "nz-hawkes-bay",
    "nz-taranaki",
    "nz-manawatu-whanganui",
    "nz-wellington",
    "nz-tasman",
    "nz-nelson",
    "nz-marlborough",
    "nz-west-coast",
    "nz-canterbury",
    "nz-otago",
    "nz-southland",
  ],
  "trinidad-and-tobago": [
    "tt-port-of-spain",
    "tt-san-fernando",
    "tt-arima",
    "tt-chaguanas",
    "tt-diego-martin",
    "tt-point-fortin",
    "tt-siparia",
    "tt-couva-tabaquite-talparo",
    "tt-mayaro-rio-claro",
    "tt-penal-debe",
    "tt-princes-town",
    "tt-sangre-grande",
    "tt-san-juan-laventille",
    "tt-tunapuna-piarco",
    "tt-tobago",
  ],
  china: ["beijing", "shanghai", "other-region"],
  other: ["other-region"],
};

type FormFieldRendererProps = {
  field: FormField;
  theme: ThemeConfig;
  answers: QuestionnaireAnswers;
  variables?: QuestionnaireVariableMap;
  setAnswer: (key: string, value: QuestionnaireVariableValue) => void;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
  errorMessage?: string;
};

function renderInlineLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (!match) {
      return part;
    }

    const [, label, href] = match;

    return (
      <a
        key={`${href}-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    );
  });
}

function renderInfoText(text: string) {
  const lines = text
    .split(/\s*;;\s*/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return <span>{renderInlineLinks(text)}</span>;
  }

  return (
    <span className={styles.fieldInfoLineStack}>
      {lines.map((line) => (
        <span key={line}>{renderInlineLinks(line)}</span>
      ))}
    </span>
  );
}

function getCopyableInfoText(text: string) {
  return text
    .split(/\s*;;\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function getVisibleSelectOptions(
  field: FormField,
  answers: QuestionnaireAnswers
) {
  if (field.name !== "parishState") {
    return field.options ?? [];
  }

  const selectedCountry = String(answers.country ?? "").trim();
  const allowedValues =
    INVITATION_REGION_OPTIONS_BY_COUNTRY[selectedCountry] ?? [];

  if (!allowedValues.length) {
    return [];
  }

  const allowedSet = new Set(allowedValues);

  return (field.options ?? []).filter((option) =>
    allowedSet.has(String(option.value))
  );
}

export default function FormFieldRenderer({
  field,
  theme,
  answers,
  variables,
  setAnswer,
  isPasswordVisible,
  onTogglePasswordVisibility,
  errorMessage,
}: FormFieldRendererProps) {
  const [copiedInfoFieldName, setCopiedInfoFieldName] = useState("");
  const [hoveredStarRating, setHoveredStarRating] = useState(0);
  const resolvedLabel =
    replaceDynamicText(field.label, answers, variables) ?? field.label;

  const resolvedPlaceholder = replaceDynamicText(
    field.placeholder ?? field.label,
    answers,
    variables
  );

  const fieldFrameStyle = {
    display: "grid",
    gap: "8px",
  } as const;

  const fieldLabelStyle = {
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: 1.35,
    color: theme.colors.text,
  } as const;

  const fieldError = errorMessage ? (
    <p className={styles.fieldError}>{errorMessage}</p>
  ) : null;

  useEffect(() => {
    if (!copiedInfoFieldName) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedInfoFieldName("");
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copiedInfoFieldName]);

  useEffect(() => {
    if (field.type !== "select" || field.name !== "parishState") {
      return;
    }

    const currentValue = String(answers[field.name] ?? "");

    if (!currentValue) {
      return;
    }

    const isVisible = getVisibleSelectOptions(field, answers).some(
      (option) => String(option.value) === currentValue
    );

    if (!isVisible) {
      setAnswer(field.name, "");
    }
  }, [answers, field, setAnswer]);

  if (field.type === "checkbox") {
    return (
      <div style={fieldFrameStyle}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={Boolean(answers[field.name] ?? false)}
            onChange={(e) => setAnswer(field.name, e.target.checked)}
          />
          {resolvedLabel}
        </label>
        {fieldError}
      </div>
    );
  }

  if (field.type === "info") {
    const canCopyInfo = COPYABLE_INFO_FIELD_NAMES.has(field.name);
    const isCopied = copiedInfoFieldName === field.name;

    return (
      <div className={styles.fieldInfoPanel}>
        <strong>{resolvedLabel}</strong>
        {resolvedPlaceholder ? (
          renderInfoText(resolvedPlaceholder)
        ) : null}
        {canCopyInfo && resolvedPlaceholder ? (
          <button
            type="button"
            className={`${styles.copyInfoButton} ${
              isCopied ? styles.copyInfoButtonCopied : ""
            }`}
            onClick={async () => {
              await navigator.clipboard?.writeText(
                getCopyableInfoText(resolvedPlaceholder)
              );
              setCopiedInfoFieldName(field.name);
            }}
          >
            {isCopied ? "Copied" : "Copy bank info"}
          </button>
        ) : null}
      </div>
    );
  }

  if (field.type === "radio") {
    const isStarRatingField =
      field.name === "performanceRating" &&
      (field.options ?? []).length === 5 &&
      (field.options ?? []).every((option) =>
        String(option.label).includes("★")
      );

    if (isStarRatingField) {
      const selectedRating = Number(answers[field.name] ?? 0);
      const previewRating = hoveredStarRating || selectedRating;

      return (
        <div className={styles.starRatingField}>
          <div className={styles.starRatingLabel}>{resolvedLabel}</div>
          <div
            className={styles.starRatingRow}
            role="radiogroup"
            aria-label={resolvedLabel}
          >
            {(field.options ?? []).map((option) => {
              const ratingValue = Number(option.value);
              const isSelected = selectedRating === ratingValue;
              const isHighlighted =
                Number.isFinite(ratingValue) && previewRating >= ratingValue;

              return (
                <button
                  key={`${field.name}-${option.value}`}
                  type="button"
                  className={`${styles.starRatingButton} ${
                    isHighlighted ? styles.starRatingButtonActive : ""
                  }`}
                  aria-pressed={isSelected}
                  onMouseEnter={() => setHoveredStarRating(ratingValue)}
                  onMouseLeave={() => setHoveredStarRating(0)}
                  onFocus={() => setHoveredStarRating(ratingValue)}
                  onBlur={() => setHoveredStarRating(0)}
                  onClick={() => setAnswer(field.name, option.value)}
                >
                  <span aria-hidden="true">★</span>
                  <span className={styles.visuallyHidden}>
                    {ratingValue} {ratingValue === 1 ? "star" : "stars"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.starRatingHelpStack}>
            <p>A star rating is needed to continue to the next slide.</p>
            <p>Comments are optional.</p>
          </div>
          {fieldError}
        </div>
      );
    }

    return (
      <div style={fieldFrameStyle}>
        <div style={fieldLabelStyle}>{resolvedLabel}</div>
        <div className={styles.radioOptionStack}>
          {(field.options ?? []).map((option) => (
            <label
              key={`${field.name}-${option.value}`}
              className={styles.radioOptionRow}
            >
              <input
                type="radio"
                name={field.name}
                value={String(option.value)}
                checked={answers[field.name] === option.value}
                onChange={() => setAnswer(field.name, option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {fieldError}
      </div>
    );
  }

  if (field.type === "multiselect") {
    const selectedValues = Array.isArray(answers[field.name])
      ? (answers[field.name] as Array<string | number | boolean>)
      : [];
    const maxSelections =
      field.name === "affiliateProductSkuSelection" ? 3 : Number.POSITIVE_INFINITY;

    return (
      <div style={fieldFrameStyle}>
        <div style={fieldLabelStyle}>{resolvedLabel}</div>
        {resolvedPlaceholder ? (
          <p className={styles.fieldHelpText}>{resolvedPlaceholder}</p>
        ) : null}
        <div className={styles.radioOptionStack}>
          {(field.options ?? []).map((option) => {
            const isSelected = selectedValues.includes(option.value);
            const hasReachedLimit =
              !isSelected && selectedValues.length >= maxSelections;

            return (
              <label
                key={`${field.name}-${option.value}`}
                className={styles.radioOptionRow}
              >
                <input
                  type="checkbox"
                  value={String(option.value)}
                  checked={isSelected}
                  disabled={option.disabled === true || hasReachedLimit}
                  onChange={(event) => {
                    const nextValues = event.target.checked
                      ? [...selectedValues, option.value].slice(0, maxSelections)
                      : selectedValues.filter((value) => value !== option.value);

                    setAnswer(field.name, nextValues);
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {Number.isFinite(maxSelections) ? (
          <p className={styles.fieldHelpText}>
            Choose up to {maxSelections}. Selected: {selectedValues.length}.
          </p>
        ) : null}
        {fieldError}
      </div>
    );
  }

  if (field.type === "textarea") {
    const shouldHideVisibleLabel = field.name === "performanceComment";

    return (
      <div style={fieldFrameStyle}>
        <label
          className={shouldHideVisibleLabel ? styles.visuallyHidden : undefined}
          style={shouldHideVisibleLabel ? undefined : fieldLabelStyle}
        >
          {resolvedLabel}
        </label>
        <textarea
          className={styles.input}
          aria-label={resolvedLabel}
          placeholder={resolvedPlaceholder}
          value={String(answers[field.name] ?? "")}
          onChange={(e) => setAnswer(field.name, e.target.value)}
          style={{
            borderColor: theme.colors.border,
            minHeight: "120px",
            resize: "vertical",
          }}
        />
        {fieldError}
      </div>
    );
  }

  if (field.type === "date") {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayValue = `${yyyy}-${mm}-${dd}`;

    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
        <div style={{ display: "grid", gap: "10px" }}>
          <input
            className={styles.input}
            type="date"
            value={String(answers[field.name] ?? "")}
            onChange={(e) => setAnswer(field.name, e.target.value)}
            style={{ borderColor: theme.colors.border }}
          />
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setAnswer(field.name, todayValue)}
            style={{
              borderColor: theme.colors.border,
              background: "#FFFFFF",
              color: theme.colors.text,
            }}
          >
            Use today
          </button>
        </div>
        {fieldError}
      </div>
    );
  }

  if (field.type === "select") {
    const visibleOptions = getVisibleSelectOptions(field, answers);
    const selectedValue = String(answers[field.name] ?? "");
    const selectedValueIsVisible = visibleOptions.some(
      (option) => String(option.value) === selectedValue
    );
    const resolvedValue =
      field.name === "parishState" && !selectedValueIsVisible
        ? ""
        : selectedValue;

    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
        <select
          className={styles.input}
          value={resolvedValue}
          onChange={(e) => {
            setAnswer(field.name, e.target.value);

            if (field.name === "country") {
              setAnswer("parishState", "");
            }
          }}
          style={{ borderColor: theme.colors.border }}
        >
          <option value="">
            {resolvedPlaceholder || `Select ${resolvedLabel}`}
          </option>
          {visibleOptions.map((option) => (
            <option
              key={`${field.name}-${option.value}`}
              value={option.value}
              disabled={option.disabled === true}
            >
              {option.label}
            </option>
          ))}
        </select>
        {fieldError}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>
        <input
          className={styles.input}
          type="number"
          min={0}
          step="0.0001"
          placeholder={resolvedPlaceholder}
          value={String(answers[field.name] ?? "")}
          onChange={(e) => {
            const raw = e.target.value;

            if (raw === "") {
              setAnswer(field.name, "");
              return;
            }

            const parsed = Number(raw);

            if (Number.isNaN(parsed)) {
              return;
            }

            setAnswer(field.name, Math.max(0, parsed));
          }}
          style={{ borderColor: theme.colors.border }}
        />
        {fieldError}
      </div>
    );
  }

  if (field.type === "password") {
    const fieldValue = String(answers[field.name] ?? "");
    const passwordValue = String(answers.password ?? "");
    const confirmPasswordValue = String(answers.confirmPassword ?? "");
    const isConfirmPassword = field.name === "confirmPassword";

    const hasConfirmPasswordValue =
      isConfirmPassword && confirmPasswordValue.length > 0;

    const confirmPasswordMatches =
      hasConfirmPasswordValue && confirmPasswordValue === passwordValue;

    const passwordStrength =
      field.name === "password" ? getPasswordStrength(fieldValue) : null;
    const passwordAutocomplete = getPasswordAutocomplete(field);

    const passwordRequirementResults =
      field.name === "password"
        ? getPasswordRequirementResults(fieldValue)
        : [];

    return (
      <div style={fieldFrameStyle}>
        <label style={fieldLabelStyle}>{resolvedLabel}</label>

        <div className={styles.passwordInputWrap}>
          <input
            className={styles.input}
            type={isPasswordVisible ? "text" : "password"}
            placeholder={resolvedPlaceholder}
            value={fieldValue}
            onChange={(e) => setAnswer(field.name, e.target.value)}
            onPaste={
              isConfirmPassword ? (event) => event.preventDefault() : undefined
            }
            onDrop={
              isConfirmPassword ? (event) => event.preventDefault() : undefined
            }
            autoComplete={passwordAutocomplete}
            style={{ borderColor: theme.colors.border }}
          />

          <button
            type="button"
            className={styles.passwordToggleButton}
            onClick={onTogglePasswordVisibility}
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          >
            {isPasswordVisible ? "Hide" : "Show"}
          </button>
        </div>

        {field.name === "password" && passwordStrength ? (
          <div className={styles.passwordFeedbackStack}>
            <div
              className={`${styles.passwordStrength} ${
                passwordStrength.label === "Strong password"
                  ? styles.passwordStrengthStrong
                  : passwordStrength.label === "Medium password"
                    ? styles.passwordStrengthMedium
                    : styles.passwordStrengthWeak
              }`}
            >
              {passwordStrength.label}
            </div>

            {passwordRequirementResults.length ? (
              <ul className={styles.passwordRequirementList}>
                {passwordRequirementResults.map(
                  (item: { label: string; met: boolean }) => (
                    <li
                      key={item.label}
                      className={
                        item.met
                          ? styles.passwordRequirementMet
                          : styles.passwordRequirementMissing
                      }
                    >
                      {item.met ? "✓" : "•"} {item.label}
                    </li>
                  )
                )}
              </ul>
            ) : null}
          </div>
        ) : null}

        {isConfirmPassword ? (
          <div className={styles.passwordFeedbackStack}>
            <div className={styles.authSlideHelpText}>
              Please type the password again instead of pasting.
            </div>

            {hasConfirmPasswordValue ? (
              <div
                className={
                  confirmPasswordMatches
                    ? styles.passwordMatchSuccess
                    : styles.passwordMatchError
                }
              >
                {confirmPasswordMatches
                  ? "✓ Passwords match."
                  : "Passwords do not match yet."}
              </div>
            ) : null}
          </div>
        ) : null}
        {fieldError}
      </div>
    );
  }

  return (
    <div style={fieldFrameStyle}>
      <label style={fieldLabelStyle}>{resolvedLabel}</label>
      <input
        className={styles.input}
        type={field.type}
        placeholder={resolvedPlaceholder}
        value={String(answers[field.name] ?? "")}
      onChange={(e) => setAnswer(field.name, e.target.value)}
      style={{ borderColor: theme.colors.border }}
    />
    {fieldError}
  </div>
);
}

function getPasswordAutocomplete(field: FormField) {
  const fieldName = String(field.name || "").toLowerCase();
  const label = String(field.label || "").toLowerCase();
  const placeholder = String(field.placeholder || "").toLowerCase();
  const combined = `${fieldName} ${label} ${placeholder}`;

  if (
    fieldName.includes("confirm") ||
    combined.includes("new password") ||
    combined.includes("create") ||
    combined.includes("confirm")
  ) {
    return "new-password";
  }

  return "current-password";
}
