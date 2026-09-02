import { Buffer } from "node:buffer";

import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { describe, expect, it, vi } from "vitest";

import {
  ALL_MEDIA_EXTENSIONS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  mediaKindForPath,
} from "./media";
import plugin from "./server";

const source = (
  kind: "thread-storage" | "workspace" | "host",
  overrides: Partial<{
    threadId: string | null;
    environmentId: string | null;
    projectId: string | null;
  }> = {},
) => ({
  kind,
  threadId: null,
  environmentId: null,
  projectId: null,
  ...overrides,
});

const normalizeVideoUrls = <T extends { kind: string; url: string }>(items: T[]) =>
  items.map((item) =>
    item.kind === "video" ? { ...item, url: "<video-preview>" } : item,
  );

describe("media types", () => {
  it("shares image and video extensions with file openers", () => {
    expect(IMAGE_EXTENSIONS).toContain("png");
    expect(VIDEO_EXTENSIONS).toContain("mp4");
    expect(ALL_MEDIA_EXTENSIONS).toEqual([
      ...IMAGE_EXTENSIONS,
      ...VIDEO_EXTENSIONS,
    ]);
    expect(mediaKindForPath("capture.PNG")).toBe("image");
    expect(mediaKindForPath("clip.MP4?download=1")).toBe("video");
    expect(mediaKindForPath("clip.webm#preview")).toBe("video");
    expect(mediaKindForPath("clip #1.mp4")).toBe("video");
    expect(mediaKindForPath("notes.txt")).toBeNull();
  });
});

