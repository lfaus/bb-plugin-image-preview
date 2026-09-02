import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isChatImage,
  isChatMedia,
  LIGHTBOX_ID,
  localMediaPath,
  mountImagePreview,
} from "./image-preview";

const IMAGE_SOURCE = "data:image/png;base64,deadbeef";
const VIDEO_SOURCE = "data:video/mp4;base64,AAAAIGZ0eXA=";

function appendMessageImage(): HTMLImageElement {
  const message = document.createElement("article");
  message.dataset.messageId = "message-1";
  const image = document.createElement("img");
  image.src = IMAGE_SOURCE;
  image.alt = "Generated chart";
  message.append(image);
  document.body.append(message);
  return image;
}

function appendMessageImages(count: number): HTMLImageElement[] {
  const message = document.createElement("article");
  message.dataset.messageId = "message-gallery";
  const images: HTMLImageElement[] = [];

  for (let index = 0; index < count; index += 1) {
    const image = document.createElement("img");
    image.src = IMAGE_SOURCE;
    image.alt = `Gallery image ${index + 1}`;
    image.width = index % 2 === 0 ? 640 : 480;
    image.height = index % 2 === 0 ? 480 : 640;
    message.append(image);
    images.push(image);
  }

  document.body.append(message);
  return images;
}

function createMessageVideo(options?: {
  nestedSource?: boolean;
  poster?: string;
  source?: string;
}): HTMLVideoElement {
  const video = document.createElement("video");
  video.setAttribute("aria-label", "Walkthrough video");
  video.width = 640;
  video.height = 360;
  if (options?.poster) video.poster = options.poster;
  if (options?.nestedSource) {
    const source = document.createElement("source");
    source.src = options.source ?? VIDEO_SOURCE;
    source.type = "video/mp4";
    video.append(source);
  } else {
    video.src = options?.source ?? VIDEO_SOURCE;
  }
  return video;
}

function appendMessageVideo(options?: Parameters<typeof createMessageVideo>[0]) {
  const message = document.createElement("article");
  message.dataset.messageId = "message-video";
  const video = createMessageVideo(options);
  message.append(video);
  document.body.append(message);
  return video;
}

function mockMediaPlayback() {
  const pause = vi
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => undefined);
  const load = vi
    .spyOn(HTMLMediaElement.prototype, "load")
    .mockImplementation(() => undefined);
  return { load, pause };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  document.head.querySelectorAll("style").forEach((style) => style.remove());
});

describe("isChatImage", () => {
  it("accepts images inside message content", () => {
    const image = appendMessageImage();

    expect(isChatImage(image)).toBe(true);
  });

  it("does not accept composer images", () => {
    const composer = document.createElement("form");
    const image = document.createElement("img");
    image.src = IMAGE_SOURCE;
    composer.append(image);
    document.body.append(composer);

    expect(isChatImage(image)).toBe(false);
  });
});

describe("isChatMedia", () => {
  it("accepts native videos with direct, blob, data, and nested sources", () => {
    const message = document.createElement("article");
    message.dataset.messageId = "message-media";
    const direct = createMessageVideo();
    const blob = createMessageVideo({ source: "blob:https://example.test/video" });
    const nested = createMessageVideo({ nestedSource: true });
    message.append(direct, blob, nested);
    document.body.append(message);

    expect(isChatMedia(direct)).toBe(true);
    expect(isChatMedia(blob)).toBe(true);
    expect(isChatMedia(nested)).toBe(true);
  });

  it("does not accept videos in the composer", () => {
    const composer = document.createElement("form");
    const video = createMessageVideo();
    composer.append(video);
    document.body.append(composer);

    expect(isChatMedia(video)).toBe(false);
  });
});

