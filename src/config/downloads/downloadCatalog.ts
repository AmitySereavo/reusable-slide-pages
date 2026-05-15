export type DownloadCatalogItem = {
  key: string;
  filePath: string;
  fileName: string;
  contentType: string;
};

export const downloadCatalog: DownloadCatalogItem[] = [
  {
    key: "escape-album-mp3",
    filePath: "private-downloads/escape/escape-album-mp3.zip",
    fileName: "Escape Album - MP3.zip",
    contentType: "application/zip",
  },
  {
    key: "escape-album-wav",
    filePath: "private-downloads/escape/escape-album-wav.zip",
    fileName: "Escape Album - WAV.zip",
    contentType: "application/zip",
  },
  {
    key: "good-morning-mp3",
    filePath: "private-downloads/escape/songs/mp3/Good Morning.mp3",
    fileName: "Good Morning.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "good-morning-wav",
    filePath: "private-downloads/escape/songs/wav/Good Morning.wav",
    fileName: "Good Morning.wav",
    contentType: "audio/wav",
  },
  {
    key: "another-brand-guide-pdf",
    filePath: "private-downloads/another-brand/guide.pdf",
    fileName: "Guide.pdf",
    contentType: "application/pdf",
  },
];

export function getDownloadCatalogItem(key: string) {
  return downloadCatalog.find((item) => item.key === key) ?? null;
}