describe("listMedia RPC", () => {
  it("lists same-folder thread-storage media and routes the preview to its remote host", async () => {
    const storageFiles = vi.fn(async () =>
      ({
        files: [
          {
            path: "onboarding/hero one.png",
            name: "hero one.png",
          },
          {
            path: "onboarding/clip #1.mp4",
            name: "clip #1.mp4",
          },
          {
            path: "onboarding/readme.txt",
            name: "readme.txt",
          },
          {
            path: "onboarding/nested/ignored.webp",
            name: "ignored.webp",
          },
          {
            path: "onboarding/../escape.mp4",
            name: "escape.mp4",
          },
        ],
        truncated: true,
        storageRootPath: "/remote/bb/thread-storage/th_1",
      }) as never,
    );
    const getEnvironment = vi.fn(async () =>
      ({ hostId: "host_remote", path: "/remote/worktree" }) as never,
    );
    const getThread = vi.fn(async () =>
      ({ environmentId: "env_remote" }) as never,
    );
    const createPreview = vi.fn(async () =>
      ({
        baseUrl: "https://preview.test/thread",
        expiresAtMs: 123_456,
      }) as never,
    );
    const { bb, harness } = createFakePluginHost({
      pluginId: "image-preview",
      sdk: {
        threads: { get: getThread, storageFiles },
        environments: { get: getEnvironment },
        files: { createPreview },
      },
    });
    await plugin(bb);

    const result = await harness.behavior.callRpc("listMedia", {
      path: "onboarding/clip #1.mp4",
      source: source("thread-storage", {
        threadId: "th_1",
        environmentId: "env_remote",
      }),
    });

    expect({ ...result, items: normalizeVideoUrls(result.items) }).toEqual({
      folderName: "onboarding",
      items: [
        {
          path: "onboarding/clip #1.mp4",
          name: "clip #1.mp4",
          kind: "video",
          url: "<video-preview>",
        },
        {
          path: "onboarding/hero one.png",
          name: "hero one.png",
          kind: "image",
          url: "https://preview.test/thread/hero%20one.png",
        },
      ],
      selectedIndex: 0,
      truncated: true,
      expiresAtMs: 123_456,
    });
    expect(storageFiles).toHaveBeenCalledWith({
      threadId: "th_1",
      limit: "10000",
    });
    expect(getThread).toHaveBeenCalledWith({ threadId: "th_1" });
    expect(getEnvironment).toHaveBeenCalledWith({ environmentId: "env_remote" });
    expect(createPreview).toHaveBeenCalledWith({
      rootPath: "/remote/bb/thread-storage/th_1/onboarding",
      hostId: "host_remote",
      ttlMs: 3_600_000,
    });
    await harness.lifecycle.dispose();
  });

  it("rejects a Thread storage source whose environment does not own the thread", async () => {
    const getEnvironment = vi.fn();
    const createPreview = vi.fn();
    const { bb, harness } = createFakePluginHost({
      pluginId: "image-preview",
      sdk: {
        threads: {
          get: async () => ({ environmentId: "env_actual" }) as never,
          storageFiles: async () =>
            ({
              files: [{ path: "clips/demo.mp4", name: "demo.mp4" }],
              truncated: false,
              storageRootPath: "/remote/storage/th_1",
            }) as never,
        },
        environments: { get: getEnvironment },
        files: { createPreview },
      },
    });
    await plugin(bb);

    await expect(
      harness.behavior.callRpc("listMedia", {
        path: "clips/demo.mp4",
        source: source("thread-storage", {
          threadId: "th_1",
          environmentId: "env_other",
        }),
      }),
    ).rejects.toThrow(/does not match/i);
    expect(getEnvironment).not.toHaveBeenCalled();
    expect(createPreview).not.toHaveBeenCalled();
    await harness.lifecycle.dispose();
  });

  it("confines a project-only workspace to its default source and selected folder", async () => {
    const list = vi.fn(async () =>
      ({
        files: [
          { path: "/remote/worktree/captures/hero image.png", name: "hero image.png" },
          { path: "/remote/worktree/captures/clip.mp4", name: "clip.mp4" },
          { path: "/remote/worktree/captures/nested/skip.jpg", name: "skip.jpg" },
          { path: "/remote/worktree/private/leak.png", name: "leak.png" },
        ],
        truncated: false,
      }) as never,
    );
    const createPreview = vi.fn(async () =>
      ({ baseUrl: "https://preview.test/workspace/", expiresAtMs: 777 }) as never,
    );
    const getProject = vi.fn(async () =>
      ({
        sources: [
          {
            isDefault: true,
            hostId: "host_remote",
            path: "/remote/worktree",
          },
        ],
      }) as never,
    );
    const { bb, harness } = createFakePluginHost({
      pluginId: "image-preview",
      sdk: {
        projects: { get: getProject },
        files: { list, createPreview },
      },
    });
    await plugin(bb);

    const result = await harness.behavior.callRpc("listMedia", {
      path: "captures/hero image.png",
      source: source("workspace", { projectId: "proj_remote" }),
    });

    expect(normalizeVideoUrls(result.items)).toEqual([
      {
        path: "captures/clip.mp4",
        name: "clip.mp4",
        kind: "video",
        url: "<video-preview>",
      },
      {
        path: "captures/hero image.png",
        name: "hero image.png",
        kind: "image",
        url: "https://preview.test/workspace/hero%20image.png",
      },
    ]);
    expect(result.folderName).toBe("captures");
    expect(result.selectedIndex).toBe(1);
    expect(getProject).toHaveBeenCalledWith({ projectId: "proj_remote" });
    expect(list).toHaveBeenCalledWith({
      hostId: "host_remote",
      path: "/remote/worktree/captures",
      limit: 10_000,
    });
    expect(createPreview).toHaveBeenCalledWith({
      rootPath: "/remote/worktree/captures",
      hostId: "host_remote",
      ttlMs: 3_600_000,
    });
    await harness.lifecycle.dispose();
  });

  it("resolves a host file through its thread environment", async () => {
    const getThread = vi.fn(async () => ({ environmentId: "env_remote" }) as never);
    const getEnvironment = vi.fn(async () => ({ hostId: "host_remote" }) as never);
    const list = vi.fn(async () =>
      ({
        files: [
          { path: "/Volumes/media/Captures/current clip.mp4", name: "current clip.mp4" },
          { path: "/Volumes/media/Captures/still.png", name: "still.png" },
        ],
        truncated: false,
      }) as never,
    );
    const createPreview = vi.fn(async () =>
      ({ baseUrl: "https://preview.test/host", expiresAtMs: 999 }) as never,
    );
    const { bb, harness } = createFakePluginHost({
      pluginId: "image-preview",
      sdk: {
        threads: { get: getThread },
        environments: { get: getEnvironment },
        files: { list, createPreview },
      },
    });
    await plugin(bb);

    const result = await harness.behavior.callRpc("listMedia", {
      path: "/Volumes/media/Captures/current clip.mp4",
      source: source("host", { threadId: "th_remote" }),
    });

    expect(result.folderName).toBe("Captures");
    expect({ ...result.items[0], url: "<video-preview>" }).toEqual({
      path: "/Volumes/media/Captures/current clip.mp4",
      name: "current clip.mp4",
      kind: "video",
      url: "<video-preview>",
    });
    expect(getThread).toHaveBeenCalledWith({ threadId: "th_remote" });
    expect(getEnvironment).toHaveBeenCalledWith({ environmentId: "env_remote" });
    expect(list).toHaveBeenCalledWith({
      hostId: "host_remote",
      path: "/Volumes/media/Captures",
      limit: 10_000,
    });
    expect(createPreview).toHaveBeenCalledWith({
      rootPath: "/Volumes/media/Captures",
      hostId: "host_remote",
      ttlMs: 3_600_000,
    });
    await harness.lifecycle.dispose();
  });

  it("rejects traversal before resolving or listing a workspace", async () => {
    const getEnvironment = vi.fn();
    const list = vi.fn();
    const createPreview = vi.fn();
    const { bb, harness } = createFakePluginHost({
      pluginId: "image-preview",
      sdk: {
        environments: { get: getEnvironment },
        files: { list, createPreview },
      },
    });
    await plugin(bb);

    await expect(
      harness.behavior.callRpc("listMedia", {
        path: "../private/clip.mp4",
        source: source("workspace", { environmentId: "env_remote" }),
      }),
    ).rejects.toThrow(/traversal/i);
    expect(getEnvironment).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(createPreview).not.toHaveBeenCalled();
    await harness.lifecycle.dispose();
  });

  it("serves video leases with byte ranges", async () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, index) => index);
    const read = vi.fn(async () =>
      ({
        content: Buffer.from(bytes).toString("base64"),
        contentEncoding: "base64",
        mimeType: "video/mp4",
        sizeBytes: bytes.length,
      }) as never,
    );
    const createPreview = vi.fn(async () =>
      ({ baseUrl: "https://preview.test/thread", expiresAtMs: 123_456 }) as never,
    );
    const { bb, harness } = createFakePluginHost({
      pluginId: "image-preview",
      sdk: {
        threads: {
          get: async () => ({ environmentId: "env_remote" }) as never,
          storageFiles: async () =>
            ({
              files: [{ path: "clips/demo.mp4", name: "demo.mp4" }],
              truncated: false,
              storageRootPath: "/remote/storage/th_1",
            }) as never,
        },
        environments: { get: async () => ({ hostId: "host_remote" }) as never },
        files: { createPreview, read },
      },
    });
    await plugin(bb);

    const result = await harness.behavior.callRpc("listThreadMedia", {
      threadId: "th_1",
    });
    const videoUrl = new URL(result.items[0]!.url, "http://localhost");
    const lease = videoUrl.searchParams.get("lease");
    expect(lease).toMatch(/^[0-9a-f-]{36}$/);

    const response = await harness.behavior.fetchHttp(
      "GET",
      `/media?lease=${encodeURIComponent(lease!)}`,
      { headers: { range: "bytes=4-7" } },
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBe("bytes 4-7/16");
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      Uint8Array.from([4, 5, 6, 7]),
    );
    expect(read).toHaveBeenCalledWith({
      hostId: "host_remote",
      path: "/remote/storage/th_1/clips/demo.mp4",
      rootPath: "/remote/storage/th_1/clips",
    });

    await harness.lifecycle.dispose();
  });

  it("rejects traversal in absolute host paths before routing", async () => {
    const getThread = vi.fn();
    const list = vi.fn();
    const { bb, harness } = createFakePluginHost({
      pluginId: "image-preview",
      sdk: {
        threads: { get: getThread },
        files: { list },
      },
    });
    await plugin(bb);

    await expect(
      harness.behavior.callRpc("listMedia", {
        path: "/Volumes/media/Captures/../private.mp4",
        source: source("host", { threadId: "th_remote" }),
      }),
    ).rejects.toThrow(/traversal/i);
    expect(getThread).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    await harness.lifecycle.dispose();
  });
});

