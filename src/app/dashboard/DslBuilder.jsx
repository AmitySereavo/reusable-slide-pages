"use client";

import { useMemo, useState } from "react";

const slideTypeCatalog = [
  {
    id: "media-video-music",
    label: "Media / Video - Music",
    type: "media",
    description: "Full-screen music or lyric video with footer controls.",
    requiresActionBar: false,
    defaultSlide: {
      title: "Music Video",
      subtitle: "Official video",
      mediaType: "video",
      mediaAspect: "vertical",
      progressMode: "video",
      progressPlacement: "footer-edge",
      footerContentLabel: "Track Name",
      textPanelEnabled: true,
      footerActions: ["previous", "mute", "next", "textpanel", "wav", "mp3"],
    },
  },
  {
    id: "media-video-spoken",
    label: "Media / Video - Spoken Content",
    type: "media",
    description: "Talk, lesson, sermon, interview, or guided content.",
    requiresActionBar: false,
    defaultSlide: {
      title: "Spoken Video",
      subtitle: "Watch and continue",
      mediaType: "video",
      mediaAspect: "horizontal",
      progressMode: "video",
      progressPlacement: "overlay",
      footerActions: ["mute"],
    },
  },
  {
    id: "image-overlay",
    label: "Image With Text Overlay",
    type: "media",
    description: "Image slide with optional text sections layered over it.",
    requiresActionBar: false,
    defaultSlide: {
      title: "Image Moment",
      subtitle: "Text overlay",
      mediaType: "image",
      mediaAspect: "horizontal",
      body: "# Overlay heading\n[c2] Supporting overlay text.",
    },
  },
  {
    id: "article",
    label: "Article",
    type: "annotatedtext",
    description: "Long readable text from a text source.",
    requiresActionBar: false,
    defaultSlide: {
      title: "Article",
      subtitle: "Read more",
      annotatedTextMode: "article",
    },
  },
  {
    id: "short-text",
    label: "Short Text",
    type: "content",
    description: "Simple text slide with headings and paragraphs.",
    requiresActionBar: false,
    defaultSlide: {
      title: "Short Text",
      subtitle: "A focused message",
      body: "# Main point\n[c2] A short paragraph goes here.",
    },
  },
  {
    id: "shop-cart",
    label: "Shop + Cart",
    type: "shop",
    description: "Catalog browsing, cart selection, and review slide.",
    requiresActionBar: true,
    defaultSlide: {
      title: "Shop",
      subtitle: "Choose items",
      catalogKey: "shopCatalog",
      shopMode: "browse",
      storeAs: "cart",
    },
  },
  {
    id: "tickets",
    label: "Tickets",
    type: "tickets",
    description: "Ticket owner assignment and attendee details.",
    requiresActionBar: true,
    defaultSlide: {
      title: "Ticket Details",
      subtitle: "Assign each ticket",
    },
  },
  {
    id: "choice",
    label: "Choice",
    type: "choice",
    description: "Single-choice branching or preference capture.",
    requiresActionBar: true,
    defaultSlide: {
      title: "Choose One",
      subtitle: "Pick the option that fits.",
      storeAs: "choiceAnswer",
      choices: "yes|Yes|next-slide|primary\nno|No|next-slide|secondary",
    },
  },
  {
    id: "score",
    label: "Score / Number Scale",
    type: "score",
    description: "Numeric scale for ratings and self-assessment.",
    requiresActionBar: true,
    defaultSlide: {
      title: "Rate This",
      subtitle: "Choose a number",
      storeAs: "scoreAnswer",
      feature: "numberscale(1,2,3,4,5,[6],7,8,9,10)",
    },
  },
  {
    id: "form",
    label: "Form",
    type: "form",
    description: "Collect structured information.",
    requiresActionBar: true,
    defaultSlide: {
      title: "Contact Details",
      subtitle: "Tell us where to reach you.",
      fields: "fullName|text|Full name|required|Your name\nemail|email|Email|required|you@example.com",
    },
  },
  {
    id: "delivery",
    label: "Delivery",
    type: "delivery",
    description: "Delivery or pickup selection for a cart flow.",
    requiresActionBar: true,
    defaultSlide: {
      title: "Delivery Options",
      subtitle: "Choose how you receive your order.",
      deliveryConfigKey: "deliveryConfig",
    },
  },
  {
    id: "meal",
    label: "Meal",
    type: "meal",
    description: "Meal selection tied to tickets.",
    requiresActionBar: true,
    defaultSlide: {
      title: "Meal Selection",
      subtitle: "Choose meals for ticket holders.",
      mealMenuKey: "default",
    },
  },
  {
    id: "recordlist",
    label: "Record List",
    type: "recordlist",
    description: "Operational list or dashboard data block.",
    requiresActionBar: false,
    defaultSlide: {
      title: "Records",
      subtitle: "Review current records.",
      recordSourceKey: "records",
      recordEmptyText: "No records yet.",
    },
  },
  {
    id: "authform",
    label: "Auth Form",
    type: "authform",
    description: "Reusable login/signup/reset forms.",
    requiresActionBar: true,
    defaultSlide: {
      title: "Log In",
      subtitle: "Access your account.",
      authFormKey: "login",
    },
  },
  {
    id: "accountsummary",
    label: "Account Summary",
    type: "accountsummary",
    description: "User account, tickets, receipts, and purchases surface.",
    requiresActionBar: false,
    defaultSlide: {
      title: "Account",
      subtitle: "Your account details.",
    },
  },
];

