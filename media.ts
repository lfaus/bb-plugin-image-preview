export const IMAGE_EXTENSIONS = [
  "avif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
] as const;

export const VIDEO_EXTENSIONS = [
  "m4v",
  "mov",
  "mp4",
  "ogg",
  "ogv",
  "webm",
] as const;

export const MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
] as const;

export const ALL_MEDIA_EXTENSIONS = MEDIA_EXTENSIONS;

export type MediaKind = "image" | "video";

const imageExtensions = new Set<string>(IMAGE_EXTENSIONS);
const videoExtensions = new Set<string>(VIDEO_EXTENSIONS);

export function mediaKindForPath(filePath: string): MediaKind | null {
  const rawFilename = filePath.split(/[\\/]/).pop() ?? "";
  const dotIndex = rawFilename.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === rawFilename.length - 1) return null;

  const suffixDelimiters = [
    rawFilename.indexOf("?", dotIndex + 1),
    rawFilename.indexOf("#", dotIndex + 1),
  ].filter((index) => index >= 0);
  const extensionEnd =
    suffixDelimiters.length > 0 ? Math.min(...suffixDelimiters) : rawFilename.length;

  const extension = rawFilename.slice(dotIndex + 1, extensionEnd).toLowerCase();
  if (imageExtensions.has(extension)) return "image";
  if (videoExtensions.has(extension)) return "video";
  return null;
}