describe("mountImagePreview", () => {
  it("renders a thumbnail and opens a lightbox on click", () => {
    const image = appendMessageImage();
    const controller = new AbortController();
    const dispose = mountImagePreview(controller.signal);

    expect(image.dataset.bbImagePreview).toBe("true");
    expect(image.getAttribute("role")).toBe("button");

    image.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const lightbox = document.getElementById(LIGHTBOX_ID) as HTMLDivElement;
    expect(lightbox.hidden).toBe(false);
    expect(lightbox.querySelector(".bb-image-preview-expanded")?.getAttribute("src")).toBe(
      image.src,
    );

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(lightbox.hidden).toBe(true);

    dispose();
    expect(image.dataset.bbImagePreview).toBeUndefined();
    expect(document.getElementById(LIGHTBOX_ID)).toBeNull();
  });

  it("closes the lightbox from the visible close control", () => {
    const image = appendMessageImage();
    const dispose = mountImagePreview(new AbortController().signal);
    image.click();

    const lightbox = document.getElementById(LIGHTBOX_ID) as HTMLDivElement;
    const closeButton = lightbox.querySelector<HTMLButtonElement>(
      ".bb-image-preview-close",
    );
    closeButton?.click();

    expect(lightbox.hidden).toBe(true);
    dispose();
  });

  it("builds a capped grid with overflow and gallery navigation", () => {
    const images = appendMessageImages(6);
    const dispose = mountImagePreview(new AbortController().signal);

    const gallery = document.querySelector(".bb-image-preview-gallery") as HTMLDivElement;
    expect(gallery.dataset.visibleCount).toBe("4");
    expect(gallery.dataset.totalCount).toBe("6");
    expect(gallery.querySelectorAll("[data-bb-image-preview-tile]")).toHaveLength(4);
    expect(gallery.querySelector(".bb-image-preview-gallery-more")?.textContent).toBe("+2");
    expect(images[0].classList.contains("bb-image-preview-gallery-source")).toBe(true);

    const secondTile = gallery.querySelectorAll<HTMLButtonElement>(
      "[data-bb-image-preview-tile]",
    )[1];
    secondTile.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const lightbox = document.getElementById(LIGHTBOX_ID) as HTMLDivElement;
    expect(lightbox.hidden).toBe(false);
    expect(lightbox.querySelector(".bb-image-preview-counter")?.textContent).toBe("2 / 6");

    lightbox
      .querySelector<HTMLButtonElement>("[data-bb-image-preview-nav='next']")
      ?.click();
    expect(lightbox.querySelector(".bb-image-preview-counter")?.textContent).toBe("3 / 6");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(lightbox.querySelector(".bb-image-preview-counter")?.textContent).toBe("2 / 6");

    dispose();
    expect(document.querySelector(".bb-image-preview-gallery")).toBeNull();
    expect(images[0].classList.contains("bb-image-preview-gallery-source")).toBe(false);
  });

  it("renders a static video tile and plays video only in the expanded lightbox", () => {
    const { load, pause } = mockMediaPlayback();
    const sourceVideo = appendMessageVideo();
    const dispose = mountImagePreview(new AbortController().signal);

    const gallery = document.querySelector<HTMLDivElement>(
      ".bb-image-preview-gallery",
    );
    const tile = gallery?.querySelector<HTMLButtonElement>(
      "[data-bb-image-preview-tile]",
    );
    expect(gallery?.dataset.visibleCount).toBe("1");
    expect(tile?.dataset.bbImagePreviewMediaKind).toBe("video");
    expect(tile?.getAttribute("aria-label")).toContain(
      "Play video 1 of 1 in expanded view",
    );
    const tileVideo = gallery?.querySelector<HTMLVideoElement>(
      "[data-bb-image-preview-tile] video",
    );
    expect(tileVideo?.src).toBe(sourceVideo.src);
    expect(tileVideo?.muted).toBe(true);
    expect(tileVideo?.preload).toBe("metadata");
    expect(tileVideo?.controls).toBe(false);
    expect(tileVideo?.autoplay).toBe(false);
    expect(
      tile?.querySelector(".bb-image-preview-gallery-play")?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(sourceVideo.classList.contains("bb-image-preview-gallery-source")).toBe(
      true,
    );

    tile?.click();

    const lightbox = document.getElementById(LIGHTBOX_ID) as HTMLDivElement;
    const expandedVideo = lightbox.querySelector<HTMLVideoElement>("video");
    expect(lightbox.hidden).toBe(false);
    expect(expandedVideo?.hidden).toBe(false);
    expect(expandedVideo?.controls).toBe(true);
    expect(expandedVideo?.autoplay).toBe(true);
    expect(expandedVideo?.playsInline).toBe(true);
    expect(expandedVideo?.getAttribute("src")).toBe(sourceVideo.src);
    expect(lightbox.querySelector<HTMLImageElement>("img")?.hidden).toBe(true);
    expect(gallery?.querySelector("[data-bb-image-preview-tile] video")).not.toBeNull();

    pause.mockClear();
    load.mockClear();
    lightbox.querySelector<HTMLButtonElement>(".bb-image-preview-close")?.click();
    expect(pause).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(expandedVideo?.getAttribute("src")).toBeNull();
    expect(expandedVideo?.hidden).toBe(true);

    dispose();
  });

  it("uses a poster in a static video tile without cloning the video source", () => {
    mockMediaPlayback();
    appendMessageVideo({ poster: "/posters/walkthrough.png" });
    const dispose = mountImagePreview(new AbortController().signal);

    const gallery = document.querySelector<HTMLDivElement>(
      ".bb-image-preview-gallery",
    );
    const poster = gallery?.querySelector<HTMLImageElement>(
      ".bb-image-preview-gallery-image",
    );
    expect(gallery?.querySelector("[data-bb-image-preview-tile] video")).toBeNull();
    expect(poster?.getAttribute("src")).toBe("http://localhost:3000/posters/walkthrough.png");
    expect(poster?.alt).toBe("");
    expect(gallery?.querySelector(".bb-image-preview-gallery-play")).not.toBeNull();

    dispose();
  });

  it("navigates between images and videos and resets expanded playback", () => {
    const { load, pause } = mockMediaPlayback();
    const message = document.createElement("article");
    message.dataset.messageId = "message-mixed-gallery";
    const image = document.createElement("img");
    image.src = IMAGE_SOURCE;
    image.alt = "Cover image";
    const video = createMessageVideo();
    message.append(image, video);
    document.body.append(message);

    const dispose = mountImagePreview(new AbortController().signal);
    const gallery = document.querySelector<HTMLDivElement>(
      ".bb-image-preview-gallery",
    );
    const tiles = gallery?.querySelectorAll<HTMLButtonElement>(
      "[data-bb-image-preview-tile]",
    );
    expect(tiles).toHaveLength(2);
    expect(tiles?.[0]?.dataset.bbImagePreviewMediaKind).toBe("image");
    expect(tiles?.[1]?.dataset.bbImagePreviewMediaKind).toBe("video");

    tiles?.[1]?.click();
    const lightbox = document.getElementById(LIGHTBOX_ID) as HTMLDivElement;
    const expandedVideo = lightbox.querySelector<HTMLVideoElement>("video");
    expect(expandedVideo?.getAttribute("src")).toBe(video.src);

    pause.mockClear();
    load.mockClear();
    lightbox
      .querySelector<HTMLButtonElement>("[data-bb-image-preview-nav='previous']")
      ?.click();
    expect(pause).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(expandedVideo?.getAttribute("src")).toBeNull();
    expect(expandedVideo?.hidden).toBe(true);
    expect(lightbox.querySelector<HTMLImageElement>("img")?.getAttribute("src")).toBe(
      image.src,
    );

    lightbox
      .querySelector<HTMLButtonElement>("[data-bb-image-preview-nav='next']")
      ?.click();
    expect(expandedVideo?.getAttribute("src")).toBe(video.src);
    expect(expandedVideo?.hidden).toBe(false);

    dispose();
  });

  it("adds a static video preview for a video-file link", () => {
    mockMediaPlayback();
    const message = document.createElement("article");
    message.dataset.messageId = "message-video-link";
    const link = document.createElement("a");
    link.href = "/tmp/walkthrough.mp4";
    link.textContent = "walkthrough.mp4";
    message.append(link);
    document.body.append(message);

    const dispose = mountImagePreview(new AbortController().signal);
    const generatedVideo = link.querySelector<HTMLVideoElement>("video");
    const gallery = document.querySelector<HTMLDivElement>(
      ".bb-image-preview-gallery",
    );
    expect(generatedVideo?.preload).toBe("none");
    expect(generatedVideo?.controls).toBe(false);
    expect(generatedVideo?.autoplay).toBe(false);
    expect(gallery?.querySelector("[data-bb-image-preview-tile] video")).not.toBeNull();
    expect(gallery?.querySelector(".bb-image-preview-gallery-play")).not.toBeNull();

    gallery?.querySelector<HTMLButtonElement>("[data-bb-image-preview-tile]")?.click();
    const expandedVideo = document.querySelector<HTMLVideoElement>(
      `#${LIGHTBOX_ID} video`,
    );
    expect(expandedVideo?.getAttribute("src")).toBe(link.href);

    dispose();
    expect(link.querySelector("video")).toBeNull();
    expect(link.dataset.bbImagePreviewLink).toBeUndefined();
  });

  it("buffers BB file previews before expanded video playback", async () => {
    mockMediaPlayback();
    const fetchVideo = vi.fn(async () => ({
      ok: true,
      status: 200,
      blob: async () => new Blob(["video-bytes"], { type: "video/mp4" }),
    }));
    vi.stubGlobal("fetch", fetchVideo);

    const createObjectURL = vi.fn(() => "blob:buffered-video");
    const revokeObjectURL = vi.fn();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    const message = document.createElement("article");
    message.dataset.messageId = "message-file-preview-video";
    const link = document.createElement("a");
    link.href = "/api/v1/file-previews/lease/walkthrough.mp4";
    link.textContent = "Watch the walkthrough";
    message.append(link);
    document.body.append(message);

    const dispose = mountImagePreview(new AbortController().signal);
    document
      .querySelector<HTMLButtonElement>("[data-bb-image-preview-tile]")
      ?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const expandedVideo = document.querySelector<HTMLVideoElement>(
      `#${LIGHTBOX_ID} video`,
    );
    expect(fetchVideo).toHaveBeenCalledWith(
      link.href,
      { credentials: "same-origin" },
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(expandedVideo?.src).toBe("blob:buffered-video");

    dispose();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:buffered-video");

    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
    } else {
      delete (URL as typeof URL & { createObjectURL?: unknown }).createObjectURL;
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      delete (URL as typeof URL & { revokeObjectURL?: unknown }).revokeObjectURL;
    }
    vi.unstubAllGlobals();
  });

  it("pauses expanded video and restores its source element on abort", () => {
    const { pause } = mockMediaPlayback();
    const controller = new AbortController();
    const sourceVideo = appendMessageVideo();
    mountImagePreview(controller.signal);
    document
      .querySelector<HTMLButtonElement>("[data-bb-image-preview-tile]")
      ?.click();
    pause.mockClear();

    controller.abort();

    expect(pause).toHaveBeenCalled();
    expect(document.getElementById(LIGHTBOX_ID)).toBeNull();
    expect(document.querySelector(".bb-image-preview-gallery")).toBeNull();
    expect(sourceVideo.classList.contains("bb-image-preview-gallery-source")).toBe(
      false,
    );
    expect(sourceVideo.dataset.bbImagePreviewGallerySource).toBeUndefined();
  });

  it("enhances images added after mount and cleans them on abort", async () => {
    const controller = new AbortController();
    mountImagePreview(controller.signal);

    const image = appendMessageImage();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(image.dataset.bbImagePreview).toBe("true");

    controller.abort();
    expect(image.dataset.bbImagePreview).toBeUndefined();
    expect(document.getElementById(LIGHTBOX_ID)).toBeNull();
  });

  it("settles after rebuilding a gallery for newly added media", async () => {
    const images = appendMessageImages(2);
    const message = images[0].closest("article");
    const dispose = mountImagePreview(new AbortController().signal);

    const addedImage = document.createElement("img");
    addedImage.src = IMAGE_SOURCE;
    addedImage.alt = "Added image";
    message?.append(addedImage);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const settledGallery = document.querySelector(".bb-image-preview-gallery");
    expect(settledGallery?.getAttribute("data-total-count")).toBe("3");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector(".bb-image-preview-gallery")).toBe(
      settledGallery,
    );

    dispose();
  });

  it("adds a thumbnail for an image-file link in a message", () => {
    const message = document.createElement("article");
    message.dataset.messageId = "message-2";
    const link = document.createElement("a");
    link.href = "/tmp/generated-diff.png";
    link.textContent = "generated-diff.png";
    message.append(link);
    document.body.append(message);

    const dispose = mountImagePreview(new AbortController().signal);

    const generatedImage = link.querySelector("img");
    expect(generatedImage?.classList.contains("bb-image-preview-thumbnail")).toBe(true);
    expect(link.getAttribute("role")).toBe("button");
    expect(link.getAttribute("aria-haspopup")).toBe("dialog");
    expect(generatedImage?.getAttribute("role")).toBeNull();
    expect(generatedImage?.getAttribute("tabindex")).toBeNull();

    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect((document.getElementById(LIGHTBOX_ID) as HTMLDivElement).hidden).toBe(false);

    dispose();
    expect(link.getAttribute("role")).toBeNull();
    expect(link.getAttribute("aria-haspopup")).toBeNull();
  });

  it("keeps a linked-image trigger when another gallery mutation refreshes the page", async () => {
    const message = document.createElement("article");
    message.dataset.messageId = "message-linked-refresh";
    const link = document.createElement("a");
    link.href = "/tmp/generated-diff.png";
    link.textContent = "generated-diff.png";
    message.append(link);
    document.body.append(message);

    const dispose = mountImagePreview(new AbortController().signal);
    const generatedImage = link.querySelector<HTMLImageElement>("img");
    expect(generatedImage?.dataset.bbImagePreview).toBe("true");

    const addedImage = document.createElement("img");
    addedImage.src = IMAGE_SOURCE;
    addedImage.alt = "Later image";
    message.append(addedImage);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(generatedImage?.classList.contains("bb-image-preview-gallery-source")).toBe(
      true,
    );
    expect(link.getAttribute("role")).toBe("button");
    expect(document.querySelector(".bb-image-preview-gallery")).not.toBeNull();

    dispose();
  });
});