const themePresets = [
  { id: "seed", label: "Seed" },
  { id: "gardenHerbs", label: "Garden Herbs" },
  { id: "selfTrust", label: "Self Trust" },
  { id: "custom", label: "Custom Theme Key" },
];

function createSlide(typeId, index) {
  const definition = slideTypeCatalog.find((item) => item.id === typeId);
  const base = definition ?? slideTypeCatalog[0];
  const title = base.defaultSlide.title ?? base.label;

  return {
    id: slugify(title) || `slide-${index + 1}`,
    typeId: base.id,
    type: base.type,
    title,
    subtitle: base.defaultSlide.subtitle ?? "",
    body: base.defaultSlide.body ?? "",
    mediaUrl: "",
    mediaType: base.defaultSlide.mediaType ?? "",
    mediaAspect: base.defaultSlide.mediaAspect ?? "",
    annotatedTextSourceUrl: "",
    annotatedTextMode: base.defaultSlide.annotatedTextMode ?? "",
    textPanelEnabled: base.defaultSlide.textPanelEnabled === true,
    textPanelSongMediaUrl: "",
    textPanelLinesMediaUrl: "",
    catalogKey: base.defaultSlide.catalogKey ?? "",
    shopMode: base.defaultSlide.shopMode ?? "",
    storeAs: base.defaultSlide.storeAs ?? "",
    fields: base.defaultSlide.fields ?? "",
    choices: base.defaultSlide.choices ?? "",
    feature: base.defaultSlide.feature ?? "",
    footerContentLabel: base.defaultSlide.footerContentLabel ?? "",
    footerActions: base.defaultSlide.footerActions ?? [],
    progressMode: base.defaultSlide.progressMode ?? "",
    progressPlacement: base.defaultSlide.progressPlacement ?? "",
    showProgressBar: base.type === "media",
    showBack: true,
    showNext: true,
    syncUrl: true,
    goto: "",
    nextLabel: "Next",
    deliveryConfigKey: base.defaultSlide.deliveryConfigKey ?? "",
    mealMenuKey: base.defaultSlide.mealMenuKey ?? "",
    authFormKey: base.defaultSlide.authFormKey ?? "",
    recordSourceKey: base.defaultSlide.recordSourceKey ?? "",
    recordEmptyText: base.defaultSlide.recordEmptyText ?? "",
  };
}

