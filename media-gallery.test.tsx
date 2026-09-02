// @vitest-environment jsdom

import type { PluginFileOpenerProps } from "@get-bb/plugin-sdk/app";
import {
  loadPluginApp,
  mountPluginContentScripts,
  renderSlot,
  type RenderedSlot,
} from "@get-bb/plugin-sdk/testing/app";
import { act } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { rpcContract } from "./server";

type GalleryItem = {
  path: string;
  name: string;
  kind: "image" | "video";
  url: string;
};

type GalleryResponse = {
  folderName: string;
  items: GalleryItem[];
  selectedIndex: number;
  truncated: boolean;
  expiresAtMs: number;
};

const SOURCE: PluginFileOpenerProps["source"] = {
  kind: "thread-storage",
  threadId: "thr_gallery",
  environmentId: "env_gallery",
  projectId: null,
};

const FILE_PROPS: PluginFileOpenerProps = {
  path: "onboarding/walkthrough.mp4",
  source: SOURCE,
};

const IMAGE: GalleryItem = {
  path: "onboarding/cover.png",
  name: "cover.png",
  kind: "image",
  url: "/api/v1/file-previews/lease/onboarding/cover.png",
};

const VIDEO: GalleryItem = {
  path: "onboarding/walkthrough.mp4",
  name: "walkthrough.mp4",
  kind: "video",
  url: "/api/v1/file-previews/lease/onboarding/walkthrough.mp4",
};

function galleryResponse(
  overrides: Partial<GalleryResponse> = {},
): GalleryResponse {
  return {
    folderName: "onboarding",
    items: [IMAGE, VIDEO],
    selectedIndex: 1,
    truncated: false,
    expiresAtMs: Date.now() + 60_000,
    ...overrides,
  };
}

let app: Awaited<ReturnType<typeof loadPluginApp>>;
let pauseMedia: ReturnType<typeof vi.fn>;
const mountedSlots: RenderedSlot[] = [];

beforeAll(async () => {
  app = await loadPluginApp(() => import("./app"));
});

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
    writable: true,
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
    },
    writable: true,
  });

  pauseMedia = vi.fn();
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: pauseMedia,
    writable: true,
  });
});

afterEach(() => {
  for (const slot of mountedSlots.splice(0).reverse()) {
    slot.lifecycle.unmount();
  }
  document.body.replaceChildren();
});

afterAll(() => {
  vi.restoreAllMocks();
});

function fileOpener() {
  const opener = app.fileOpeners.find(
    (candidate) => candidate.id === "media-gallery",
  );
  if (!opener) throw new Error("Media Gallery file opener was not registered");
  return opener;
}

function renderGallery(
  listMedia: (
    input: PluginFileOpenerProps,
  ) => GalleryResponse | Promise<GalleryResponse> = () => galleryResponse(),
) {
  const slot = renderSlot<PluginFileOpenerProps, typeof rpcContract>(
    fileOpener(),
    FILE_PROPS,
    { rpc: { listMedia } },
  );
  mountedSlots.push(slot);
  return slot;
}