describe("localMediaPath", () => {
  it("treats absolute host paths and file URLs as host media", () => {
    expect(localMediaPath("/Users/me/shots/a.png")).toEqual({ kind: "host", path: "/Users/me/shots/a.png" });
    expect(localMediaPath("file:///Users/me/shots/b%20c.png")).toEqual({ kind: "host", path: "/Users/me/shots/b c.png" });
    expect(localMediaPath("C:\\shots\\a.png")).toEqual({ kind: "host", path: "C:/shots/a.png" });
  });

  it("treats scheme-less relative paths as workspace media", () => {
    expect(localMediaPath("app/src/test/a.png")).toEqual({ kind: "workspace", path: "app/src/test/a.png" });
    expect(localMediaPath("./docs/b.png?x=1")).toEqual({ kind: "workspace", path: "docs/b.png" });
  });

  it("leaves served URLs alone", () => {
    expect(localMediaPath("https://example.com/a.png")).toBeNull();
    expect(localMediaPath("blob:http://localhost/abc")).toBeNull();
    expect(localMediaPath("data:image/png;base64,AAAA")).toBeNull();
    expect(localMediaPath("/api/v1/file-previews/x/a.png")).toEqual({ kind: "host", path: "/api/v1/file-previews/x/a.png" });
  });
});
