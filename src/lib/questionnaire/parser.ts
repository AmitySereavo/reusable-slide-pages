import {
  FormField,
  Option,
  ParsedQuestionnaireDocument,
  ParsedSlideDraft,
  Slide,
  SlideFeature,
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
  };

  let inFieldsBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "---" || line === "BR") {
      inFieldsBlock = false;
      draft.sections.push({ type: "break" });
      continue;
    }

    if (line.startsWith("@fields:")) {
      inFieldsBlock = true;
      continue;
    }

    if (inFieldsBlock && line.startsWith("-")) {
      const field = parseFieldLine(line);
      if (field) draft.fields?.push(field);
      continue;
    }

    if (line.startsWith("@")) {
      inFieldsBlock = false;

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

      if (line.startsWith("@back:")) {
        draft.backLabel = readValue(line, "@back:");
        continue;
      }

      if (line.startsWith("@backgoto:")) {
        draft.backGoto = readValue(line, "@backgoto:");
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

      continue;
    }

    if (line.startsWith("##")) {
      inFieldsBlock = false;
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
      const rawText = line.replace(/^#\s*/, "").trim();
      const { colorKey, text } = extractColorToken(rawText);

      draft.sections.push({ type: "heading", text, colorKey });

      if (!draft.title) {
        draft.title = text;
      }

      continue;
    }

    inFieldsBlock = false;

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
    nextLabel: draft.nextLabel,
    storeAs: draft.storeAs,
    goto: draft.goto,
    run: draft.run,
    sections: draft.sections,
    feature: draft.feature,
    fields: draft.fields?.length ? draft.fields : undefined,
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

function readValue(line: string, prefix: string) {
  return line.slice(prefix.length).trim();
}