export default function DslBuilder() {
  const [project, setProject] = useState({
    name: "New Project",
    slug: "new-project",
    themePreset: "seed",
    customThemeKey: "",
    overlayMode: "opaque",
    showStepText: false,
  });
  const [slides, setSlides] = useState([createSlide("short-text", 0)]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saveState, setSaveState] = useState({ status: "idle", message: "" });

  const currentSlide = slides[selectedIndex] ?? slides[0];
  const currentDefinition =
    slideTypeCatalog.find((item) => item.id === currentSlide?.typeId) ??
    slideTypeCatalog[0];
  const generatedDsl = useMemo(() => buildDsl(slides), [slides]);
  const registrySnippet = useMemo(
    () => buildRegistrySnippet(project),
    [project]
  );

  function updateProject(key, value) {
    setProject((current) => {
      const next = { ...current, [key]: value };

      if (key === "name") {
        next.slug = slugify(value);
      }

      return next;
    });
  }

  function updateSlide(key, value) {
    setSlides((current) =>
      current.map((slide, index) =>
        index === selectedIndex ? { ...slide, [key]: value } : slide
      )
    );
  }

  function addSlide(typeId) {
    setSlides((current) => {
      const next = [...current, createSlide(typeId, current.length)];
      setSelectedIndex(next.length - 1);
      return next;
    });
  }

  function removeSlide(indexToRemove) {
    setSlides((current) => {
      if (current.length === 1) return current;
      const next = current.filter((_, index) => index !== indexToRemove);
      setSelectedIndex(Math.max(0, Math.min(selectedIndex, next.length - 1)));
      return next;
    });
  }

  async function saveDsl() {
    setSaveState({ status: "saving", message: "Saving DSL file..." });

    try {
      const response = await fetch("/api/dashboard/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: project.slug,
          dsl: generatedDsl,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not save DSL file.");
      }

      setSaveState({
        status: "saved",
        message: `Saved ${data.path}. Add the registry entry when ready.`,
      });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "Save failed.",
      });
    }
  }

  return (
    <div style={styles.shell}>
      <section style={styles.panel}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.h2}>Project</h2>
          <p style={styles.muted}>Name, route slug, and theme choices.</p>
        </div>

        <label style={styles.field}>
          <span style={styles.label}>Project name</span>
          <input
            style={styles.input}
            value={project.name}
            onChange={(event) => updateProject("name", event.target.value)}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Slug</span>
          <input
            style={styles.input}
            value={project.slug}
            onChange={(event) =>
              updateProject("slug", slugify(event.target.value))
            }
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Theme</span>
          <select
            style={styles.input}
            value={project.themePreset}
            onChange={(event) => updateProject("themePreset", event.target.value)}
          >
            {themePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        {project.themePreset === "custom" ? (
          <label style={styles.field}>
            <span style={styles.label}>Custom theme key</span>
            <input
              style={styles.input}
              value={project.customThemeKey}
              onChange={(event) =>
                updateProject("customThemeKey", event.target.value)
              }
            />
          </label>
        ) : null}

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={project.showStepText}
            onChange={(event) =>
              updateProject("showStepText", event.target.checked)
            }
          />
          Show step text
        </label>

        <div style={styles.sectionHeader}>
          <h2 style={styles.h2}>Add Slide</h2>
          <p style={styles.muted}>Types are based on the current parser and README.</p>
        </div>

        <div style={styles.slideTypeGrid}>
          {slideTypeCatalog.map((item) => (
            <button
              key={item.id}
              type="button"
              style={styles.slideTypeButton}
              onClick={() => addSlide(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
              {item.requiresActionBar ? <em>Action bar expected</em> : null}
            </button>
          ))}
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.h2}>Slides</h2>
          <p style={styles.muted}>Select a slide and tune its DSL options.</p>
        </div>

        <div style={styles.slideList}>
          {slides.map((slide, index) => (
            <button
              key={`${slide.id}-${index}`}
              type="button"
              style={{
                ...styles.slideListButton,
                ...(index === selectedIndex ? styles.slideListButtonActive : {}),
              }}
              onClick={() => setSelectedIndex(index)}
            >
              <span>{index + 1}. {slide.title || slide.id}</span>
              <small>{slide.type}</small>
            </button>
          ))}
        </div>

        {currentSlide ? (
          <div style={styles.editor}>
            <div style={styles.editorHeader}>
              <div>
                <h3 style={styles.h3}>{currentDefinition.label}</h3>
                <p style={styles.muted}>{currentDefinition.description}</p>
              </div>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => removeSlide(selectedIndex)}
              >
                Remove
              </button>
            </div>

            <Field label="Slide ID" value={currentSlide.id} onChange={(value) => updateSlide("id", slugify(value))} />
            <Field label="Title" value={currentSlide.title} onChange={(value) => updateSlide("title", value)} />
            <Field label="Subtitle" value={currentSlide.subtitle} onChange={(value) => updateSlide("subtitle", value)} />

            {(currentSlide.type === "content" || currentSlide.type === "media") ? (
              <TextArea label="Text / overlay sections" value={currentSlide.body} onChange={(value) => updateSlide("body", value)} />
            ) : null}

            {currentSlide.type === "media" ? (
              <>
                <Field label="Media URL" value={currentSlide.mediaUrl} onChange={(value) => updateSlide("mediaUrl", value)} />
                <Select label="Media type" value={currentSlide.mediaType} options={["image", "video"]} onChange={(value) => updateSlide("mediaType", value)} />
                <Select label="Aspect" value={currentSlide.mediaAspect} options={["horizontal", "vertical", "square"]} onChange={(value) => updateSlide("mediaAspect", value)} />
                <Select label="Progress placement" value={currentSlide.progressPlacement} options={["", "overlay", "footer-edge"]} onChange={(value) => updateSlide("progressPlacement", value)} />
                <Field label="Footer content label" value={currentSlide.footerContentLabel} onChange={(value) => updateSlide("footerContentLabel", value)} />
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={currentSlide.textPanelEnabled}
                    onChange={(event) => updateSlide("textPanelEnabled", event.target.checked)}
                  />
                  Lyrics / annotated text panel from content label
                </label>
                {currentSlide.textPanelEnabled ? (
                  <>
                    <Field label="Text source URL" value={currentSlide.annotatedTextSourceUrl} onChange={(value) => updateSlide("annotatedTextSourceUrl", value)} />
                    <Select label="Text mode" value={currentSlide.annotatedTextMode || "lyrics"} options={["lyrics", "article", "chapter", "story"]} onChange={(value) => updateSlide("annotatedTextMode", value)} />
                    <Field label="Song mode audio URL" value={currentSlide.textPanelSongMediaUrl} onChange={(value) => updateSlide("textPanelSongMediaUrl", value)} />
                    <Field label="Lines mode audio URL" value={currentSlide.textPanelLinesMediaUrl} onChange={(value) => updateSlide("textPanelLinesMediaUrl", value)} />
                  </>
                ) : null}
              </>
            ) : null}

            {currentSlide.type === "annotatedtext" ? (
              <>
                <Field label="Text source URL" value={currentSlide.annotatedTextSourceUrl} onChange={(value) => updateSlide("annotatedTextSourceUrl", value)} />
                <Select label="Text mode" value={currentSlide.annotatedTextMode} options={["lyrics", "article", "chapter", "story"]} onChange={(value) => updateSlide("annotatedTextMode", value)} />
              </>
            ) : null}

            {currentSlide.type === "shop" ? (
              <>
                <Field label="Catalog key" value={currentSlide.catalogKey} onChange={(value) => updateSlide("catalogKey", value)} />
                <Select label="Shop mode" value={currentSlide.shopMode} options={["browse", "review"]} onChange={(value) => updateSlide("shopMode", value)} />
                <Field label="Cart answer key" value={currentSlide.storeAs} onChange={(value) => updateSlide("storeAs", value)} />
              </>
            ) : null}

            {currentSlide.type === "choice" ? (
              <>
                <Field label="Answer key" value={currentSlide.storeAs} onChange={(value) => updateSlide("storeAs", value)} />
                <TextArea label="Choices" value={currentSlide.choices} onChange={(value) => updateSlide("choices", value)} />
              </>
            ) : null}

            {currentSlide.type === "score" ? (
              <>
                <Field label="Answer key" value={currentSlide.storeAs} onChange={(value) => updateSlide("storeAs", value)} />
                <Field label="Feature" value={currentSlide.feature} onChange={(value) => updateSlide("feature", value)} />
              </>
            ) : null}

            {currentSlide.type === "form" ? (
              <TextArea label="Fields" value={currentSlide.fields} onChange={(value) => updateSlide("fields", value)} />
            ) : null}

            {currentSlide.type === "delivery" ? (
              <Field label="Delivery config key" value={currentSlide.deliveryConfigKey} onChange={(value) => updateSlide("deliveryConfigKey", value)} />
            ) : null}

            {currentSlide.type === "meal" ? (
              <Field label="Meal menu key" value={currentSlide.mealMenuKey} onChange={(value) => updateSlide("mealMenuKey", value)} />
            ) : null}

            {currentSlide.type === "authform" ? (
              <Field label="Auth form key" value={currentSlide.authFormKey} onChange={(value) => updateSlide("authFormKey", value)} />
            ) : null}

            {currentSlide.type === "recordlist" ? (
              <>
                <Field label="Record source key" value={currentSlide.recordSourceKey} onChange={(value) => updateSlide("recordSourceKey", value)} />
                <Field label="Empty text" value={currentSlide.recordEmptyText} onChange={(value) => updateSlide("recordEmptyText", value)} />
              </>
            ) : null}

            <Field label="Next target ID" value={currentSlide.goto} onChange={(value) => updateSlide("goto", slugify(value))} />

            <div style={styles.optionGrid}>
              <label style={styles.checkboxRow}>
                <input type="checkbox" checked={currentSlide.showBack} onChange={(event) => updateSlide("showBack", event.target.checked)} />
                Back
              </label>
              <label style={styles.checkboxRow}>
                <input type="checkbox" checked={currentSlide.showNext} onChange={(event) => updateSlide("showNext", event.target.checked)} />
                Next
              </label>
              <label style={styles.checkboxRow}>
                <input type="checkbox" checked={currentSlide.showProgressBar} onChange={(event) => updateSlide("showProgressBar", event.target.checked)} />
                Progress
              </label>
              <label style={styles.checkboxRow}>
                <input type="checkbox" checked={currentSlide.syncUrl} onChange={(event) => updateSlide("syncUrl", event.target.checked)} />
                URL path
              </label>
            </div>
          </div>
        ) : null}
      </section>

      <section style={styles.panelWide}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.h2}>Generated DSL</h2>
          <p style={styles.muted}>Save the file, copy it, or use the registry snippet.</p>
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.primaryButton} onClick={saveDsl}>
            Save DSL File
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigator.clipboard?.writeText(generatedDsl)}
          >
            Copy DSL
          </button>
          <a style={styles.secondaryLink} href={`/questionnaire/${project.slug}`}>
            Open project route
          </a>
        </div>

        {saveState.message ? (
          <p style={saveState.status === "error" ? styles.error : styles.success}>
            {saveState.message}
          </p>
        ) : null}

        <textarea style={styles.codeArea} readOnly value={generatedDsl} />

        <h3 style={styles.h3}>Registry Snippet</h3>
        <textarea style={styles.snippetArea} readOnly value={registrySnippet} />
      </section>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input style={styles.input} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <textarea style={styles.textarea} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <select style={styles.input} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option || "default"}</option>
        ))}
      </select>
    </label>
  );
}

