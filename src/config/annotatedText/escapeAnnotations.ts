import { AnnotatedTextCatalog } from "@/lib/questionnaire/annotatedText";

const escapeGoodMorningAnnotations: AnnotatedTextCatalog = {
  "three-little-birds-shirt": {
    id: "three-little-birds-shirt",
    type: "product",
    title: "Three Little Birds T-shirt",
    body: "A shirt concept connected to the lyric phrase.",
    imageUrl: "/images/placeholders/product-placeholder.svg",
    priceLabel: "$3,500 JMD",
    buttonLabel: "View item",
    url: "/questionnaire/invitation",
  },
  "good-morning-shirt": {
    id: "good-morning-shirt",
    type: "product",
    title: "Good Morning T-shirt",
    body: "Merch based on the Good Morning hook.",
    imageUrl: "/images/placeholders/product-placeholder.svg",
    priceLabel: "$3,500 JMD",
    buttonLabel: "View item",
    url: "/questionnaire/invitation",
  },
  "coffee-shirt": {
    id: "coffee-shirt",
    type: "product",
    title: "Smell Di Coffee T-shirt",
    body: "Merch idea connected to the coffee lyric.",
    imageUrl: "/images/placeholders/product-placeholder.svg",
    priceLabel: "$3,500 JMD",
    buttonLabel: "View item",
    url: "/questionnaire/invitation",
  },
  "rock-the-world-shirt": {
    id: "rock-the-world-shirt",
    type: "product",
    title: "Rock The World T-shirt",
    body: "Merch idea connected to the wake-up lyric.",
    imageUrl: "/images/placeholders/product-placeholder.svg",
    priceLabel: "$3,500 JMD",
    buttonLabel: "View item",
    url: "/questionnaire/invitation",
  },
  ohayo: {
    id: "ohayo",
    type: "definition",
    title: "Ohayo",
    body: "A Japanese greeting commonly used to mean good morning.",
  },
  bonjour: {
    id: "bonjour",
    type: "definition",
    title: "Bonjour",
    body: "A French greeting that can mean good morning or hello.",
  },
  "good-morning-video": {
    id: "good-morning-video",
    type: "video",
    title: "Good Morning lyric video",
    body: "Open the protected lyric video.",
    buttonLabel: "Open video",
    url: "/api/downloads/escape-video-01-vertical",
  },
};

const escapeStoryAnnotations: AnnotatedTextCatalog = {
  "escape-album-page": {
    id: "escape-album-page",
    type: "url",
    title: "Escape Album",
    body: "Open the Escape album deliverable flow.",
    buttonLabel: "Open album flow",
    url: "/questionnaire/escape-album",
  },
  "sample-video-link": {
    id: "sample-video-link",
    type: "video",
    title: "Sample video link",
    body: "This is a test video annotation that can lead to a protected or public video URL.",
    buttonLabel: "Open video",
    url: "/api/downloads/escape-video-01-vertical",
  },
};

const annotatedTextCatalogs: Record<string, AnnotatedTextCatalog> = {
  "escape-good-morning": escapeGoodMorningAnnotations,
  "escape-story-test": escapeStoryAnnotations,
};

export function getAnnotatedTextCatalog(key?: string) {
  if (!key) {
    return {};
  }

  return annotatedTextCatalogs[key] ?? {};
}