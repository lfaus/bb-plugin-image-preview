import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import path from "node:path";

import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import type { Context } from "hono";
import { z } from "zod";

import { mediaKindForPath, type MediaKind } from "./media";

const MEDIA_LIST_LIMIT = 10_000;
const THREAD_GALLERY_ITEM_LIMIT = 500;
const THREAD_GALLERY_FOLDER_LIMIT = 50;
const PREVIEW_TTL_MS = 60 * 60 * 1_000;
const VIDEO_ROUTE = "/media";

const VIDEO_MIME_TYPES: Record<string, string> = {
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  mp4: "video/mp4",
  ogg: "video/ogg",
  ogv: "video/ogg",
  webm: "video/webm",
};

const fileSourceSchema = z
  .object({
    kind: z.enum(["thread-storage", "workspace", "host"]),
    threadId: z.string().min(1).nullable(),
    environmentId: z.string().min(1).nullable(),
    projectId: z.string().min(1).nullable(),
  })
  .strict();

const mediaItemSchema = z
  .object({
    path: z.string(),
    name: z.string(),
    kind: z.enum(["image", "video"]),
    url: z.string(),
  })
  .strict();

const galleryOutputSchema = z
  .object({
    folderName: z.string(),
    items: z.array(mediaItemSchema),
    selectedIndex: z.number().int().nonnegative(),
    truncated: z.boolean(),
    expiresAtMs: z.number(),
  })
  .strict();

export const rpcContract = defineRpcContract({
  listMedia: {
    input: z
      .object({
        path: z.string().min(1),
        source: fileSourceSchema,
      })
      .strict(),
    output: galleryOutputSchema,
  },
  listThreadMedia: {
    input: z.object({ threadId: z.string().min(1) }).strict(),
    output: galleryOutputSchema,
  },
});

type FileSource = z.infer<typeof fileSourceSchema>;
type ListMediaInput = z.infer<(typeof rpcContract)["listMedia"]["input"]>;
type ListThreadMediaInput = z.infer<
  (typeof rpcContract)["listThreadMedia"]["input"]
>;
type PathApi = typeof path.posix;
type HostLocation = { hostId: string; path: string | null };

type MediaCandidate = {
  path: string;
  name: string;
  kind: MediaKind;
  previewPath: string;
  selectionKey: string;
};

type VideoLease = {
  hostId?: string;
  path: string;
  rootPath: string;
  mimeType: string;
  expiresAtMs: number;
};

type ResolvedListing = {
  folderName: string;
  candidates: MediaCandidate[];
  selectedKey: string;
  truncated: boolean;
  previewRoot: string;
  previewHostId?: string;
  previewApi: PathApi;
  caseInsensitive: boolean;
};

const videoLeases = new Map<string, VideoLease>();

function hasTraversalSegment(value: string, api: PathApi): boolean {
  const segments = value.split(api === path.win32 ? /[\\/]+/ : /\/+/);
  return segments.some((segment) => segment === "." || segment === "..");
}

function safeRelativePath(value: string): string {
  if (!value || value.includes("\0")) {
    throw new Error("Invalid media path.");
  }

  const withForwardSlashes = value.replaceAll("\\", "/");
  if (
    path.posix.isAbsolute(withForwardSlashes) ||
    path.win32.isAbsolute(value) ||
    /^[a-z]:/i.test(value)
  ) {
    throw new Error("Media path must be relative to its source root.");
  }

  const segments = withForwardSlashes.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Media path traversal is not allowed.");
  }
  return segments.join("/");
}

function pathApiForAbsolute(value: string): PathApi {
  return /^[a-z]:[\\/]/i.test(value) || value.startsWith("\\\\")
    ? path.win32
    : path.posix;
}

function safeAbsolutePath(value: string): { api: PathApi; value: string } {
  if (!value || value.includes("\0")) throw new Error("Invalid media path.");
  const api = pathApiForAbsolute(value);
  if (!api.isAbsolute(value)) throw new Error("Host media path must be absolute.");
  if (hasTraversalSegment(value, api)) {
    throw new Error("Media path traversal is not allowed.");
  }
  return { api, value: api.normalize(value) };
}

function sameHostPath(api: PathApi, left: string, right: string): boolean {
  const normalize = (value: string) => {
    const normalized = api.normalize(value);
    return api === path.win32 ? normalized.toLowerCase() : normalized;
  };
  return normalize(left) === normalize(right);
}