function buildDsl(slides) {
  return slides.map((slide) => buildSlideDsl(slide)).join("\n===\n");
}

function buildSlideDsl(slide) {
  const lines = [
    `@id: ${slide.id || "slide"}`,
    `@type: ${slide.type}`,
    `@title: ${slide.title || "Untitled"}`,
  ];

  pushDirective(lines, "subtitle", slide.subtitle);
  pushBoolean(lines, "showback", slide.showBack);
  pushBoolean(lines, "shownext", slide.showNext);
  pushBoolean(lines, "showprogressbar", slide.showProgressBar);
  pushBoolean(lines, "syncurl", slide.syncUrl);
  pushDirective(lines, "next", slide.nextLabel);
  pushDirective(lines, "goto", slide.goto);

  if (slide.type === "media") {
    pushDirective(lines, "media", slide.mediaUrl || "/media/example.mp4");
    pushDirective(lines, "mediatype", slide.mediaType || "video");
    pushDirective(lines, "mediaaspect", slide.mediaAspect || "horizontal");
    pushDirective(lines, "progressmode", slide.progressMode);
    pushDirective(lines, "progressplacement", slide.progressPlacement);
    pushDirective(lines, "footercontentlabel", slide.footerContentLabel);
    if (slide.textPanelEnabled) {
      pushDirective(lines, "textpanel", "true");
      pushDirective(lines, "textsource", slide.annotatedTextSourceUrl || "/api/downloads/text-key");
      pushDirective(lines, "textmode", slide.annotatedTextMode || "lyrics");
      pushDirective(lines, "textpanelsongmedia", slide.textPanelSongMediaUrl);
      pushDirective(lines, "textpanellinesmedia", slide.textPanelLinesMediaUrl);
    }
    buildFooterActions(slide).forEach((action) =>
      lines.push(`@footeraction: ${action}`)
    );
  }

  if (slide.type === "annotatedtext") {
    pushDirective(lines, "textsource", slide.annotatedTextSourceUrl || "/api/downloads/text-key");
    pushDirective(lines, "textmode", slide.annotatedTextMode || "article");
  }

  if (slide.type === "shop") {
    pushDirective(lines, "catalog", slide.catalogKey || "shopCatalog");
    pushDirective(lines, "shopmode", slide.shopMode || "browse");
    pushDirective(lines, "store", slide.storeAs || "cart");
  }

  if (slide.type === "choice") {
    pushDirective(lines, "store", slide.storeAs);
    appendBlock(lines, "choices", slide.choices);
  }

  if (slide.type === "score") {
    pushDirective(lines, "store", slide.storeAs);
    pushDirective(lines, "feature", slide.feature);
  }

  if (slide.type === "form") {
    appendBlock(lines, "fields", slide.fields);
  }

  pushDirective(lines, "deliveryconfig", slide.deliveryConfigKey);
  pushDirective(lines, "mealmenu", slide.mealMenuKey);
  pushDirective(lines, "authform", slide.authFormKey);
  pushDirective(lines, "recordsource", slide.recordSourceKey);
  pushDirective(lines, "recordempty", slide.recordEmptyText);

  if (slide.body?.trim()) {
    lines.push("---");
    lines.push(slide.body.trim());
  }

  return lines.filter(Boolean).join("\n");
}

