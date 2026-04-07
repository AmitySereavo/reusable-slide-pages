import {
  ChoiceItem,
  ConditionRule,
  FormField,
  MediaAspect,
  MediaType,
  Option,
  ParsedQuestionnaireDocument,
  ParsedSlideDraft,
  Slide,
  SlideFeature,
  SlideRouteRule,
  SlideType,
} from "@/types/questionnaire";

export function parseQuestionnaireDsl(
  input: string
): ParsedQuestionnaireDocument {
  const rawSlides = input
    .split(/^===\s*$/m)
    .map((block) => block.trim())
    .filter(Boolean);

  const slides = rawSlides
    .map(parseSlideBlock)
    .map(finalizeSlide)
    .filter(Boolean) as Slide[];

  return { slides };
}

function parseSlideBlock(block: string): ParsedSlideDraft {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const draft: ParsedSlideDraft = {
    paragraphs: [],
    sections: [],
    fields: [],
    choices: [],
    routeRules: [],
    backRouteRules: [],
    showIfRules: [],
  };

  let inFieldsBlock = false;
  let inChoicesBlock = false;
  let inWhenBlock = false;
  let inBackWhenBlock = false;
  let inShowIfBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (isCommentLine(line)) {
      inFieldsBlock = false;
      inChoicesBlock = false;
      inWhenBlock = false;
      inBackWhenBlock = false;
      inShowIfBlock = false;
      continue;
    }

    if (line === "---" || line === "BR") {
      inFieldsBlock = false;
      inChoicesBlock = false;
      inWhenBlock = false;
      inBackWhenBlock = false;
      inShowIfBlock = false;
      draft.sections.push({ type: "break" });
      continue;
    }

    if (line.startsWith("@fields:")) {
      inFieldsBlock = true;
      inChoicesBlock = false;
      inWhenBlock = false;
      inBackWhenBlock = false;
      inShowIfBlock = false;
      continue;
    }

    if (line.startsWith("@choices:")) {
      inChoicesBlock = true;
      inFieldsBlock = false;
      inWhenBlock = false;
      inBackWhenBlock = false;
      inShowIfBlock = false;
      continue;
    }

    if (line.startsWith("@when:")) {
      inWhenBlock = true;
      inFieldsBlock = false;
      inChoicesBlock = false;
      inBackWhenBlock = false;
      inShowIfBlock = false;
      continue;
    }

    if (line.startsWith("@completioncheck:")) {
      draft.completionCheck = readValue(
        line,
        "@completioncheck:"
      ) as ParsedSlideDraft["completionCheck"];
      continue;
    }

    if (line.startsWith("@gotoifcomplete:")) {
      draft.gotoIfComplete = readValue(line, "@gotoifcomplete:");
      continue;
    }

    if (line.startsWith("@gotoifincomplete:")) {
      draft.gotoIfIncomplete = readValue(line, "@gotoifincomplete:");
      continue;
    }

    if (line.startsWith("@backwhen:")) {
      inBackWhenBlock = true;
      inFieldsBlock = false;
      inChoicesBlock = false;
      inWhenBlock = false;
      inShowIfBlock = false;
      continue;
    }

    if (line.startsWith("@showif:")) {
      inShowIfBlock = true;
      inFieldsBlock = false;
      inChoicesBlock = false;
      inWhenBlock = false;
      inBackWhenBlock = false;
      continue;
    }

    if (inFieldsBlock && line.startsWith("-")) {
      const field = parseFieldLine(line);
      if (field) draft.fields?.push(field);
      continue;
    }

    if (inChoicesBlock && line.startsWith("-")) {
      const choice = parseChoiceLine(line);
      if (choice) draft.choices?.push(choice);
      continue;
    }

    if (inWhenBlock && line.startsWith("-")) {
      const rule = parseRouteRuleLine(line);
      if (rule) draft.routeRules?.push(rule);
      continue;
    }

    if (inBackWhenBlock && line.startsWith("-")) {
      const rule = parseRouteRuleLine(line);
      if (rule) draft.backRouteRules?.push(rule);
      continue;
    }

    if (inShowIfBlock && line.startsWith("-")) {
      const rule = parseConditionRuleLine(line);
      if (rule) draft.showIfRules?.push(rule);
      continue;
    }

    if (line.startsWith("@")) {
      inFieldsBlock = false;
      inChoicesBlock = false;
      inWhenBlock = false;
      inBackWhenBlock = false;
      inShowIfBlock = false;

      if (line.startsWith("@id:")) {
        draft.id = readValue(line, "@id:");
        continue;
      }

      if (line.startsWith("@type:")) {
        draft.type = readValue(line, "@type:") as SlideType;
        continue;
      }

      if (line.startsWith("@store:")) {
        draft.storeAs = readValue(line, "@store:");
        continue;
      }

      if (line.startsWith("@catalog:")) {
        draft.catalogKey = readValue(line, "@catalog:");
        continue;
      }

      if (line.startsWith("@shopmode:")) {
        draft.shopMode = readValue(line, "@shopmode:") as ParsedSlideDraft["shopMode"];
        continue;
      }

      if (line.startsWith("@deliverygoto:")) {
        draft.deliveryGoto = readValue(line, "@deliverygoto:");
        continue;
      }

      if (line.startsWith("@reviewgoto:")) {
        draft.reviewGoto = readValue(line, "@reviewgoto:");
        continue;
      }

      if (line.startsWith("@deliveryconfig:")) {
        draft.deliveryConfigKey = readValue(line, "@deliveryconfig:");
        continue;
      }

      if (line.startsWith("@contactmode:")) {
        draft.contactMode = readValue(line, "@contactmode:") as ParsedSlideDraft["contactMode"];
        continue;
      }

      if (line.startsWith("@back:")) {
        draft.backLabel = readValue(line, "@back:");
        continue;
      }

      if (line.startsWith("@backgoto:")) {
        draft.backGoto = readValue(line, "@backgoto:");
        continue;
      }

      if (line.startsWith("@showback:")) {
        draft.showBack = parseBooleanValue(readValue(line, "@showback:"), true);
        continue;
      }

      if (line.startsWith("@shownext:")) {
        draft.showNext = parseBooleanValue(readValue(line, "@shownext:"), true);
        continue;
      }

      if (line.startsWith("@countstep:")) {
        draft.countStep = parseBooleanValue(readValue(line, "@countstep:"), true);
        continue;
      }

      if (line.startsWith("@showsteptext:")) {
        draft.showStepText = parseBooleanValue(
          readValue(line, "@showsteptext:"),
          true
        );
        continue;
      }

      if (line.startsWith("@next:")) {
        draft.nextLabel = readValue(line, "@next:");
        continue;
      }

      if (line.startsWith("@goto:")) {
        draft.goto = readValue(line, "@goto:");
        continue;
      }

      if (line.startsWith("@buttonstyle:")) {
        draft.buttonStyleKey = readValue(line, "@buttonstyle:");
        continue;
      }

      if (line.startsWith("@backstyle:")) {
        draft.backStyleKey = readValue(line, "@backstyle:");
        continue;
      }

      if (line.startsWith("@nextstyle:")) {
        draft.nextStyleKey = readValue(line, "@nextstyle:");
        continue;
      }

      if (line.startsWith("@run:")) {
        draft.run = readValue(line, "@run:");
        continue;
      }

      if (line.startsWith("@feature:")) {
        const feature = parseFeature(readValue(line, "@feature:"));
        draft.feature = feature;

        if (feature) {
          draft.sections.push({
            type: "feature",
            feature,
          });
        }

        continue;
      }

      if (line.startsWith("@media:")) {
        draft.mediaUrl = readValue(line, "@media:");
        continue;
      }

      if (line.startsWith("@embed:")) {
        draft.embedUrl = readValue(line, "@embed:");
        continue;
      }

      if (line.startsWith("@mediatype:")) {
        draft.mediaType = readValue(line, "@mediatype:") as MediaType;
        continue;
      }

      if (line.startsWith("@mediaaspect:")) {
        draft.mediaAspect = readValue(line, "@mediaaspect:") as MediaAspect;
        continue;
      }

      if (line.startsWith("@autoplay:")) {
        draft.autoplay = parseBooleanValue(readValue(line, "@autoplay:"), false);
        continue;
      }

      if (line.startsWith("@pagebgcolor:")) {
        draft.pageBackgroundColor = readValue(line, "@pagebgcolor:");
        continue;
      }

      if (line.startsWith("@pagebgimage:")) {
        draft.pageBackgroundImage = readValue(line, "@pagebgimage:");
        continue;
      }

      if (line.startsWith("@pagebgsize:")) {
        draft.pageBackgroundSize = readValue(line, "@pagebgsize:");
        continue;
      }

      if (line.startsWith("@pagebgposition:")) {
        draft.pageBackgroundPosition = readValue(line, "@pagebgposition:");
        continue;
      }

      if (line.startsWith("@cardopacity:")) {
        draft.cardOpacity = parseNumberValue(readValue(line, "@cardopacity:"));
        continue;
      }

      if (line.startsWith("@progressoverlaybg:")) {
        draft.progressOverlayBackgroundColor = readValue(
          line,
          "@progressoverlaybg:"
        );
        continue;
      }

      if (line.startsWith("@actionbarbg:")) {
        draft.actionBarBackgroundColor = readValue(line, "@actionbarbg:");
        continue;
      }

      if (line.startsWith("@progressoverlaytextcolor:")) {
        draft.progressOverlayTextColor = readValue(
          line,
          "@progressoverlaytextcolor:"
        );
        continue;
      }

      if (line.startsWith("@actionbartextcolor:")) {
        draft.actionBarTextColor = readValue(line, "@actionbartextcolor:");
        continue;
      }

      continue;
    }

    if (line.startsWith("##")) {
      inFieldsBlock = false;
      inChoicesBlock = false;
      inWhenBlock = false;
      inBackWhenBlock = false;
      inShowIfBlock = false;

      const rawText = line.replace(/^##\s*/, "").trim();
      const { colorKey, text } = extractColorToken(rawText);

      draft.sections.push({ type: "subheading", text, colorKey });

      if (!draft.subtitle) {
        draft.subtitle = text;
      }

      continue;
    }

    if (line.startsWith("#")) {
      inFieldsBlock = false;
      inChoicesBlock = false;
      inWhenBlock = false;
      inBackWhenBlock = false;
      inShowIfBlock = false;

      const rawText = line.replace(/^#\s*/, "").trim();
      const { colorKey, text } = extractColorToken(rawText);

      draft.sections.push({ type: "heading", text, colorKey });

      if (!draft.title) {
        draft.title = text;
      }

      continue;
    }

    inFieldsBlock = false;
    inChoicesBlock = false;
    inWhenBlock = false;
    inBackWhenBlock = false;
    inShowIfBlock = false;

    const { colorKey, text } = extractColorToken(line);

    draft.paragraphs.push(text);
    draft.sections.push({
      type: "paragraph",
      text,
      colorKey,
    });
  }

  return draft;
}

function finalizeSlide(draft: ParsedSlideDraft): Slide | null {
  
  
  if (!draft.id || !draft.type) {
    return null;
  }

  const firstHeading = draft.sections.find(
    (section) => section.type === "heading"
  );

  const firstSubheading = draft.sections.find(
    (section) => section.type === "subheading"
  );

  const slide: Slide = {
    id: draft.id,
    type: draft.type,
    title:
      draft.title ??
      (firstHeading && "text" in firstHeading ? firstHeading.text : "Untitled Slide"),
    subtitle:
      draft.subtitle ??
      (firstSubheading && "text" in firstSubheading
        ? firstSubheading.text
        : undefined),
    body: draft.paragraphs.join(" "),
    backLabel: draft.backLabel,
    backGoto: draft.backGoto,
    showBack: draft.showBack,
    showNext: draft.showNext,
    countStep: draft.countStep,
    showStepText: draft.showStepText,
    nextLabel: draft.nextLabel,
    storeAs: draft.storeAs,
    goto: draft.goto,
    run: draft.run,
    sections: draft.sections,
    feature: draft.feature,
    fields: draft.fields?.length ? draft.fields : undefined,
    choices: draft.choices?.length ? draft.choices : undefined,
    routeRules: draft.routeRules?.length ? draft.routeRules : undefined,
    backRouteRules: draft.backRouteRules?.length
      ? draft.backRouteRules
      : undefined,
    showIfRules: draft.showIfRules?.length ? draft.showIfRules : undefined,
    buttonStyleKey: draft.buttonStyleKey,
    backStyleKey: draft.backStyleKey,
    nextStyleKey: draft.nextStyleKey,
    mediaUrl: draft.mediaUrl,
    embedUrl: draft.embedUrl,
    mediaType: draft.mediaType,
    mediaAspect: draft.mediaAspect,
    autoplay: draft.autoplay,
    pageBackgroundColor: draft.pageBackgroundColor,
    pageBackgroundImage: draft.pageBackgroundImage,
    pageBackgroundSize: draft.pageBackgroundSize,
    pageBackgroundPosition: draft.pageBackgroundPosition,
    cardOpacity: draft.cardOpacity,
    catalogKey: draft.catalogKey,
    shopMode: draft.shopMode,
    deliveryGoto: draft.deliveryGoto,
    reviewGoto: draft.reviewGoto,
    deliveryConfigKey: draft.deliveryConfigKey,
    completionCheck: draft.completionCheck,
    gotoIfComplete: draft.gotoIfComplete,
    gotoIfIncomplete: draft.gotoIfIncomplete,
    contactMode: draft.contactMode,
    progressOverlayBackgroundColor: draft.progressOverlayBackgroundColor,
    actionBarBackgroundColor: draft.actionBarBackgroundColor,
    progressOverlayTextColor: draft.progressOverlayTextColor,
    actionBarTextColor: draft.actionBarTextColor,
  };

  if (draft.feature?.type === "numberscale") {
    slide.options = draft.feature.options;
  }

  return slide;
}

function parseFeature(value: string): SlideFeature | undefined {
  const trimmed = value.trim();

  if (trimmed.startsWith("numberscale(") && trimmed.endsWith(")")) {
    const inside = trimmed.slice("numberscale(".length, -1);
    const rawOptions = inside.split(",").map((part) => part.trim());

    const options: Option[] = rawOptions.map((item) => {
      const disabled = item.startsWith("[") && item.endsWith("]");
      const clean = item.replace(/^\[/, "").replace(/\]$/, "");
      const num = Number(clean);

      return {
        label: clean,
        value: Number.isNaN(num) ? clean : num,
        disabled,
      };
    });

    return {
      type: "numberscale",
      options,
    };
  }

  return undefined;
}

function parseFieldLine(line: string): FormField | null {
  const value = line.replace(/^-+\s*/, "").trim();

  const [name, type, label, requiredFlag, placeholder] = value
    .split("|")
    .map((part) => part.trim());

  if (!name || !type || !label) return null;

  return {
    name,
    type: type as FormField["type"],
    label,
    required: requiredFlag?.toLowerCase() === "required",
    placeholder: placeholder || undefined,
  };
}

function parseChoiceLine(line: string): ChoiceItem | null {
  const value = line.replace(/^-+\s*/, "").trim();

  const [rawValue, label, goto, styleKey] = value
    .split("|")
    .map((part) => part.trim());

  if (!rawValue || !label) return null;

  const numericValue = Number(rawValue);
  const parsedValue = Number.isNaN(numericValue) ? rawValue : numericValue;

  return {
    value: parsedValue,
    label,
    goto: goto || undefined,
    styleKey: styleKey || undefined,
  };
}

function parseRouteRuleLine(line: string): SlideRouteRule | null {
  const value = line.replace(/^-+\s*/, "").trim();

  const [field, operator, ruleValue, goto] = value
    .split("|")
    .map((part) => part.trim());

  if (!field || !operator || !ruleValue || !goto) return null;

  return {
    field,
    operator: operator as SlideRouteRule["operator"],
    value: ruleValue,
    goto,
  };
}

function parseConditionRuleLine(line: string): ConditionRule | null {
  const value = line.replace(/^-+\s*/, "").trim();

  const [field, operator, ruleValue] = value
    .split("|")
    .map((part) => part.trim());

  if (!field || !operator || !ruleValue) return null;

  return {
    field,
    operator: operator as ConditionRule["operator"],
    value: ruleValue,
  };
}

function extractColorToken(text: string) {
  const match = text.match(/^\[(\w+)\]\s*(.*)$/);

  if (!match) {
    return {
      colorKey: undefined,
      text,
    };
  }

  return {
    colorKey: match[1],
    text: match[2],
  };
}

function isCommentLine(line: string) {
  return line.startsWith("//") || line.startsWith("::");
}

function parseBooleanValue(value: string, fallback: boolean) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return fallback;
}

function parseNumberValue(value: string) {
  const parsed = Number(value.trim());

  return Number.isFinite(parsed) ? parsed : undefined;
}

function readValue(line: string, prefix: string) {
  return line.slice(prefix.length).trim();
}