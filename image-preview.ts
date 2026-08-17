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

export const LIGHTBOX_ID = "bb-image-preview-lightbox";

const STYLES_ID = "bb-image-preview-styles";
const MAX_GRID_ITEMS = 4;
const IMAGE_FILE_PATTERN = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
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

type OriginalImageAttributes = {
  className: string;
  role: string | null;
  tabIndex: string | null;
  ariaLabel: string | null;
};

type GalleryRecord = {
  messageRoot: Element;
  root: HTMLDivElement;
  sources: HTMLImageElement[];
  hiddenLinks: Set<HTMLAnchorElement>;
  emptyContainers: Set<HTMLElement>;
};

type Lightbox = {
  root: HTMLDivElement;
  image: HTMLImageElement;
  caption: HTMLDivElement;
  counter: HTMLDivElement;
  closeButton: HTMLButtonElement;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
};

type ActiveGallery = {
  items: HTMLImageElement[];
  index: number;
};

function imageSource(image: HTMLImageElement): string {
  return image.currentSrc || image.getAttribute("src") || "";
}

function isImageFileUrl(value: string): boolean {
  try {
    return IMAGE_FILE_PATTERN.test(new URL(value, window.location.href).pathname);
  } catch {
    return IMAGE_FILE_PATTERN.test(value);
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
  return Boolean(
    element.closest(
      "[data-bb-image-preview-ignore], button, [role='button'], [contenteditable='true'], textarea, input, nav, aside, header, form",
    ),
  );
}

function isLargeEnough(image: HTMLImageElement): boolean {
  return (
    image.width >= 64 ||
    image.height >= 64 ||
    image.naturalWidth >= 64 ||
    image.naturalHeight >= 64
  );
}

function imageShape(image: HTMLImageElement): "landscape" | "portrait" | "square" {
  const width = image.naturalWidth || Number(image.getAttribute("width")) || image.width;
  const height = image.naturalHeight || Number(image.getAttribute("height")) || image.height;
  if (!width || !height) return "square";
  if (width > height * 1.15) return "landscape";
  if (height > width * 1.15) return "portrait";
  return "square";
}

function galleryShape(images: HTMLImageElement[]): "landscape" | "portrait" | "mixed" {
  const shapes = new Set(images.map(imageShape));
  if (shapes.size === 1) {
    const shape = shapes.values().next().value;
    if (shape === "landscape" || shape === "portrait") return shape;
  }
  return "mixed";
}

/** Return true for message images and useful image links in the main chat area. */
export function isChatImage(image: HTMLImageElement): boolean {
  if (image.dataset[GALLERY_CLONE_ATTRIBUTE] === "true") return false;
  if (image.dataset[IMAGE_PREVIEW_ATTRIBUTE] === "true") return false;
  if (isInsideIgnoredSurface(image)) return false;

  const source = imageSource(image);
  if (!source) return false;
  if (findMessageAncestor(image)) return true;

  const isTemporaryImage = source.startsWith("blob:") || source.startsWith("data:image/");
  const isInMainContent = Boolean(image.closest("main"));
  const hasUsefulDescription = image.alt.trim().length > 0 || isImageFileUrl(source);

  return isInMainContent && (isTemporaryImage || hasUsefulDescription || isLargeEnough(image));
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
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Image preview");

  const dialog = document.createElement("div");
  dialog.className = "bb-image-preview-dialog";

  const closeButton = document.createElement("button");
  closeButton.className = "bb-image-preview-close";
  closeButton.type = "button";
  closeButton.dataset[GALLERY_CLOSE_ATTRIBUTE] = "true";
  closeButton.setAttribute("aria-label", "Close image preview");
  closeButton.textContent = "×";

  const previousButton = document.createElement("button");
  previousButton.className = "bb-image-preview-nav";
  previousButton.type = "button";
  previousButton.dataset[GALLERY_NAV_ATTRIBUTE] = "previous";
  previousButton.setAttribute("aria-label", "Previous image");
  previousButton.textContent = "‹";

  const nextButton = document.createElement("button");
  nextButton.className = "bb-image-preview-nav";
  nextButton.type = "button";
  nextButton.dataset[GALLERY_NAV_ATTRIBUTE] = "next";
  nextButton.setAttribute("aria-label", "Next image");
  nextButton.textContent = "›";

  const image = document.createElement("img");
  image.className = "bb-image-preview-expanded";
  image.alt = "";

  const counter = document.createElement("div");
  counter.className = "bb-image-preview-counter";
  counter.setAttribute("aria-live", "polite");

  const caption = document.createElement("div");
  caption.className = "bb-image-preview-caption";

  dialog.append(closeButton, previousButton, image, nextButton, counter, caption);
  root.append(dialog);
  document.body.append(root);

  return {
    root,
    image,
    caption,
    counter,
    closeButton,
    previousButton,
    nextButton,
  };
}

function imageLabel(image: HTMLImageElement): string {
  const alt = image.alt.trim();
  if (alt) return alt;

  const source = imageSource(image);
  try {
    const pathname = new URL(source, window.location.href).pathname;
    const filename = pathname.split("/").pop();
    if (filename) return decodeURIComponent(filename);
  } catch {
    // A malformed or temporary URL does not need a visible label.
  }

  return "Image preview";
}

function rememberImage(
  image: HTMLImageElement,
  originals: Map<HTMLImageElement, OriginalImageAttributes>,
): void {
  if (originals.has(image)) return;
  originals.set(image, {
    className: image.className,
    role: image.getAttribute("role"),
    tabIndex: image.getAttribute("tabindex"),
    ariaLabel: image.getAttribute("aria-label"),
  });
}

function addImagePreview(
  image: HTMLImageElement,
  originals: Map<HTMLImageElement, OriginalImageAttributes>,
): void {
  if (!isChatImage(image)) return;

  rememberImage(image, originals);
  image.dataset[IMAGE_PREVIEW_ATTRIBUTE] = "true";
  image.classList.add("bb-image-preview-thumbnail");
  if (!image.hasAttribute("role")) image.setAttribute("role", "button");
  if (!image.hasAttribute("tabindex")) image.setAttribute("tabindex", "0");
  if (!image.hasAttribute("aria-label")) {
    image.setAttribute("aria-label", `Open image: ${imageLabel(image)}`);
  }
}

function addImageLinkPreview(
  link: HTMLAnchorElement,
  generatedImages: Map<HTMLImageElement, HTMLAnchorElement>,
): void {
  if (link.dataset[IMAGE_LINK_ATTRIBUTE] === "true") return;
  if (isInsideIgnoredSurface(link)) return;
  if (!findMessageAncestor(link)) return;

  const href = link.href || link.getAttribute("href") || "";
  if (!isImageFileUrl(href)) return;
  if (link.querySelector("img")) return;

  const image = document.createElement("img");
  image.src = href;
  image.alt = link.textContent?.trim() || "Image preview";
  image.loading = "lazy";
  image.decoding = "async";
  image.dataset[GENERATED_IMAGE_ATTRIBUTE] = "true";
  link.append(" ", image);
  link.dataset[IMAGE_LINK_ATTRIBUTE] = "true";
  generatedImages.set(image, link);
}

function scanLinks(
  root: ParentNode,
  generatedImages: Map<HTMLImageElement, HTMLAnchorElement>,
): void {
  const links = root instanceof HTMLAnchorElement ? [root] : Array.from(root.querySelectorAll("a"));
  for (const link of links) addImageLinkPreview(link, generatedImages);
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
      element instanceof HTMLImageElement &&
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
  sources: HTMLImageElement[],
  originals: Map<HTMLImageElement, OriginalImageAttributes>,
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
  gallery.setAttribute("aria-label", `${sources.length} images`);

  const hiddenLinks = new Set<HTMLAnchorElement>();
  const emptyContainers = new Set<HTMLElement>();

  for (const source of sources) {
    rememberImage(source, originals);
    source.dataset[GALLERY_SOURCE_ATTRIBUTE] = "true";
    source.classList.add("bb-image-preview-gallery-source");

    const link = source.closest<HTMLAnchorElement>(
      `a[data-${IMAGE_LINK_ATTRIBUTE.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}='true']`,
    );
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
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "bb-image-preview-gallery-tile";
    tile.dataset[GALLERY_TILE_ATTRIBUTE] = "true";
    tile.dataset[GALLERY_INDEX_ATTRIBUTE] = String(index);
    tile.setAttribute(
      "aria-label",
      `Open image ${index + 1} of ${sources.length}: ${imageLabel(source)}`,
    );

    const preview = document.createElement("img");
    preview.className = "bb-image-preview-gallery-image";
    preview.src = imageSource(source);
    preview.alt = source.alt;
    preview.loading = "lazy";
    preview.decoding = "async";
    preview.dataset[GALLERY_CLONE_ATTRIBUTE] = "true";
    tile.append(preview);

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

function restoreImage(
  image: HTMLImageElement,
  original: OriginalImageAttributes,
): void {
  image.className = original.className;
  if (original.role === null) image.removeAttribute("role");
  else image.setAttribute("role", original.role);
  if (original.tabIndex === null) image.removeAttribute("tabindex");
  else image.setAttribute("tabindex", original.tabIndex);
  if (original.ariaLabel === null) image.removeAttribute("aria-label");
  else image.setAttribute("aria-label", original.ariaLabel);
  image.removeAttribute(IMAGE_PREVIEW_DATA_ATTRIBUTE);
  image.removeAttribute("data-bb-image-preview-gallery-source");
}

function destroyGallery(
  record: GalleryRecord,
  originals: Map<HTMLImageElement, OriginalImageAttributes>,
  galleries: Map<HTMLDivElement, GalleryRecord>,
): void {
  galleries.delete(record.root);
  record.root.remove();

  for (const source of record.sources) {
    const original = originals.get(source);
    if (original) {
      restoreImage(source, original);
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

function restoreAllImages(
  originals: Map<HTMLImageElement, OriginalImageAttributes>,
): void {
  for (const [image, original] of originals) restoreImage(image, original);
  originals.clear();
}

function refreshGalleries(
  originals: Map<HTMLImageElement, OriginalImageAttributes>,
  galleries: Map<HTMLDivElement, GalleryRecord>,
): void {
  for (const record of Array.from(galleries.values())) {
    destroyGallery(record, originals, galleries);
  }
  restoreAllImages(originals);

  const groupedImages = new Map<Element, HTMLImageElement[]>();
  const images = Array.from(document.querySelectorAll("img"));
  for (const image of images) {
    if (!isChatImage(image)) continue;

    const messageRoot = findMessageAncestor(image);
    if (!messageRoot) {
      addImagePreview(image, originals);
      continue;
    }

    const group = groupedImages.get(messageRoot) ?? [];
    group.push(image);
    groupedImages.set(messageRoot, group);
  }

  for (const [messageRoot, group] of groupedImages) {
    if (group.length > 1) buildGallery(messageRoot, group, originals, galleries);
    else addImagePreview(group[0], originals);
  }
}

function hasImageContent(element: Element): boolean {
  if (element instanceof HTMLImageElement) return true;
  if (element instanceof HTMLAnchorElement) {
    return isImageFileUrl(element.href || element.getAttribute("href") || "");
  }
  if (element.querySelector("img")) return true;
  return Array.from(element.querySelectorAll("a")).some((link) =>
    isImageFileUrl(link.href || link.getAttribute("href") || ""),
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

  const originals = new Map<HTMLImageElement, OriginalImageAttributes>();
  const generatedImages = new Map<HTMLImageElement, HTMLAnchorElement>();
  const galleries = new Map<HTMLDivElement, GalleryRecord>();

  ensureStyles();

  const renderLightbox = () => {
    if (!lightbox || !activeGallery) return;

    const item = activeGallery.items[activeGallery.index];
    const label = imageLabel(item);
    lightbox.image.src = imageSource(item);
    lightbox.image.alt = item.alt;
    lightbox.caption.textContent = label;
    lightbox.counter.textContent = `${activeGallery.index + 1} / ${activeGallery.items.length}`;
    lightbox.previousButton.hidden = activeGallery.items.length < 2;
    lightbox.nextButton.hidden = activeGallery.items.length < 2;
    lightbox.root.setAttribute("aria-label", `Image preview: ${label}`);
    lightbox.root.hidden = false;
  };

  const closeLightbox = () => {
    activeGallery = null;
    if (!lightbox || lightbox.root.hidden) return;

    lightbox.root.hidden = true;
    lightbox.image.removeAttribute("src");
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

  const openGallery = (items: HTMLImageElement[], index: number) => {
    const item = items[index];
    if (!item || !imageSource(item)) return;
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

  const mountBody = () => {
    if (disposed || !document.body) return;
    scanLinks(document, generatedImages);
    refreshGalleries(originals, galleries);
    observer = new MutationObserver((records) => {
      let changed = false;
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const element = node as Element;
          if (element.matches(GALLERY_OWNED_SELECTOR) || element.closest(GALLERY_OWNED_SELECTOR)) {
            continue;
          }
          if (!hasImageContent(element)) continue;
          scanLinks(element, generatedImages);
          changed = true;
        }
      }
      if (changed) refreshGalleries(originals, galleries);
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
    restoreAllImages(originals);

    for (const [image, link] of generatedImages) {
      image.remove();
      delete link.dataset[IMAGE_LINK_ATTRIBUTE];
    }
    generatedImages.clear();

    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("click", onBackdropClick);
    document.getElementById(STYLES_ID)?.remove();
  };

  if (signal.aborted) dispose();
  else signal.addEventListener("abort", dispose, { once: true });

  return dispose;
}
