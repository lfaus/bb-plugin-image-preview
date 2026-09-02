import { mediaKindForPath } from "./media";

const IMAGE_PREVIEW_ATTRIBUTE = "bbImagePreview";
const IMAGE_PREVIEW_DATA_ATTRIBUTE = "data-bb-image-preview";
const GALLERY_ATTRIBUTE = "bbImagePreviewGallery";
const GALLERY_SOURCE_ATTRIBUTE = "bbImagePreviewGallerySource";
const GALLERY_CLONE_ATTRIBUTE = "bbImagePreviewGalleryImage";
const GALLERY_OWNED_ATTRIBUTE = "bbImagePreviewOwned";
const GALLERY_TILE_ATTRIBUTE = "bbImagePreviewTile";
const GALLERY_INDEX_ATTRIBUTE = "bbImagePreviewIndex";
const GALLERY_NAV_ATTRIBUTE = "bbImagePreviewNav";
const GALLERY_CLOSE_ATTRIBUTE = "bbImagePreviewClose";
const GENERATED_IMAGE_ATTRIBUTE = "bbImagePreviewGenerated";
const IMAGE_LINK_ATTRIBUTE = "bbImagePreviewLink";
const LINK_TARGET_ATTRIBUTE = "bbImagePreviewLinkTarget";
const MEDIA_KIND_ATTRIBUTE = "bbImagePreviewMediaKind";

export const LIGHTBOX_ID = "bb-image-preview-lightbox";

const STYLES_ID = "bb-image-preview-styles";
const MAX_GRID_ITEMS = 4;
const GALLERY_OWNED_SELECTOR = "[data-bb-image-preview-owned='true']";
const GALLERY_SELECTOR = "[data-bb-image-preview-gallery='true']";
const GALLERY_TILE_SELECTOR = "[data-bb-image-preview-tile='true']";

const styles = `
  .bb-image-preview-thumbnail {
    display: block;
    width: auto;
    height: auto;
    max-width: min(100%, 20rem);
    max-height: 16rem;
    object-fit: contain;
    cursor: zoom-in;
    border: 1px solid var(--border, transparent);
    border-radius: var(--radius-lg, 0.75rem);
    box-shadow: 0 0.125rem 0.5rem color-mix(in srgb, var(--foreground, CanvasText) 12%, transparent);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .bb-image-preview-thumbnail:hover,
  .bb-image-preview-thumbnail:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 0.375rem 1rem color-mix(in srgb, var(--foreground, CanvasText) 18%, transparent);
    outline: 2px solid var(--ring, currentColor);
    outline-offset: 2px;
  }

  .bb-image-preview-gallery {
    container-type: inline-size;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.25rem;
    width: min(100%, 24rem);
    max-width: 100%;
    overflow: hidden;
    background: var(--muted, Canvas);
    border: 1px solid var(--border, transparent);
    border-radius: var(--radius-lg, 0.75rem);
  }

  .bb-image-preview-gallery[data-visible-count="2"] {
    aspect-ratio: 2 / 1;
  }

  .bb-image-preview-gallery[data-visible-count="1"] {
    grid-template-columns: minmax(0, 1fr);
    width: min(100%, 20rem);
    aspect-ratio: 4 / 3;
  }

  .bb-image-preview-gallery[data-visible-count="3"] {
    grid-template-columns: 1.25fr 1fr;
    aspect-ratio: 1.5 / 1;
  }

  .bb-image-preview-gallery[data-visible-count="3"]
    [data-bb-image-preview-index="0"] {
    grid-row: span 2;
  }

  .bb-image-preview-gallery[data-visible-count="4"] {
    aspect-ratio: 1 / 1;
  }

  .bb-image-preview-gallery[data-shape="landscape"][data-visible-count="2"] {
    aspect-ratio: 1.8 / 1;
  }

  .bb-image-preview-gallery[data-shape="portrait"][data-visible-count="2"] {
    aspect-ratio: 1 / 1.2;
  }

  .bb-image-preview-gallery-tile {
    position: relative;
    min-width: 0;
    min-height: 0;
    padding: 0;
    overflow: hidden;
    background: var(--card, Canvas);
    border: 0;
    cursor: zoom-in;
  }

  .bb-image-preview-gallery-tile:focus-visible {
    z-index: 1;
    outline: 2px solid var(--ring, currentColor);
    outline-offset: -2px;
  }

  .bb-image-preview-gallery-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 160ms ease;
  }

  .bb-image-preview-gallery-video-placeholder {
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--foreground, CanvasText) 10%, transparent), transparent 48%),
      var(--card, Canvas);
  }

  .bb-image-preview-gallery-play {
    position: absolute;
    z-index: 1;
    top: 50%;
    left: 50%;
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    padding-left: 0.1875rem;
    color: var(--background, Canvas);
    background: color-mix(in srgb, var(--foreground, CanvasText) 82%, transparent);
    border: 1px solid color-mix(in srgb, var(--background, Canvas) 45%, transparent);
    border-radius: 999px;
    box-shadow: 0 0.25rem 1rem color-mix(in srgb, var(--foreground, CanvasText) 28%, transparent);
    font-size: 1.25rem;
    line-height: 1;
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  .bb-image-preview-gallery-tile:hover .bb-image-preview-gallery-image {
    transform: scale(1.025);
  }

  .bb-image-preview-gallery-more {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--foreground, CanvasText);
    background: color-mix(in srgb, var(--background, Canvas) 60%, transparent);
    font-size: 1.5rem;
    font-weight: 650;
    pointer-events: none;
  }

  .bb-image-preview-gallery-source,
  .bb-image-preview-gallery-source-link,
  .bb-image-preview-gallery-empty-source {
    display: none !important;
  }

  #bb-image-preview-lightbox[hidden] {
    display: none;
  }

  #bb-image-preview-lightbox {
    position: fixed;
    z-index: 2147483000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: clamp(1rem, 4vw, 3rem);
    color: var(--foreground, CanvasText);
    background: color-mix(in srgb, var(--background, Canvas) 92%, transparent);
    backdrop-filter: blur(0.375rem);
    color-scheme: light dark;
  }

  .bb-image-preview-dialog {
    position: relative;
    z-index: 2;
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    max-width: min(96vw, 80rem);
    max-height: 100%;
  }

  .bb-image-preview-expanded {
    display: block;
    max-width: min(92vw, 76rem);
    max-height: calc(100vh - 7rem);
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: var(--radius-lg, 0.75rem);
    box-shadow: 0 1rem 3rem color-mix(in srgb, var(--foreground, CanvasText) 30%, transparent);
  }

  .bb-image-preview-expanded[hidden] {
    display: none;
  }

  video.bb-image-preview-expanded {
    background: var(--background, Canvas);
  }

  .bb-image-preview-close,
  .bb-image-preview-nav {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    color: var(--foreground, CanvasText);
    background: var(--card, Canvas);
    border: 1px solid var(--border, transparent);
    border-radius: 999px;
    box-shadow: 0 0.25rem 1rem color-mix(in srgb, var(--foreground, CanvasText) 20%, transparent);
    cursor: pointer;
    font: inherit;
    font-size: 1.5rem;
    line-height: 1;
  }

  .bb-image-preview-close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 3;
    pointer-events: auto;
    touch-action: manipulation;
  }

  .bb-image-preview-nav {
    position: fixed;
    top: 50%;
    z-index: 3;
    pointer-events: auto;
    touch-action: manipulation;
    transform: translateY(-50%);
  }

  .bb-image-preview-nav[data-bb-image-preview-nav="previous"] {
    left: 0.75rem;
  }

  .bb-image-preview-nav[data-bb-image-preview-nav="next"] {
    right: 0.75rem;
  }

  .bb-image-preview-close:hover,
  .bb-image-preview-close:focus-visible,
  .bb-image-preview-nav:hover,
  .bb-image-preview-nav:focus-visible {
    background: var(--accent, var(--card, Canvas));
    outline: 2px solid var(--ring, currentColor);
    outline-offset: 2px;
  }

  .bb-image-preview-counter {
    color: var(--foreground, CanvasText);
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
  }

  .bb-image-preview-caption {
    max-width: min(92vw, 76rem);
    color: var(--muted-foreground, currentColor);
    font-size: 0.875rem;
    text-align: center;
    overflow-wrap: anywhere;
  }

  @media (max-width: 30rem) {
    .bb-image-preview-gallery {
      width: min(100%, 20rem);
    }

    .bb-image-preview-nav {
      top: auto;
      bottom: 1rem;
      transform: none;
    }

    .bb-image-preview-expanded {
      max-height: calc(100vh - 9rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bb-image-preview-thumbnail,
    .bb-image-preview-gallery-image {
      transition: none;
    }
  }
`;

