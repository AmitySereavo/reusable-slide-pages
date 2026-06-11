export type DownloadCatalogItem = {
  key: string;
  filePath: string;
  fileName: string;
  contentType: string;
};

export const downloadCatalog: DownloadCatalogItem[] = [
  {
    key: "escape-video-01-vertical",
    filePath: "protected-media/escape/videos/vertical/01-good-morning.mp4",
    fileName: "Good Morning - Lyric Video.mp4",
    contentType: "video/mp4",
  },  
  {
    key: "escape-song-01-mp3",
    filePath: "protected-media/escape/audio/mp3/01-good-morning.mp3",
    fileName: "Good Morning.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-01-wav",
    filePath: "protected-media/escape/audio/wav/01-good-morning.wav",
    fileName: "Good Morning.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-song-02-mp3",
    filePath: "protected-media/escape/audio/mp3/02-life-good.mp3",
    fileName: "Life Good.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-02-wav",
    filePath: "protected-media/escape/audio/wav/02-life-good.wav",
    fileName: "Life Good.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-song-03-mp3",
    filePath: "protected-media/escape/audio/mp3/03-work-hard.mp3",
    fileName: "Work Hard.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-03-wav",
    filePath: "protected-media/escape/audio/wav/03-work-hard.wav",
    fileName: "Work Hard.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-song-04-mp3",
    filePath: "protected-media/escape/audio/mp3/04-income.mp3",
    fileName: "Income.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-04-wav",
    filePath: "protected-media/escape/audio/wav/04-income.wav",
    fileName: "Income.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-song-05-mp3",
    filePath: "protected-media/escape/audio/mp3/05-mystical-feeling.mp3",
    fileName: "Mystical Feeling.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-05-wav",
    filePath: "protected-media/escape/audio/wav/05-mystical-feeling.wav",
    fileName: "Mystical Feeling.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-song-06-mp3",
    filePath: "protected-media/escape/audio/mp3/06-close-to-me.mp3",
    fileName: "Close To Me.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-06-wav",
    filePath: "protected-media/escape/audio/wav/06-close-to-me.wav",
    fileName: "Close To Me.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-song-07-mp3",
    filePath: "protected-media/escape/audio/mp3/07-constantly.mp3",
    fileName: "Constantly.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-07-wav",
    filePath: "protected-media/escape/audio/wav/07-constantly.wav",
    fileName: "Constantly.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-song-08-mp3",
    filePath: "protected-media/escape/audio/mp3/08-judgement.mp3",
    fileName: "Judgement.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-08-wav",
    filePath: "protected-media/escape/audio/wav/08-judgement.wav",
    fileName: "Judgement.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-song-09-mp3",
    filePath: "protected-media/escape/audio/mp3/09-not-misled.mp3",
    fileName: "Not Misled.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-09-wav",
    filePath: "protected-media/escape/audio/wav/09-not-misled.wav",
    fileName: "Not Misled.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-song-10-mp3",
    filePath: "protected-media/escape/audio/mp3/10-cant-let-you-go.mp3",
    fileName: "Can't Let You Go.mp3",
    contentType: "audio/mpeg",
  },
  {
    key: "escape-song-10-wav",
    filePath: "protected-media/escape/audio/wav/10-cant-let-you-go.wav",
    fileName: "Can't Let You Go.wav",
    contentType: "audio/wav",
  },
  {
    key: "escape-album-mp3",
    filePath: "protected-media/escape/downloads/full-album/escape-album-mp3.zip",
    fileName: "Escape Album - MP3.zip",
    contentType: "application/zip",
  },
  {
    key: "escape-album-wav",
    filePath: "protected-media/escape/downloads/full-album/escape-album-wav.zip",
    fileName: "Escape Album - WAV.zip",
    contentType: "application/zip",
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