function buildFooterActions(slide) {
  const actions = [];
  const selected = new Set(slide.footerActions ?? []);

  if (selected.has("previous")) actions.push("goto|previous|Previous track|previous-slide");
  if (selected.has("mute")) actions.push("media|mute|Mute|toggle-mute");
  if (selected.has("next")) actions.push("goto|next|Next track|next-slide");
  if (selected.has("textpanel") && slide.textPanelEnabled) {
    actions.push(
      `textpanel|lyrics|Lyrics|${slide.annotatedTextSourceUrl || "/api/downloads/text-key"}`
    );
  }
  if (selected.has("wav")) actions.push("download|song-wav|WAV");
  if (selected.has("mp3")) actions.push("download|song-mp3|MP3");

  return actions;
}

function appendBlock(lines, key, value) {
  if (!value?.trim()) return;
  lines.push(`@${key}:`);
  value.trim().split(/\r?\n/).forEach((line) => lines.push(`- ${line}`));
}

function pushDirective(lines, key, value) {
  if (value === undefined || value === null || value === "") return;
  lines.push(`@${key}: ${value}`);
}

function pushBoolean(lines, key, value) {
  if (typeof value !== "boolean") return;
  lines.push(`@${key}: ${value ? "true" : "false"}`);
}

function buildRegistrySnippet(project) {
  const themeKey =
    project.themePreset === "custom"
      ? project.customThemeKey || "customTheme"
      : project.themePreset;
  const themeImport =
    project.themePreset === "gardenHerbs"
      ? "gardenHerbsTheme"
      : project.themePreset === "selfTrust"
        ? "selfTrustTheme"
        : "seedTheme";

  return `"${project.slug}": {
  slug: "${project.slug}",
  name: "${project.name}",
  themeKey: "${themeKey}",
  theme: ${themeImport},
  dslPath: "src/config/questionnaires/${toPascalish(project.slug)}Dsl.txt",
  showStepText: ${project.showStepText ? "true" : "false"},
  overlayMode: "${project.overlayMode}",
  variables: {},
  dynamicVariablesEndpoint: undefined,
},`;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toPascalish(slug) {
  const parts = String(slug || "project")
    .split("-")
    .filter(Boolean);
  const [first = "project", ...rest] = parts;

  return `${first}${rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")}`;
}

const styles = {
  shell: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(280px, 0.9fr) minmax(360px, 1.1fr)",
  },
  panel: {
    background: "#fffaf4",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(32, 28, 29, 0.08)",
    padding: 18,
  },
  panelWide: {
    background: "#fffaf4",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(32, 28, 29, 0.08)",
    gridColumn: "1 / -1",
    padding: 18,
  },
  sectionHeader: { marginBottom: 12 },
  h2: { fontSize: 18, margin: 0 },
  h3: { fontSize: 15, margin: "0 0 4px" },
  muted: { fontSize: 13, lineHeight: 1.35, margin: 0, opacity: 0.68 },
  field: { display: "grid", gap: 6, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: 800 },
  input: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: 6,
    boxSizing: "border-box",
    font: "inherit",
    minHeight: 38,
    padding: "8px 10px",
    width: "100%",
  },
  textarea: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: 6,
    boxSizing: "border-box",
    font: "13px/1.45 monospace",
    minHeight: 120,
    padding: 10,
    width: "100%",
  },
  checkboxRow: { alignItems: "center", display: "flex", gap: 8, fontSize: 13 },
  slideTypeGrid: { display: "grid", gap: 8 },
  slideTypeButton: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.14)",
    borderRadius: 8,
    color: "inherit",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    padding: 10,
    textAlign: "left",
  },
  slideList: { display: "grid", gap: 8, marginBottom: 16 },
  slideListButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.12)",
    borderRadius: 8,
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    padding: 10,
    textAlign: "left",
  },
  slideListButtonActive: {
    borderColor: "#201c1d",
    boxShadow: "inset 0 0 0 1px #201c1d",
  },
  editor: { display: "grid", gap: 8 },
  editorHeader: {
    alignItems: "start",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },
  optionGrid: { display: "grid", gap: 8, gridTemplateColumns: "repeat(2, 1fr)" },
  actions: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 },
  primaryButton: {
    background: "#201c1d",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "10px 14px",
  },
  secondaryButton: {
    background: "#ffffff",
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: 6,
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 800,
    padding: "9px 12px",
  },
  secondaryLink: {
    border: "1px solid rgba(32, 28, 29, 0.18)",
    borderRadius: 6,
    color: "inherit",
    fontWeight: 800,
    padding: "9px 12px",
    textDecoration: "none",
  },
  codeArea: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: 8,
    boxSizing: "border-box",
    font: "13px/1.45 monospace",
    height: 420,
    marginTop: 14,
    padding: 12,
    width: "100%",
  },
  snippetArea: {
    border: "1px solid rgba(32, 28, 29, 0.16)",
    borderRadius: 8,
    boxSizing: "border-box",
    font: "13px/1.45 monospace",
    height: 150,
    padding: 12,
    width: "100%",
  },
  success: { color: "#176b3a", fontWeight: 700 },
  error: { color: "#a82424", fontWeight: 700 },
};