const LIST_MEDIA_RPC_URL = "/api/v1/plugins/image-preview/rpc/listMedia";
const PREVIEW_REFRESH_LEAD_MS = 30_000;

type LocalMediaPath = { kind: "host" | "workspace"; path: string };
type FolderPreview = { urlsByPath: Map<string, string>; expiresAtMs: number };
type ListMediaEnvelope =
  | { ok: true; result: { items: Array<{ path: string; url: string }>; expiresAtMs: number } }
  | { ok: false; error?: { message?: string } };

const folderPreviews = new Map<string, Promise<FolderPreview> | FolderPreview>();

function currentThreadId(): string | null {
  const match = window.location.pathname.match(/(?:^|\/)\b(thr_[A-Za-z0-9_-]+)\b/);
  return match?.[1] ?? null;
}

function normalizeMediaPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/\/+$/, "");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Hrefs BB cannot serve as-is: absolute host paths, file:// URLs, and
 * workspace-relative paths. Everything with a real scheme (http, blob, data)
 * is left alone.
 */
export function localMediaPath(rawHref: string): LocalMediaPath | null {
  const trimmed = rawHref.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("?")) return null;
  if (/^file:\/\//i.test(trimmed)) {
    try {
      return { kind: "host", path: safeDecode(new URL(trimmed).pathname) };
    } catch {
      return null;
    }
  }
  // A drive letter looks like a URL scheme; test it before the scheme check.
  if (/^[a-z]:[\\/]/i.test(trimmed)) {
    return { kind: "host", path: normalizeMediaPath(safeDecode(trimmed.split(/[?#]/)[0] ?? "")) };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  const withoutQuery = safeDecode(trimmed.split(/[?#]/)[0] ?? "");
  if (!withoutQuery) return null;
  if (withoutQuery.startsWith("/")) {
    return { kind: "host", path: normalizeMediaPath(withoutQuery) };
  }
  return { kind: "workspace", path: normalizeMediaPath(withoutQuery.replace(/^\.\//, "")) };
}

async function fetchFolderPreview(
  local: LocalMediaPath,
  threadId: string | null,
): Promise<FolderPreview> {
  const response = await fetch(LIST_MEDIA_RPC_URL, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: local.path,
      source: { kind: local.kind, threadId, environmentId: null, projectId: null },
    }),
  });
  const envelope = (await response.json()) as ListMediaEnvelope;
  if (!response.ok || !envelope.ok) {
    throw new Error(
      (!envelope.ok ? envelope.error?.message : null) ?? "Could not resolve media preview.",
    );
  }
  return {
    urlsByPath: new Map(
      envelope.result.items.map((item) => [normalizeMediaPath(item.path), item.url]),
    ),
    expiresAtMs: envelope.result.expiresAtMs,
  };
}

/** Resolve a local media link to a BB preview URL. One RPC per folder; cached until the preview nears expiry. */
async function resolveLocalMediaUrl(rawHref: string): Promise<string | null> {
  const local = localMediaPath(rawHref);
  if (!local) return null;
  const threadId = currentThreadId();
  if (!threadId) return null;

  const folder = local.path.includes("/") ? local.path.slice(0, local.path.lastIndexOf("/")) : ".";
  const cacheKey = `${local.kind}:${threadId}:${folder}`;
  let entry = folderPreviews.get(cacheKey);
  if (
    entry &&
    !(entry instanceof Promise) &&
    entry.expiresAtMs - Date.now() < PREVIEW_REFRESH_LEAD_MS
  ) {
    folderPreviews.delete(cacheKey);
    entry = undefined;
  }
  if (!entry) {
    entry = fetchFolderPreview(local, threadId).catch((reason: unknown) => {
      folderPreviews.delete(cacheKey);
      throw reason;
    });
    folderPreviews.set(cacheKey, entry);
  }
  const preview = await entry;
  folderPreviews.set(cacheKey, preview);
  return preview.urlsByPath.get(normalizeMediaPath(local.path)) ?? null;
}

type MediaKind = Exclude<ReturnType<typeof mediaKindForPath>, null>;
type MediaElement = HTMLImageElement | HTMLVideoElement;

type OriginalMediaAttributes = {
  className: string;
  role: string | null;
  tabIndex: string | null;
  ariaLabel: string | null;
  ariaHasPopup: string | null;
};

type OriginalLinkAttributes = {
  role: string | null;
  ariaLabel: string | null;
  ariaHasPopup: string | null;
};

type GalleryRecord = {
  messageRoot: Element;
  root: HTMLDivElement;
  sources: MediaElement[];
  hiddenLinks: Set<HTMLAnchorElement>;
  emptyContainers: Set<HTMLElement>;
};

type Lightbox = {
  root: HTMLDivElement;
  image: HTMLImageElement;
  video: HTMLVideoElement;
  caption: HTMLDivElement;
  counter: HTMLDivElement;
  closeButton: HTMLButtonElement;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
};

type ActiveGallery = {
  items: MediaElement[];
  index: number;
};

function mediaKind(media: MediaElement): MediaKind {
  return media instanceof HTMLVideoElement ? "video" : "image";
}

function mediaSource(media: MediaElement): string {
  if (media instanceof HTMLImageElement) {
    return media.currentSrc || media.getAttribute("src") || "";
  }

  const directSource = media.currentSrc || media.getAttribute("src") || "";
  if (directSource) return directSource;

  const nestedSource = media.querySelector<HTMLSourceElement>("source[src]");
  return nestedSource?.src || nestedSource?.getAttribute("src") || "";
}

function mediaKindForUrl(value: string): MediaKind | null {
  try {
    return mediaKindForPath(new URL(value, window.location.href).pathname);
  } catch {
    return mediaKindForPath(value);
  }
}

function isBbFilePreviewUrl(value: string): boolean {
  try {
    return new URL(value, window.location.href).pathname.includes(
      "/api/v1/file-previews/",
    );
  } catch {
    return false;
  }
}

function findMessageAncestor(element: Element): Element | null {
  let current = element.parentElement;
  while (current) {
    const testId = current.getAttribute("data-testid")?.toLowerCase() ?? "";
    const className =
      typeof current.className === "string" ? current.className.toLowerCase() : "";

    if (
      current.tagName === "ARTICLE" ||
      current.hasAttribute("data-message-id") ||
      current.hasAttribute("data-message-role") ||
      current.getAttribute("role") === "article" ||
      testId.includes("message") ||
      testId.includes("conversation") ||
      className.includes("message") ||
      className.includes("markdown") ||
      className.includes("prose")
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function isInsideIgnoredSurface(element: Element): boolean {
  const ignoredAncestor = element.closest(
    "[data-bb-image-preview-ignore], button, [role='button'], [contenteditable='true'], textarea, input, nav, aside, header, form",
  );
  if (
    ignoredAncestor instanceof HTMLAnchorElement &&
    ignoredAncestor.dataset[LINK_TARGET_ATTRIBUTE] === "true"
  ) {
    return false;
  }
  return Boolean(ignoredAncestor);
}

function isLargeEnough(media: MediaElement): boolean {
  if (media instanceof HTMLVideoElement) {
    return (
      media.width >= 64 ||
      media.height >= 64 ||
      media.videoWidth >= 64 ||
      media.videoHeight >= 64
    );
  }

  return (
    media.width >= 64 ||
    media.height >= 64 ||
    media.naturalWidth >= 64 ||
    media.naturalHeight >= 64
  );
}

function mediaShape(media: MediaElement): "landscape" | "portrait" | "square" {
  const width =
    (media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth) ||
    Number(media.getAttribute("width")) ||
    media.width;
  const height =
    (media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight) ||
    Number(media.getAttribute("height")) ||
    media.height;
  if (!width || !height) return "square";
  if (width > height * 1.15) return "landscape";
  if (height > width * 1.15) return "portrait";
  return "square";
}

function galleryShape(media: MediaElement[]): "landscape" | "portrait" | "mixed" {
  const shapes = new Set(media.map(mediaShape));
  if (shapes.size === 1) {
    const shape = shapes.values().next().value;
    if (shape === "landscape" || shape === "portrait") return shape;
  }
  return "mixed";
}

/** Return true for message media and useful media in the main chat area. */
export function isChatMedia(media: MediaElement): boolean {
  if (media.dataset[GALLERY_CLONE_ATTRIBUTE] === "true") return false;
  if (media.dataset[IMAGE_PREVIEW_ATTRIBUTE] === "true") return false;
  if (isInsideIgnoredSurface(media)) return false;

  const source = mediaSource(media);
  if (!source) return false;
  if (findMessageAncestor(media)) return true;

  const isTemporaryMedia =
    source.startsWith("blob:") ||
    source.startsWith("data:image/") ||
    source.startsWith("data:video/");
  const isInMainContent = Boolean(media.closest("main"));
  const hasUsefulDescription =
    (media instanceof HTMLImageElement
      ? media.alt.trim().length > 0
      : Boolean(media.getAttribute("aria-label")?.trim() || media.title.trim())) ||
    mediaKindForUrl(source) !== null;

  return isInMainContent &&
    (isTemporaryMedia || hasUsefulDescription || isLargeEnough(media));
}

/** Backward-compatible image predicate used by existing callers and tests. */
export function isChatImage(image: HTMLImageElement): boolean {
  return isChatMedia(image);
}

function ensureStyles(): HTMLStyleElement {
  const existing = document.getElementById(STYLES_ID);
  if (existing instanceof HTMLStyleElement) return existing;

  const style = document.createElement("style");
  style.id = STYLES_ID;
  style.textContent = styles;
  (document.head ?? document.body).append(style);
  return style;
}

function createLightbox(): Lightbox {
  const root = document.createElement("div");
  root.id = LIGHTBOX_ID;
  root.hidden = true;
  root.dataset[GALLERY_OWNED_ATTRIBUTE] = "true";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Media preview");

  const dialog = document.createElement("div");
  dialog.className = "bb-image-preview-dialog";

  const closeButton = document.createElement("button");
  closeButton.className = "bb-image-preview-close";
  closeButton.type = "button";
  closeButton.dataset[GALLERY_CLOSE_ATTRIBUTE] = "true";
  closeButton.setAttribute("aria-label", "Close media preview");
  closeButton.textContent = "×";

  const previousButton = document.createElement("button");
  previousButton.className = "bb-image-preview-nav";
  previousButton.type = "button";
  previousButton.dataset[GALLERY_NAV_ATTRIBUTE] = "previous";
  previousButton.setAttribute("aria-label", "Previous media item");
  previousButton.textContent = "‹";

  const nextButton = document.createElement("button");
  nextButton.className = "bb-image-preview-nav";
  nextButton.type = "button";
  nextButton.dataset[GALLERY_NAV_ATTRIBUTE] = "next";
  nextButton.setAttribute("aria-label", "Next media item");
  nextButton.textContent = "›";

  const image = document.createElement("img");
  image.className = "bb-image-preview-expanded";
  image.alt = "";

  const video = document.createElement("video");
  video.className = "bb-image-preview-expanded";
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.hidden = true;

  const counter = document.createElement("div");
  counter.className = "bb-image-preview-counter";
  counter.setAttribute("aria-live", "polite");

  const caption = document.createElement("div");
  caption.className = "bb-image-preview-caption";

  dialog.append(
    closeButton,
    previousButton,
    image,
    video,
    nextButton,
    counter,
    caption,
  );
  root.append(dialog);
  document.body.append(root);

  return {
    root,
    image,
    video,
    caption,
    counter,
    closeButton,
    previousButton,
    nextButton,
  };
}

function mediaLabel(media: MediaElement): string {
  if (media instanceof HTMLImageElement) {
    const alt = media.alt.trim();
    if (alt) return alt;
  } else {
    const accessibleLabel = media.getAttribute("aria-label")?.trim();
    if (accessibleLabel) return accessibleLabel;
    const title = media.title.trim();
    if (title) return title;
  }

  const source = mediaSource(media);
  try {
    const pathname = new URL(source, window.location.href).pathname;
    const filename = pathname.split("/").pop();
    if (filename) return decodeURIComponent(filename);
  } catch {
    // A malformed or temporary URL does not need a visible label.
  }

  return media instanceof HTMLVideoElement ? "Video preview" : "Image preview";
}

function rememberMedia(
  media: MediaElement,
  originals: Map<MediaElement, OriginalMediaAttributes>,
): void {
  if (originals.has(media)) return;
  originals.set(media, {
    className: media.className,
    role: media.getAttribute("role"),
    tabIndex: media.getAttribute("tabindex"),
    ariaLabel: media.getAttribute("aria-label"),
    ariaHasPopup: media.getAttribute("aria-haspopup"),
  });
}

function rememberLink(
  link: HTMLAnchorElement,
  originals: Map<HTMLAnchorElement, OriginalLinkAttributes>,
): void {
  if (originals.has(link)) return;
  originals.set(link, {
    role: link.getAttribute("role"),
    ariaLabel: link.getAttribute("aria-label"),
    ariaHasPopup: link.getAttribute("aria-haspopup"),
  });
}

function configureLinkedImageTrigger(
  image: HTMLImageElement,
  links: Map<HTMLAnchorElement, OriginalLinkAttributes>,
): boolean {
  const link = image.closest<HTMLAnchorElement>("a");
  if (!link) return false;

  rememberLink(link, links);
  link.dataset[LINK_TARGET_ATTRIBUTE] = "true";
  if (!link.hasAttribute("role")) link.setAttribute("role", "button");
  if (!link.hasAttribute("aria-label")) {
    link.setAttribute("aria-label", `Open image: ${mediaLabel(image)}`);
  }
  link.setAttribute("aria-haspopup", "dialog");

  image.removeAttribute("role");
  image.removeAttribute("tabindex");
  image.removeAttribute("aria-label");
  return true;
}

function addImagePreview(
  image: HTMLImageElement,
  originals: Map<MediaElement, OriginalMediaAttributes>,
  links: Map<HTMLAnchorElement, OriginalLinkAttributes>,
): void {
  if (!isChatImage(image)) return;

  rememberMedia(image, originals);
  image.dataset[IMAGE_PREVIEW_ATTRIBUTE] = "true";
  image.dataset[MEDIA_KIND_ATTRIBUTE] = "image";
  image.classList.add("bb-image-preview-thumbnail");
  if (!configureLinkedImageTrigger(image, links)) {
    if (!image.hasAttribute("role")) image.setAttribute("role", "button");
    if (!image.hasAttribute("tabindex")) image.setAttribute("tabindex", "0");
    if (!image.hasAttribute("aria-label")) {
      image.setAttribute("aria-label", `Open image: ${mediaLabel(image)}`);
    }
    image.setAttribute("aria-haspopup", "dialog");
  }
}

function addMediaLinkPreview(
  link: HTMLAnchorElement,
  generatedMedia: Map<MediaElement, HTMLAnchorElement>,
  onResolved?: () => void,
): void {
  if (link.dataset[IMAGE_LINK_ATTRIBUTE] === "true") return;
  if (isInsideIgnoredSurface(link)) return;
  if (!findMessageAncestor(link)) return;

  const href = link.href || link.getAttribute("href") || "";
  const kind = mediaKindForUrl(href);
  if (!kind) return;
  if (link.querySelector("img, video")) return;

  const rawHref = link.getAttribute("href") ?? href;
  const local = localMediaPath(rawHref);
  const generated =
    kind === "video"
      ? document.createElement("video")
      : document.createElement("img");
  const label = link.textContent?.trim() ||
    (kind === "video" ? "Video preview" : "Image preview");
  if (generated instanceof HTMLVideoElement) {
    generated.preload = "none";
    generated.muted = true;
    generated.playsInline = true;
    generated.controls = false;
    generated.autoplay = false;
    generated.setAttribute("aria-label", label);
  } else {
    generated.alt = label;
    generated.loading = "lazy";
    generated.decoding = "async";
  }
  generated.dataset[GENERATED_IMAGE_ATTRIBUTE] = "true";
  generated.dataset[MEDIA_KIND_ATTRIBUTE] = kind;
  link.append(" ", generated);
  link.dataset[IMAGE_LINK_ATTRIBUTE] = "true";
  generatedMedia.set(generated, link);

  // Start with the raw href so the element joins its gallery at once, unless
  // it is a file:// URL, which the renderer refuses outright ("Not allowed to
  // load local resource"). A local path is not a URL BB can serve, so mint a
  // preview URL through the plugin server and swap it in; galleries rebuild
  // once it lands.
  if (!/^file:\/\//i.test(rawHref)) generated.src = href;
  if (!local) return;
  void resolveLocalMediaUrl(rawHref)
    .then((url) => {
      if (!url || !generated.isConnected || generated.getAttribute("src") === url) return;
      generated.src = url;
      onResolved?.();
    })
    .catch(() => {
      // Leave the raw href in place; the tile shows the broken-image state.
    });
}

function scanLinks(
  root: ParentNode,
  generatedMedia: Map<MediaElement, HTMLAnchorElement>,
  onResolved?: () => void,
): void {
  const links = root instanceof HTMLAnchorElement ? [root] : Array.from(root.querySelectorAll("a"));
  for (const link of links) addMediaLinkPreview(link, generatedMedia, onResolved);
}

function directChildOf(root: Element, element: Element): Element | null {
  let current = element;
  while (current.parentElement && current.parentElement !== root) {
    current = current.parentElement;
  }
  return current.parentElement === root ? current : null;
}

function isGalleryOnlyContainer(container: Element): boolean {
  for (const child of Array.from(container.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent?.trim()) return false;
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const element = child as Element;
    if (
      (element instanceof HTMLImageElement || element instanceof HTMLVideoElement) &&
      element.dataset[GALLERY_SOURCE_ATTRIBUTE] === "true"
    ) {
      continue;
    }
    if (
      element instanceof HTMLAnchorElement &&
      element.dataset[IMAGE_LINK_ATTRIBUTE] === "true"
    ) {
      continue;
    }
    return false;
  }

  return true;
}

function buildGallery(
  messageRoot: Element,
  sources: MediaElement[],
  originals: Map<MediaElement, OriginalMediaAttributes>,
  galleries: Map<HTMLDivElement, GalleryRecord>,
): void {
  const visibleCount = Math.min(MAX_GRID_ITEMS, sources.length);
  const gallery = document.createElement("div");
  gallery.className = "bb-image-preview-gallery";
  gallery.dataset[GALLERY_ATTRIBUTE] = "true";
  gallery.dataset[GALLERY_OWNED_ATTRIBUTE] = "true";
  gallery.dataset.visibleCount = String(visibleCount);
  gallery.dataset.totalCount = String(sources.length);
  gallery.dataset.shape = galleryShape(sources);
  gallery.setAttribute("role", "group");
  const kinds = new Set(sources.map(mediaKind));
  const galleryKindLabel =
    kinds.size > 1 ? "media items" : kinds.has("video") ? "videos" : "images";
  gallery.setAttribute("aria-label", `${sources.length} ${galleryKindLabel}`);

  const hiddenLinks = new Set<HTMLAnchorElement>();
  const emptyContainers = new Set<HTMLElement>();

  for (const source of sources) {
    rememberMedia(source, originals);
    source.dataset[GALLERY_SOURCE_ATTRIBUTE] = "true";
    source.dataset[MEDIA_KIND_ATTRIBUTE] = mediaKind(source);
    source.classList.add("bb-image-preview-gallery-source");
    if (source instanceof HTMLVideoElement) source.pause();

    const link = source.closest<HTMLAnchorElement>("a");
    if (link) {
      hiddenLinks.add(link);
      link.classList.add("bb-image-preview-gallery-source-link");
    }
  }

  for (const source of sources) {
    const parent = source.parentElement;
    if (parent && parent !== messageRoot && isGalleryOnlyContainer(parent)) {
      emptyContainers.add(parent as HTMLElement);
      parent.classList.add("bb-image-preview-gallery-empty-source");
    }
  }

  const insertionPoint = directChildOf(messageRoot, sources[0]);
  if (insertionPoint) messageRoot.insertBefore(gallery, insertionPoint);
  else messageRoot.append(gallery);

  for (let index = 0; index < visibleCount; index += 1) {
    const source = sources[index];
    const kind = mediaKind(source);
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "bb-image-preview-gallery-tile";
    tile.dataset[GALLERY_TILE_ATTRIBUTE] = "true";
    tile.dataset[GALLERY_INDEX_ATTRIBUTE] = String(index);
    tile.dataset[MEDIA_KIND_ATTRIBUTE] = kind;
    tile.setAttribute("aria-haspopup", "dialog");
    tile.setAttribute(
      "aria-label",
      kind === "video"
        ? `Play video ${index + 1} of ${sources.length} in expanded view: ${mediaLabel(source)}`
        : `Open image ${index + 1} of ${sources.length}: ${mediaLabel(source)}`,
    );

    if (source instanceof HTMLVideoElement) {
      const poster = source.poster || source.getAttribute("poster") || "";
      if (poster) {
        const preview = document.createElement("img");
        preview.className = "bb-image-preview-gallery-image";
        preview.src = poster;
        preview.alt = "";
        preview.loading = "lazy";
        preview.decoding = "async";
        preview.dataset[GALLERY_CLONE_ATTRIBUTE] = "true";
        tile.append(preview);
      } else {
        const preview = document.createElement("video");
        preview.className = "bb-image-preview-gallery-image";
        preview.src = mediaSource(source);
        preview.preload = "metadata";
        preview.muted = true;
        preview.playsInline = true;
        preview.controls = false;
        preview.autoplay = false;
        preview.setAttribute("aria-hidden", "true");
        preview.dataset[GALLERY_CLONE_ATTRIBUTE] = "true";
        tile.append(preview);
      }

      const play = document.createElement("span");
      play.className = "bb-image-preview-gallery-play";
      play.setAttribute("aria-hidden", "true");
      play.textContent = "▶";
      tile.append(play);
    } else {
      const preview = document.createElement("img");
      preview.className = "bb-image-preview-gallery-image";
      preview.src = mediaSource(source);
      preview.alt = source.alt;
      preview.loading = "lazy";
      preview.decoding = "async";
      preview.dataset[GALLERY_CLONE_ATTRIBUTE] = "true";
      tile.append(preview);
    }

    if (index === visibleCount - 1 && sources.length > visibleCount) {
      const more = document.createElement("span");
      more.className = "bb-image-preview-gallery-more";
      more.textContent = `+${sources.length - visibleCount}`;
      tile.append(more);
    }

    gallery.append(tile);
  }

  const record: GalleryRecord = {
    messageRoot,
    root: gallery,
    sources,
    hiddenLinks,
    emptyContainers,
  };
  galleries.set(gallery, record);
}

function restoreMedia(
  media: MediaElement,
  original: OriginalMediaAttributes,
): void {
  media.className = original.className;
  if (original.role === null) media.removeAttribute("role");
  else media.setAttribute("role", original.role);
  if (original.tabIndex === null) media.removeAttribute("tabindex");
  else media.setAttribute("tabindex", original.tabIndex);
  if (original.ariaLabel === null) media.removeAttribute("aria-label");
  else media.setAttribute("aria-label", original.ariaLabel);
  if (original.ariaHasPopup === null) media.removeAttribute("aria-haspopup");
  else media.setAttribute("aria-haspopup", original.ariaHasPopup);
  media.removeAttribute(IMAGE_PREVIEW_DATA_ATTRIBUTE);
  media.removeAttribute("data-bb-image-preview-gallery-source");
  media.removeAttribute("data-bb-image-preview-media-kind");
}

function destroyGallery(
  record: GalleryRecord,
  originals: Map<MediaElement, OriginalMediaAttributes>,
  galleries: Map<HTMLDivElement, GalleryRecord>,
): void {
  galleries.delete(record.root);
  record.root.remove();

  for (const source of record.sources) {
    const original = originals.get(source);
    if (original) {
      restoreMedia(source, original);
      originals.delete(source);
    }
  }
  for (const link of record.hiddenLinks) {
    link.classList.remove("bb-image-preview-gallery-source-link");
  }
  for (const container of record.emptyContainers) {
    container.classList.remove("bb-image-preview-gallery-empty-source");
  }
}

function restoreAllMedia(
  originals: Map<MediaElement, OriginalMediaAttributes>,
): void {
  for (const [media, original] of originals) restoreMedia(media, original);
  originals.clear();
}

function refreshGalleries(
  originals: Map<MediaElement, OriginalMediaAttributes>,
  galleries: Map<HTMLDivElement, GalleryRecord>,
  links: Map<HTMLAnchorElement, OriginalLinkAttributes>,
): void {
  for (const record of Array.from(galleries.values())) {
    destroyGallery(record, originals, galleries);
  }
  restoreAllMedia(originals);

  const groupedMedia = new Map<Element, MediaElement[]>();
  const mediaElements = Array.from(document.querySelectorAll("img, video")).filter(
    (media): media is MediaElement =>
      media instanceof HTMLImageElement || media instanceof HTMLVideoElement,
  );
  for (const media of mediaElements) {
    if (!isChatMedia(media)) continue;

    const messageRoot = findMessageAncestor(media);
    if (!messageRoot) {
      if (media instanceof HTMLImageElement) {
        addImagePreview(media, originals, links);
      } else {
        const standaloneRoot =
          media.parentElement instanceof HTMLAnchorElement
            ? media.parentElement.parentElement
            : media.parentElement;
        if (standaloneRoot) buildGallery(standaloneRoot, [media], originals, galleries);
      }
      continue;
    }

    const group = groupedMedia.get(messageRoot) ?? [];
    group.push(media);
    groupedMedia.set(messageRoot, group);
  }

  for (const [messageRoot, group] of groupedMedia) {
    if (group.length > 1) buildGallery(messageRoot, group, originals, galleries);
    else if (group[0] instanceof HTMLVideoElement) {
      buildGallery(messageRoot, group, originals, galleries);
    } else {
      addImagePreview(group[0], originals, links);
    }
  }
}

function hasMediaContent(element: Element): boolean {
  if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement) return true;
  if (element instanceof HTMLAnchorElement) {
    return mediaKindForUrl(element.href || element.getAttribute("href") || "") !== null;
  }
  if (element.querySelector("img, video")) return true;
  return Array.from(element.querySelectorAll("a")).some((link) =>
    mediaKindForUrl(link.href || link.getAttribute("href") || "") !== null,
  );
}

export function mountImagePreview(signal: AbortSignal): () => void {
  let disposed = false;
  let observer: MutationObserver | null = null;
  let bodyReadyListener: (() => void) | null = null;
  let lightbox: Lightbox | null = null;
  let activeGallery: ActiveGallery | null = null;
  let previousFocus: HTMLElement | null = null;
  let originalOverflow: string | null = null;
  let expandedVideoObjectUrl: string | null = null;
  let expandedVideoLoadToken = 0;

  const originals = new Map<MediaElement, OriginalMediaAttributes>();
  const generatedMedia = new Map<MediaElement, HTMLAnchorElement>();
  const galleries = new Map<HTMLDivElement, GalleryRecord>();
  const linkedImageTriggers = new Map<HTMLAnchorElement, OriginalLinkAttributes>();

  ensureStyles();

  const resetExpandedVideo = () => {
    expandedVideoLoadToken += 1;
    if (expandedVideoObjectUrl) {
      URL.revokeObjectURL(expandedVideoObjectUrl);
      expandedVideoObjectUrl = null;
    }
    if (!lightbox) return;
    const { video } = lightbox;
    const hadSource = video.hasAttribute("src");
    if (hadSource || !video.paused) video.pause();
    video.removeAttribute("src");
    video.removeAttribute("poster");
    video.removeAttribute("aria-label");
    video.hidden = true;
    if (hadSource) video.load();
  };

  const renderLightbox = () => {
    if (!lightbox || !activeGallery) return;

    const item = activeGallery.items[activeGallery.index];
    const kind = mediaKind(item);
    const label = mediaLabel(item);
    if (item instanceof HTMLVideoElement) {
      resetExpandedVideo();
      lightbox.image.hidden = true;
      lightbox.image.removeAttribute("src");
      lightbox.image.alt = "";
      lightbox.video.hidden = false;
      const source = mediaSource(item);
      const loadToken = expandedVideoLoadToken;
      const expandedLightbox = lightbox;
      const poster = item.poster || item.getAttribute("poster") || "";
      if (poster) lightbox.video.poster = poster;
      lightbox.video.setAttribute("aria-label", label);
      if (!isBbFilePreviewUrl(source)) {
        lightbox.video.src = source;
      } else {
        void fetch(source, { credentials: "same-origin" })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Video preview returned ${response.status}`);
            }
            return response.blob();
          })
          .then((blob) => {
            if (
              loadToken !== expandedVideoLoadToken ||
              expandedLightbox.root.hidden ||
              !activeGallery ||
              expandedLightbox.video.hidden
            ) {
              return;
            }
            expandedVideoObjectUrl = URL.createObjectURL(blob);
            expandedLightbox.video.src = expandedVideoObjectUrl;
          })
          .catch(() => {
            if (loadToken === expandedVideoLoadToken && !expandedLightbox.video.src) {
              expandedLightbox.video.src = source;
            }
          });
      }
    } else {
      resetExpandedVideo();
      lightbox.image.hidden = false;
      lightbox.image.src = mediaSource(item);
      lightbox.image.alt = item.alt;
    }
    lightbox.caption.textContent = label;
    lightbox.counter.textContent = `${activeGallery.index + 1} / ${activeGallery.items.length}`;
    lightbox.previousButton.hidden = activeGallery.items.length < 2;
    lightbox.nextButton.hidden = activeGallery.items.length < 2;
    lightbox.root.setAttribute(
      "aria-label",
      `${kind === "video" ? "Video" : "Image"} preview: ${label}`,
    );
    lightbox.root.hidden = false;
  };

  const closeLightbox = () => {
    activeGallery = null;
    if (!lightbox) return;
    resetExpandedVideo();
    if (lightbox.root.hidden) return;

    lightbox.root.hidden = true;
    lightbox.image.removeAttribute("src");
    lightbox.image.hidden = false;
    lightbox.caption.textContent = "";
    lightbox.counter.textContent = "";
    if (originalOverflow !== null) {
      document.body.style.overflow = originalOverflow;
      originalOverflow = null;
    }

    const focusTarget = previousFocus;
    previousFocus = null;
    if (focusTarget?.isConnected) focusTarget.focus();
  };

  const openGallery = (items: MediaElement[], index: number) => {
    const item = items[index];
    if (!item || !mediaSource(item)) return;
    if (!lightbox) {
      lightbox = createLightbox();
      lightbox.closeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeLightbox();
      });
      lightbox.previousButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        navigateGallery(-1);
      });
      lightbox.nextButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        navigateGallery(1);
      });
    }

    if (lightbox.root.hidden) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    activeGallery = { items, index };
    renderLightbox();
    lightbox.closeButton.focus();
  };

  const navigateGallery = (delta: number) => {
    if (!activeGallery || activeGallery.items.length < 2) return;
    const length = activeGallery.items.length;
    activeGallery.index = (activeGallery.index + delta + length) % length;
    renderLightbox();
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const closeButton = target.closest<HTMLButtonElement>(
      `[data-${GALLERY_CLOSE_ATTRIBUTE.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}='true']`,
    );
    if (closeButton) {
      event.preventDefault();
      event.stopPropagation();
      closeLightbox();
      return;
    }

    const navButton = target.closest<HTMLButtonElement>(
      `[data-${GALLERY_NAV_ATTRIBUTE.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`,
    );
    if (navButton) {
      event.preventDefault();
      event.stopPropagation();
      navigateGallery(navButton.dataset[GALLERY_NAV_ATTRIBUTE] === "previous" ? -1 : 1);
      return;
    }

    const tile = target.closest<HTMLButtonElement>(GALLERY_TILE_SELECTOR);
    if (tile) {
      const galleryElement = tile.closest<HTMLDivElement>(GALLERY_SELECTOR);
      const record = galleryElement ? galleries.get(galleryElement) : undefined;
      const index = Number(tile.dataset[GALLERY_INDEX_ATTRIBUTE]);
      if (!record || !Number.isInteger(index)) return;

      event.preventDefault();
      event.stopPropagation();
      openGallery(record.sources, index);
      return;
    }

    const linkedImage = target.closest<HTMLAnchorElement>(
      `[data-${LINK_TARGET_ATTRIBUTE.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}='true']`,
    );
    if (linkedImage) {
      const image = linkedImage.querySelector<HTMLImageElement>(
        `img[${IMAGE_PREVIEW_DATA_ATTRIBUTE}]`,
      );
      if (!image) return;
      event.preventDefault();
      event.stopPropagation();
      openGallery([image], 0);
      return;
    }

    const image = target.closest<HTMLImageElement>(`img[${IMAGE_PREVIEW_DATA_ATTRIBUTE}]`);
    if (!image) return;

    event.preventDefault();
    event.stopPropagation();
    openGallery([image], 0);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeLightbox();
      return;
    }
    if (activeGallery && event.key === "ArrowLeft") {
      event.preventDefault();
      navigateGallery(-1);
      return;
    }
    if (activeGallery && event.key === "ArrowRight") {
      event.preventDefault();
      navigateGallery(1);
      return;
    }

    const target = event.target;
    if (
      target instanceof HTMLAnchorElement &&
      target.dataset[LINK_TARGET_ATTRIBUTE] === "true" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      const image = target.querySelector<HTMLImageElement>(
        `img[${IMAGE_PREVIEW_DATA_ATTRIBUTE}]`,
      );
      if (!image) return;
      event.preventDefault();
      openGallery([image], 0);
      return;
    }
    if (
      target instanceof HTMLImageElement &&
      target.dataset[IMAGE_PREVIEW_ATTRIBUTE] === "true" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      openGallery([target], 0);
    }
  };

  const onBackdropClick = (event: MouseEvent) => {
    if (event.target === lightbox?.root) closeLightbox();
  };

  let refreshTimer: number | null = null;
  const scheduleRefresh = () => {
    if (disposed) return;
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      if (!disposed) refreshGalleries(originals, galleries, linkedImageTriggers);
    }, 50);
  };

  const mountBody = () => {
    if (disposed || !document.body) return;
    scanLinks(document, generatedMedia, scheduleRefresh);
    refreshGalleries(originals, galleries, linkedImageTriggers);
    observer = new MutationObserver((records) => {
      let changed = false;
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const element = node as Element;
          if (element.matches(GALLERY_OWNED_SELECTOR) || element.closest(GALLERY_OWNED_SELECTOR)) {
            continue;
          }
          if (!hasMediaContent(element)) continue;
          scanLinks(element, generatedMedia, scheduleRefresh);
          changed = true;
        }
        for (const node of Array.from(record.removedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const element = node as Element;
          if (element.matches(GALLERY_OWNED_SELECTOR) || element.closest(GALLERY_OWNED_SELECTOR)) {
            continue;
          }
          if (hasMediaContent(element)) changed = true;
        }
      }
      if (changed) refreshGalleries(originals, galleries, linkedImageTriggers);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("click", onBackdropClick);

  if (document.body) mountBody();
  else {
    bodyReadyListener = mountBody;
    document.addEventListener("DOMContentLoaded", bodyReadyListener, { once: true });
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    folderPreviews.clear();
    observer?.disconnect();
    observer = null;
    if (bodyReadyListener) {
      document.removeEventListener("DOMContentLoaded", bodyReadyListener);
      bodyReadyListener = null;
    }

    closeLightbox();
    lightbox?.root.remove();
    lightbox = null;

    for (const record of Array.from(galleries.values())) {
      destroyGallery(record, originals, galleries);
    }
    restoreAllMedia(originals);

    for (const [media, link] of generatedMedia) {
      if (media instanceof HTMLVideoElement) media.pause();
      media.remove();
      delete link.dataset[IMAGE_LINK_ATTRIBUTE];
    }
    generatedMedia.clear();

    for (const [link, original] of linkedImageTriggers) {
      if (original.role === null) link.removeAttribute("role");
      else link.setAttribute("role", original.role);
      if (original.ariaLabel === null) link.removeAttribute("aria-label");
      else link.setAttribute("aria-label", original.ariaLabel);
      if (original.ariaHasPopup === null) link.removeAttribute("aria-haspopup");
      else link.setAttribute("aria-haspopup", original.ariaHasPopup);
      delete link.dataset[LINK_TARGET_ATTRIBUTE];
    }
    linkedImageTriggers.clear();

    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("click", onBackdropClick);
    document.getElementById(STYLES_ID)?.remove();
  };

  if (signal.aborted) dispose();
  else signal.addEventListener("abort", dispose, { once: true });

  return dispose;
}