describe("listThreadMedia RPC", () => {
  it("lists recursive media, groups it by safe folder roots, and deduplicates paths", async () => {
    const storageFiles = vi.fn(async () =>
      ({
        files: [
          { path: "root.png", name: "root.png" },
          { path: "Attachments/cover one.png", name: "cover one.png" },
          { path: "Attachments/cover one.png", name: "duplicate.png" },
          { path: "Attachments/walkthrough.mp4", name: "walkthrough.mp4" },
          { path: "screens/clip.webm", name: "clip.webm" },
          { path: "screens/readme.txt", name: "readme.txt" },
          { path: "screens/../escape.mp4", name: "escape.mp4" },
        ],
        truncated: false,
        storageRootPath: "/remote/storage/th_1",
      }) as never,
    );
    const getThread = vi.fn(async () => ({ environmentId: "env_remote" }) as never);
    const getEnvironment = vi.fn(async () => ({ hostId: "host_remote" }) as never);
    const createPreview = vi.fn(async ({ rootPath }: { rootPath: string }) => {
      const suffix = rootPath.endsWith("/Attachments")
        ? "attachments"
        : rootPath.endsWith("/screens")
          ? "screens"
          : "root";
      return {
        baseUrl: `https://preview.test/${suffix}`,
        expiresAtMs: suffix === "screens" ? 3_000 : 4_000,
      } as never;
    });
    const { bb, harness } = createFakePluginHost({
      pluginId: "image-preview",
      sdk: {
        threads: { get: getThread, storageFiles },
        environments: { get: getEnvironment },
        files: { createPreview },
      },
    });
    await plugin(bb);

    const result = await harness.behavior.callRpc("listThreadMedia", {
      threadId: "th_1",
    });

    expect({ ...result, items: normalizeVideoUrls(result.items) }).toEqual({
      folderName: "Thread storage",
      items: [
        {
          path: "Attachments/cover one.png",
          name: "cover one.png",
          kind: "image",
          url: "https://preview.test/attachments/cover%20one.png",
        },
        {
          path: "Attachments/walkthrough.mp4",
          name: "walkthrough.mp4",
          kind: "video",
          url: "<video-preview>",
        },
        {
          path: "root.png",
          name: "root.png",
          kind: "image",
          url: "https://preview.test/root/root.png",
        },
        {
          path: "screens/clip.webm",
          name: "clip.webm",
          kind: "video",
          url: "<video-preview>",
        },
      ],
      selectedIndex: 0,
      truncated: false,
      expiresAtMs: 3_000,
    });
    expect(getThread).toHaveBeenCalledWith({ threadId: "th_1" });
    expect(getEnvironment).toHaveBeenCalledWith({ environmentId: "env_remote" });
    expect(createPreview).toHaveBeenCalledTimes(3);
    for (const call of createPreview.mock.calls) {
      expect(call[0]).toMatchObject({ hostId: "host_remote", ttlMs: 3_600_000 });
    }
    await harness.lifecycle.dispose();
  });

  it("does not create a preview lease for empty Thread storage", async () => {
    const createPreview = vi.fn();
    const { bb, harness } = createFakePluginHost({
      pluginId: "image-preview",
      sdk: {
        threads: {
          get: async () => ({ environmentId: "env_remote" }) as never,
          storageFiles: async () =>
            ({
              files: [{ path: "notes.txt", name: "notes.txt" }],
              truncated: false,
              storageRootPath: "/remote/storage/th_1",
            }) as never,
        },
        environments: { get: async () => ({ hostId: "host_remote" }) as never },
        files: { createPreview },
      },
    });
    await plugin(bb);

    const result = await harness.behavior.callRpc("listThreadMedia", {
      threadId: "th_1",
    });

    expect(result.items).toEqual([]);
    expect(result.truncated).toBe(false);
    expect(createPreview).not.toHaveBeenCalled();
    await harness.lifecycle.dispose();
  });
});