describe("Media Gallery file opener", () => {
  it("registers image and video extensions and forwards Thread storage context", async () => {
    const opener = fileOpener();
    expect(app.threadPanelActions).toHaveLength(0);
    expect(opener.title).toBe("Media Gallery");
    expect(opener.extensions).toEqual(
      expect.arrayContaining([
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "svg",
        "mp4",
        "webm",
        "mov",
        "m4v",
      ]),
    );

    const slot = renderGallery();
    await slot.findByRole("button", {
      name: "Play video: walkthrough.mp4",
    });

    expect(slot.inspection.rpcCalls).toEqual([
      {
        method: "listMedia",
        input: { path: FILE_PROPS.path, source: SOURCE },
      },
    ]);
  });

  it("keeps a video tile inert and plays it only in the expanded dialog", async () => {
    const slot = renderGallery();
    const tile = await slot.findByRole("button", {
      name: "Play video: walkthrough.mp4",
    });

    expect(tile.tagName).toBe("BUTTON");
    expect(tile.querySelector(".media-gallery-play")).not.toBeNull();
    const tileVideo = tile.querySelector<HTMLVideoElement>("video");
    expect(tileVideo).not.toBeNull();
    expect(tileVideo?.getAttribute("src")).toBe(VIDEO.url);
    expect(tileVideo?.muted).toBe(true);
    expect(tileVideo?.preload).toBe("metadata");
    expect(tile.hasAttribute("src")).toBe(false);
    expect(tileVideo?.hasAttribute("controls")).toBe(false);
    expect(tileVideo?.hasAttribute("autoplay")).toBe(false);

    await act(async () => {
      (tile as HTMLButtonElement).click();
    });

    const video = slot.container.querySelector<HTMLVideoElement>(
      "dialog video",
    );
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe(VIDEO.url);
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(video?.hasAttribute("autoplay")).toBe(true);
    expect(video?.hasAttribute("playsinline")).toBe(true);
  });

  it("keeps the expanded video outside the global chat-media enhancer", async () => {
    const contentScripts = await mountPluginContentScripts(app, {
      pluginId: "image-preview",
      generation: 1,
    });

    try {
      const slot = renderGallery();
      const tile = await slot.findByRole("button", {
        name: "Play video: walkthrough.mp4",
      });

      await act(async () => {
        (tile as HTMLButtonElement).click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const video = slot.container.querySelector<HTMLVideoElement>("dialog video");
      expect(video?.hidden).toBe(false);
      expect(slot.container.querySelector(".bb-image-preview-gallery")).toBeNull();
    } finally {
      await contentScripts.lifecycle.dispose();
    }
  });

  it("opens images as expanded images", async () => {
    const slot = renderGallery();
    const tile = await slot.findByRole("button", {
      name: "Expand image: cover.png",
    });

    await act(async () => {
      (tile as HTMLButtonElement).click();
    });

    const image = await slot.findByRole("img", { name: "cover.png" });
    expect(image.getAttribute("src")).toBe(IMAGE.url);
    expect(image.closest("dialog")).not.toBeNull();
    expect(image.closest("dialog")?.querySelector("video")).toBeNull();
  });

  it("navigates between media and cleans video playback on navigation and close", async () => {
    const slot = renderGallery();
    const tile = await slot.findByRole("button", {
      name: "Play video: walkthrough.mp4",
    });

    await act(async () => {
      (tile as HTMLButtonElement).click();
    });

    const firstVideo = slot.container.querySelector<HTMLVideoElement>(
      "dialog video",
    );
    expect(firstVideo).not.toBeNull();

    await act(async () => {
      slot.getByRole("button", { name: "Next media" }).click();
    });

    expect(await slot.findByRole("img", { name: "cover.png" })).not.toBeNull();
    expect(pauseMedia).toHaveBeenCalledTimes(1);
    expect(firstVideo?.hasAttribute("src")).toBe(false);
    expect(slot.getByText("1 of 2")).not.toBeNull();

    await act(async () => {
      slot.getByRole("button", { name: "Previous media" }).click();
    });

    const secondVideo = slot.container.querySelector<HTMLVideoElement>(
      "dialog video",
    );
    expect(secondVideo).not.toBeNull();
    expect(secondVideo).not.toBe(firstVideo);

    await act(async () => {
      slot.getByRole("button", { name: "Close media preview" }).click();
    });

    expect(slot.container.querySelector("dialog")).toBeNull();
    expect(pauseMedia).toHaveBeenCalledTimes(2);
    expect(secondVideo?.hasAttribute("src")).toBe(false);
  });

  it("renders a loading state until listMedia resolves", async () => {
    let resolveResponse: (response: GalleryResponse) => void = () => undefined;
    const response = new Promise<GalleryResponse>((resolve) => {
      resolveResponse = resolve;
    });
    const slot = renderGallery(() => response);

    expect(slot.getByRole("status").textContent).toContain("Loading media");

    await act(async () => {
      resolveResponse(galleryResponse());
      await response;
    });

    expect(
      await slot.findByRole("button", {
        name: "Play video: walkthrough.mp4",
      }),
    ).not.toBeNull();
  });

  it("renders RPC errors", async () => {
    const slot = renderGallery(async () => {
      throw new Error("Thread storage host is offline");
    });

    const alert = await slot.findByRole("alert");
    expect(alert.textContent).toContain("Gallery unavailable");
    expect(alert.textContent).toContain("Thread storage host is offline");
  });

  it("renders an empty gallery state", async () => {
    const slot = renderGallery(() => galleryResponse({ items: [] }));

    expect(await slot.findByText("No media in this folder")).not.toBeNull();
    expect(slot.getByText("Supported images and videos will appear here.")).not.toBeNull();
  });
});

describe("Thread storage inline gallery", () => {
  it("replaces the native storage tree with the chat-style thumbnail grid", async () => {
    window.history.pushState(
      {},
      "",
      "/projects/proj_gallery/threads/thr_gallery",
    );

    const row = document.createElement("div");
    const label = document.createElement("dt");
    label.textContent = "Thread storage";
    const value = document.createElement("dd");
    const nativeTree = document.createElement("div");
    nativeTree.textContent = "native file tree";
    value.append(nativeTree);
    row.append(label, value);
    document.body.append(row);

    const fetchMedia = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, result: galleryResponse({ folderName: "Thread storage" }) }),
    }));
    vi.stubGlobal("fetch", fetchMedia);

    const mounted = await mountPluginContentScripts(app, {
      pluginId: "image-preview",
      generation: 2,
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(nativeTree.style.display).toBe("none");
      expect(
        document.querySelector(
          "[data-bb-image-preview-thread-storage-gallery] .media-gallery-grid",
        ),
      ).not.toBeNull();
      expect(
        document.querySelector(
          "[data-bb-image-preview-thread-storage-gallery] button[aria-label='Play video: walkthrough.mp4']",
        ),
      ).not.toBeNull();
      expect(fetchMedia).toHaveBeenCalledWith(
        "/api/v1/plugins/image-preview/rpc/listThreadMedia",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ threadId: "thr_gallery" }),
        }),
      );
    } finally {
      await mounted.lifecycle.dispose();
      vi.unstubAllGlobals();
      window.history.replaceState({}, "", "/");
    }

    expect(nativeTree.style.display).toBe("");
    expect(
      document.querySelector("[data-bb-image-preview-thread-storage-gallery]"),
    ).toBeNull();
  });
});
