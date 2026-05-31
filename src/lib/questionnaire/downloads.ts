export function getQuestionnaireDownloadUrl(downloadKey: string) {
  return `/api/downloads/${encodeURIComponent(downloadKey)}`;
}

export function openQuestionnaireDownload(downloadKey: string, label?: string) {
  const downloadUrl = getQuestionnaireDownloadUrl(downloadKey);

  window.open(downloadUrl, "_blank", "noopener,noreferrer");

  return `${
    label ?? "Download"
  } started. If the download did not appear, check your browser downloads or try again.`;
}