function absoluteListedFile(
  listedPath: string,
  folderPath: string,
  api: PathApi,
): string | null {
  if (!listedPath || listedPath.includes("\0")) return null;

  let absolutePath: string;
  if (api.isAbsolute(listedPath)) {
    if (hasTraversalSegment(listedPath, api)) return null;
    absolutePath = api.normalize(listedPath);
  } else {
    let relativePath: string;
    try {
      relativePath = safeRelativePath(listedPath);
    } catch {
      return null;
    }
    absolutePath = api.join(folderPath, ...relativePath.split("/"));
  }

  return sameHostPath(api, api.dirname(absolutePath), folderPath)
    ? absolutePath
    : null;
}

function relativeHostPath(
  absolutePath: string,
  rootPath: string,
  api: PathApi,
): string | null {
  const relativePath = api.relative(rootPath, absolutePath);
  if (
    !relativePath ||
    api.isAbsolute(relativePath) ||
    relativePath === ".." ||
    relativePath.startsWith(`..${api.sep}`)
  ) {
    return null;
  }
  return relativePath.replaceAll("\\", "/");
}

function encodedPreviewPath(relativePath: string): string {
  return safeRelativePath(relativePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function previewUrl(baseUrl: string, relativePath: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${encodedPreviewPath(relativePath)}`;
}

function videoMimeType(filePath: string): string {
  const filename = filePath.split(/[\\/]/).pop() ?? filePath;
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_MIME_TYPES[extension] ?? "application/octet-stream";
}

function cleanupVideoLeases(now = Date.now()): void {
  for (const [id, lease] of videoLeases) {
    if (lease.expiresAtMs <= now) videoLeases.delete(id);
  }
}

function registerVideoLease(
  pluginId: string,
  candidate: MediaCandidate,
  previewRoot: string,
  previewApi: PathApi,
  previewHostId: string | undefined,
): { url: string; expiresAtMs: number } {
  const now = Date.now();
  cleanupVideoLeases(now);
  const id = randomUUID();
  const expiresAtMs = now + PREVIEW_TTL_MS;
  const absolutePath = previewApi.join(
    previewRoot,
    ...candidate.previewPath.split("/"),
  );
  videoLeases.set(id, {
    ...(previewHostId ? { hostId: previewHostId } : {}),
    path: absolutePath,
    rootPath: previewRoot,
    mimeType: videoMimeType(candidate.path),
    expiresAtMs,
  });
  return {
    url: `/api/v1/plugins/${encodeURIComponent(pluginId)}/http${VIDEO_ROUTE}?lease=${encodeURIComponent(id)}`,
    expiresAtMs,
  };
}

function parseByteRange(
  value: string | undefined,
  size: number,
): { start: number; end: number } | null | "invalid" {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return "invalid";

  const startText = match[1] ?? "";
  const endText = match[2] ?? "";
  if (!startText && !endText) return "invalid";

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return "invalid";
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number(startText);
  const end = endText ? Number(endText) : size - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return "invalid";
  }
  return { start, end: Math.min(end, size - 1) };
}

async function serveVideo(context: Context, bb: BbPluginApi) {
  cleanupVideoLeases();
  const leaseId = context.req.query("lease");
  const lease = leaseId ? videoLeases.get(leaseId) : undefined;
  if (!lease || lease.expiresAtMs <= Date.now()) {
    if (leaseId) videoLeases.delete(leaseId);
    return new Response("Video preview expired", { status: 404 });
  }

  const file = await bb.sdk.files.read({
    ...(lease.hostId ? { hostId: lease.hostId } : {}),
    path: lease.path,
    rootPath: lease.rootPath,
  });
  const bytes = Buffer.from(
    file.content,
    file.contentEncoding === "base64" ? "base64" : "utf8",
  );
  const range = parseByteRange(context.req.header("range"), bytes.length);
  const headers = new Headers({
    "accept-ranges": "bytes",
    "cache-control": "no-store",
    "content-type": file.mimeType || lease.mimeType,
    "content-disposition": "inline",
    "x-content-type-options": "nosniff",
  });

  if (range === "invalid") {
    headers.set("content-range", `bytes */${bytes.length}`);
    return new Response(null, { status: 416, headers });
  }

  if (range === null) {
    headers.set("content-length", String(bytes.length));
    return new Response(context.req.method === "HEAD" ? null : bytes, {
      status: 200,
      headers,
    });
  }

  const body = bytes.subarray(range.start, range.end + 1);
  headers.set("content-length", String(body.length));
  headers.set("content-range", `bytes ${range.start}-${range.end}/${bytes.length}`);
  return new Response(context.req.method === "HEAD" ? null : body, {
    status: 206,
    headers,
  });
}

function mediaItemUrl(
  pluginId: string,
  candidate: MediaCandidate,
  preview: { baseUrl: string; expiresAtMs: number },
  previewRoot: string,
  previewApi: PathApi,
  previewHostId: string | undefined,
): { url: string; expiresAtMs: number } {
  if (candidate.kind === "video") {
    return registerVideoLease(
      pluginId,
      candidate,
      previewRoot,
      previewApi,
      previewHostId,
    );
  }
  return {
    url: previewUrl(preview.baseUrl, candidate.previewPath),
    expiresAtMs: preview.expiresAtMs,
  };
}

function mediaCandidate(
  itemPath: string,
  previewPath: string,
  selectionKey = itemPath,
): MediaCandidate | null {
  const kind = mediaKindForPath(itemPath);
  if (!kind) return null;
  return {
    path: itemPath,
    name: itemPath.split(/[\\/]/).pop() ?? itemPath,
    kind,
    previewPath,
    selectionKey,
  };
}

function compareMediaCandidates(
  left: MediaCandidate,
  right: MediaCandidate,
): number {
  return (
    left.path.localeCompare(right.path, undefined, {
      numeric: true,
      sensitivity: "base",
    }) || left.path.localeCompare(right.path)
  );
}

function finishCandidates(
  candidates: MediaCandidate[],
  selected: MediaCandidate,
  caseInsensitive: boolean,
): { candidates: MediaCandidate[]; selectedKey: string } {
  const key = (value: string) => (caseInsensitive ? value.toLowerCase() : value);
  const unique = new Map<string, MediaCandidate>();
  for (const candidate of [...candidates, selected]) {
    unique.set(key(candidate.selectionKey), candidate);
  }
  const sorted = Array.from(unique.values()).sort(compareMediaCandidates);
  return { candidates: sorted, selectedKey: key(selected.selectionKey) };
}

async function resolveEnvironment(
  bb: BbPluginApi,
  source: FileSource,
  required: boolean,
): Promise<HostLocation | null> {
  let environmentId = source.environmentId;
  if (!environmentId && source.threadId) {
    const thread = await bb.sdk.threads.get({ threadId: source.threadId });
    environmentId = thread.environmentId;
  }
  if (environmentId) {
    return bb.sdk.environments.get({ environmentId });
  }

  if (source.projectId) {
    const project = await bb.sdk.projects.get({ projectId: source.projectId });
    const projectSource =
      project.sources.find((candidate) => candidate.isDefault) ?? project.sources[0];
    if (projectSource) {
      return { hostId: projectSource.hostId, path: projectSource.path };
    }
  }

  if (required) throw new Error("This media source has no workspace location.");
  return null;
}

async function resolveThreadEnvironment(
  bb: BbPluginApi,
  source: FileSource,
): Promise<HostLocation> {
  if (!source.threadId) throw new Error("Thread storage requires a thread id.");
  return resolveThreadEnvironmentById(
    bb,
    source.threadId,
    source.environmentId,
  );
}

async function resolveThreadEnvironmentById(
  bb: BbPluginApi,
  threadId: string,
  expectedEnvironmentId: string | null = null,
): Promise<HostLocation> {
  const thread = await bb.sdk.threads.get({ threadId });
  if (!thread.environmentId) {
    throw new Error("Thread storage has no host environment.");
  }
  if (expectedEnvironmentId && expectedEnvironmentId !== thread.environmentId) {
    throw new Error("Thread storage environment does not match its thread.");
  }
  return bb.sdk.environments.get({ environmentId: thread.environmentId });
}

async function resolveThreadStorage(
  bb: BbPluginApi,
  input: ListMediaInput,
): Promise<ResolvedListing> {
  const selectedPath = safeRelativePath(input.path);
  const selectedCandidate = mediaCandidate(
    selectedPath,
    path.posix.basename(selectedPath),
  );
  if (!selectedCandidate) throw new Error("The selected file is not supported media.");
  if (!input.source.threadId) throw new Error("Thread storage requires a thread id.");

  const directory = path.posix.dirname(selectedPath);
  const listing = await bb.sdk.threads.storageFiles({
    threadId: input.source.threadId,
    limit: String(MEDIA_LIST_LIMIT),
  });
  const root = safeAbsolutePath(listing.storageRootPath);
  const environment = await resolveThreadEnvironment(bb, input.source);
  const candidates = listing.files.flatMap((file) => {
    let filePath: string;
    try {
      filePath = safeRelativePath(file.path);
    } catch {
      return [];
    }
    if (path.posix.dirname(filePath) !== directory) return [];
    const candidate = mediaCandidate(filePath, path.posix.basename(filePath));
    return candidate ? [candidate] : [];
  });
  const finished = finishCandidates(candidates, selectedCandidate, false);
  const previewRoot =
    directory === "."
      ? root.value
      : root.api.join(root.value, ...directory.split("/"));

  return {
    folderName: directory === "." ? "Thread storage" : path.posix.basename(directory),
    ...finished,
    truncated: listing.truncated,
    previewRoot,
    previewHostId: environment.hostId,
    previewApi: root.api,
    caseInsensitive: false,
  };
}

async function resolveWorkspace(
  bb: BbPluginApi,
  input: ListMediaInput,
): Promise<ResolvedListing> {
  const selectedPath = safeRelativePath(input.path);
  const selectedKind = mediaKindForPath(selectedPath);
  if (!selectedKind) throw new Error("The selected file is not supported media.");

  const environment = await resolveEnvironment(bb, input.source, true);
  if (!environment?.path) throw new Error("This environment has no workspace path.");
  const root = safeAbsolutePath(environment.path);
  const selectedAbsolute = root.api.join(root.value, ...selectedPath.split("/"));
  const selectedRelative = relativeHostPath(selectedAbsolute, root.value, root.api);
  if (!selectedRelative || selectedRelative !== selectedPath) {
    throw new Error("Media path escapes the workspace root.");
  }
  const directoryAbsolute = root.api.dirname(selectedAbsolute);
  const listing = await bb.sdk.files.list({
    hostId: environment.hostId,
    path: directoryAbsolute,
    limit: MEDIA_LIST_LIMIT,
  });
  const candidates = listing.files.flatMap((file) => {
    const absolute = absoluteListedFile(file.path, directoryAbsolute, root.api);
    if (!absolute) return [];
    const relative = relativeHostPath(absolute, root.value, root.api);
    if (!relative) return [];
    const candidate = mediaCandidate(relative, root.api.basename(absolute));
    return candidate ? [candidate] : [];
  });
  const selected = mediaCandidate(selectedPath, root.api.basename(selectedAbsolute));
  if (!selected) throw new Error("The selected file is not supported media.");
  const finished = finishCandidates(candidates, selected, root.api === path.win32);
  const directory = path.posix.dirname(selectedPath);

  return {
    folderName:
      directory === "." ? root.api.basename(root.value) || "Workspace" : path.posix.basename(directory),
    ...finished,
    truncated: listing.truncated,
    previewRoot: directoryAbsolute,
    previewHostId: environment.hostId,
    previewApi: root.api,
    caseInsensitive: root.api === path.win32,
  };
}

async function resolveHost(
  bb: BbPluginApi,
  input: ListMediaInput,
): Promise<ResolvedListing> {
  const selected = safeAbsolutePath(input.path);
  const selectedKind = mediaKindForPath(selected.value);
  if (!selectedKind) throw new Error("The selected file is not supported media.");
  const directory = selected.api.dirname(selected.value);
  const environment = await resolveEnvironment(bb, input.source, false);
  const hostId = environment?.hostId;
  const listArgs = {
    path: directory,
    limit: MEDIA_LIST_LIMIT,
    ...(hostId ? { hostId } : {}),
  };
  const listing = await bb.sdk.files.list(listArgs);
  const candidates = listing.files.flatMap((file) => {
    const absolute = absoluteListedFile(file.path, directory, selected.api);
    if (!absolute) return [];
    const candidate = mediaCandidate(absolute, selected.api.basename(absolute), absolute);
    return candidate ? [candidate] : [];
  });
  const selectedCandidate = mediaCandidate(
    selected.value,
    selected.api.basename(selected.value),
    selected.value,
  );
  if (!selectedCandidate) throw new Error("The selected file is not supported media.");
  const finished = finishCandidates(
    candidates,
    selectedCandidate,
    selected.api === path.win32,
  );

  return {
    folderName: selected.api.basename(directory) || "Files",
    ...finished,
    truncated: listing.truncated,
    previewRoot: directory,
    ...(hostId ? { previewHostId: hostId } : {}),
    previewApi: selected.api,
    caseInsensitive: selected.api === path.win32,
  };
}

async function listThreadMedia(bb: BbPluginApi, input: ListThreadMediaInput) {
  const [listing, environment] = await Promise.all([
    bb.sdk.threads.storageFiles({
      threadId: input.threadId,
      limit: String(MEDIA_LIST_LIMIT),
    }),
    resolveThreadEnvironmentById(bb, input.threadId),
  ]);
  const root = safeAbsolutePath(listing.storageRootPath);
  const candidatesByPath = new Map<string, MediaCandidate>();
  for (const file of listing.files) {
    let filePath: string;
    try {
      filePath = safeRelativePath(file.path);
    } catch {
      continue;
    }
    const candidate = mediaCandidate(filePath, path.posix.basename(filePath));
    if (!candidate) continue;
    const key = root.api === path.win32 ? filePath.toLowerCase() : filePath;
    candidatesByPath.set(key, candidate);
  }
  const allCandidates = Array.from(candidatesByPath.values()).sort(
    compareMediaCandidates,
  );

  const folders = new Set<string>();
  const candidates: MediaCandidate[] = [];
  let omittedMedia = false;
  for (const candidate of allCandidates) {
    const folder = path.posix.dirname(candidate.path);
    if (!folders.has(folder) && folders.size >= THREAD_GALLERY_FOLDER_LIMIT) {
      omittedMedia = true;
      continue;
    }
    if (candidates.length >= THREAD_GALLERY_ITEM_LIMIT) {
      omittedMedia = true;
      continue;
    }
    folders.add(folder);
    candidates.push(candidate);
  }

  const previews = new Map<
    string,
    { baseUrl: string; expiresAtMs: number }
  >();
  for (const folder of folders) {
    const previewRoot =
      folder === "."
        ? root.value
        : root.api.join(root.value, ...folder.split("/"));
    previews.set(
      folder,
      await bb.sdk.files.createPreview({
        hostId: environment.hostId,
        rootPath: previewRoot,
        ttlMs: PREVIEW_TTL_MS,
      }),
    );
  }

  const items = candidates.map((candidate) => {
    const folder = path.posix.dirname(candidate.path);
    const preview = previews.get(folder);
    if (!preview) throw new Error("Media preview could not be created.");
    const item = mediaItemUrl(
      bb.pluginId,
      candidate,
      preview,
      folder === "."
        ? root.value
        : root.api.join(root.value, ...folder.split("/")),
      root.api,
      environment.hostId,
    );
    return {
      path: candidate.path,
      name: candidate.name,
      kind: candidate.kind,
      url: item.url,
    };
  });
  const expiresAtMs =
    previews.size > 0
      ? Math.min(
          ...Array.from(previews.values(), (preview) => preview.expiresAtMs),
          ...candidates
            .filter((candidate) => candidate.kind === "video")
            .map(() => Date.now() + PREVIEW_TTL_MS),
        )
      : Date.now() + PREVIEW_TTL_MS;

  return {
    folderName: "Thread storage",
    items,
    selectedIndex: 0,
    truncated: listing.truncated || omittedMedia,
    expiresAtMs,
  };
}

async function listMedia(bb: BbPluginApi, input: ListMediaInput) {
  const listing =
    input.source.kind === "thread-storage"
      ? await resolveThreadStorage(bb, input)
      : input.source.kind === "workspace"
        ? await resolveWorkspace(bb, input)
        : await resolveHost(bb, input);

  const preview = await bb.sdk.files.createPreview({
    rootPath: listing.previewRoot,
    ttlMs: PREVIEW_TTL_MS,
    ...(listing.previewHostId ? { hostId: listing.previewHostId } : {}),
  });
  const selectedKey = listing.caseInsensitive
    ? listing.selectedKey.toLowerCase()
    : listing.selectedKey;
  const items = listing.candidates.map((candidate) => ({
    path: candidate.path,
    name: candidate.name,
    kind: candidate.kind,
    url: mediaItemUrl(
      bb.pluginId,
      candidate,
      preview,
      listing.previewRoot,
      listing.previewApi,
      listing.previewHostId,
    ).url,
  }));
  const selectedIndex = listing.candidates.findIndex((candidate) => {
    const key = listing.caseInsensitive
      ? candidate.selectionKey.toLowerCase()
      : candidate.selectionKey;
    return key === selectedKey;
  });
  if (selectedIndex < 0) throw new Error("Selected media was not found in its folder.");

  return {
    folderName: listing.folderName,
    items,
    selectedIndex,
    truncated: listing.truncated,
    expiresAtMs: preview.expiresAtMs,
  };
}

export default function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  bb.http.route("GET", VIDEO_ROUTE, (context) => serveVideo(context, bb), {
    auth: "local",
  });
  bb.http.route("HEAD", VIDEO_ROUTE, (context) => serveVideo(context, bb), {
    auth: "local",
  });

  bb.rpc.register(rpcContract, {
    listMedia: (input) => listMedia(bb, input),
    listThreadMedia: (input) => listThreadMedia(bb, input),
  });

  bb.onDispose(() => {
    videoLeases.clear();
    bb.log.info("disposed");
  });
}
