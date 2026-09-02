import type {
  PluginFileOpenerProps,
} from "@get-bb/plugin-sdk/app";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { rpcContract } from "./server";

export type MediaItem = {
  path: string;
  name: string;
  kind: "image" | "video";
  url: string;
};

export type GalleryData = {
  folderName: string;
  items: MediaItem[];
  selectedIndex: number;
  truncated: boolean;
  expiresAtMs: number;
};

type ExpandedMediaProps = {
  items: MediaItem[];
  index: number;
  showPath: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

type GalleryContentProps = {
  data: GalleryData;
  currentIndex: number | null;
  sourceLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  groupByFolder: boolean;
  showHeader?: boolean;
};

const PREVIEW_REFRESH_LEAD_MS = 30_000;
const MAX_TIMER_DELAY_MS = 2_147_483_647;

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.25 5.6v12.8L18.5 12 8.25 5.6Z" fill="currentColor" />
    </svg>
  );
}

function ExpandedMedia({
  items,
  index,
  showPath,
  onClose,
  onNavigate,
}: ExpandedMediaProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const item = items[index];
  const displayName = showPath ? item.path : item.name;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (!video) return;
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // A video can reject seeking before its metadata is available.
      }
      video.removeAttribute("src");
    };
  }, [item.url]);

  const navigate = (delta: number) => {
    onNavigate((index + delta + items.length) % items.length);
  };

  return (
    <dialog
      ref={dialogRef}
      className="media-gallery-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (items.length < 2) return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          navigate(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          navigate(1);
        }
      }}
    >
      <div className="media-gallery-dialog-surface">
        <button
          type="button"
          className="media-gallery-dialog-close"
          aria-label="Close media preview"
          onClick={onClose}
          autoFocus
        >
          <span aria-hidden="true">×</span>
        </button>

        {items.length > 1 ? (
          <button
            type="button"
            className="media-gallery-dialog-nav media-gallery-dialog-nav-previous"
            aria-label="Previous media"
            onClick={() => navigate(-1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
        ) : null}

        <div className="media-gallery-dialog-stage" data-media-kind={item.kind}>
          {item.kind === "video" ? (
            <video
              key={item.url}
              ref={videoRef}
              className="media-gallery-expanded-media"
              src={item.url}
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label={displayName}
            />
          ) : (
            <img
              key={item.url}
              className="media-gallery-expanded-media"
              src={item.url}
              alt={displayName}
            />
          )}
        </div>

        {items.length > 1 ? (
          <button
            type="button"
            className="media-gallery-dialog-nav media-gallery-dialog-nav-next"
            aria-label="Next media"
            onClick={() => navigate(1)}
          >
            <span aria-hidden="true">›</span>
          </button>
        ) : null}

        <div className="media-gallery-dialog-meta">
          <h2 id={titleId}>{displayName}</h2>
          <p id={descriptionId}>
            {index + 1} of {items.length}
          </p>
        </div>
      </div>
    </dialog>
  );
}

export function usePreviewRefresh(
  data: GalleryData | null,
  refresh: () => void,
) {
  useEffect(() => {
    if (!data) return;
    const delay = Math.min(
      MAX_TIMER_DELAY_MS,
      Math.max(1_000, data.expiresAtMs - Date.now() - PREVIEW_REFRESH_LEAD_MS),
    );
    const timer = window.setTimeout(refresh, delay);
    return () => window.clearTimeout(timer);
  }, [data, refresh]);
}

export function MediaGalleryContent({
  data,
  currentIndex,
  sourceLabel,
  emptyTitle,
  emptyDescription,
  groupByFolder,
  showHeader = true,
}: GalleryContentProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const previousData = useRef(data);

  useEffect(() => {
    if (previousData.current === data) return;
    previousData.current = data;
    setSelectedIndex(null);
  }, [data]);

  if (data.items.length === 0) {
    return (
      <div className="media-gallery-state">
        <strong>{emptyTitle}</strong>
        <span>{emptyDescription}</span>
      </div>
    );
  }

  const groupedItems = new Map<
    string,
    Array<{ item: MediaItem; index: number }>
  >();
  for (const [index, item] of data.items.entries()) {
    const slashIndex = item.path.lastIndexOf("/");
    const folder = groupByFolder
      ? slashIndex >= 0
        ? item.path.slice(0, slashIndex)
        : "."
      : "";
    const group = groupedItems.get(folder) ?? [];
    group.push({ item, index });
    groupedItems.set(folder, group);
  }
  const expandedIndex =
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < data.items.length
      ? selectedIndex
      : null;

  return (
    <div className="media-gallery-file-opener" data-bb-image-preview-ignore="true">
      {showHeader ? (
        <header className="media-gallery-header">
          <div>
            <h1>{data.folderName}</h1>
            <p>
              {data.items.length} {data.items.length === 1 ? "item" : "items"}
              {data.truncated ? " · More files were not shown" : ""}
            </p>
          </div>
          <span className="media-gallery-source-badge">{sourceLabel}</span>
        </header>
      ) : null}

      <div className="media-gallery-groups">
        {Array.from(groupedItems, ([folder, entries]) => (
          <section className="media-gallery-group" key={folder || "all-media"}>
            {groupByFolder ? (
              <h2>{folder === "." ? "Thread storage root" : folder}</h2>
            ) : null}
            <div className="media-gallery-grid" aria-label="Media files">
              {entries.map(({ item, index }) => {
                const isCurrent = currentIndex !== null && index === currentIndex;
                const action = item.kind === "video" ? "Play video" : "Expand image";
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`media-gallery-tile${isCurrent ? " is-current" : ""}`}
                    data-media-kind={item.kind}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`${action}: ${item.name}`}
                    onClick={() => setSelectedIndex(index)}
                  >
                    {item.kind === "video" ? (
                      <video
                        className="media-gallery-tile-media"
                        src={item.url}
                        muted
                        playsInline
                        preload="metadata"
                        aria-hidden="true"
                      />
                    ) : (
                      <img
                        className="media-gallery-tile-media"
                        src={item.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    )}

                    {item.kind === "video" ? (
                      <span className="media-gallery-play" aria-hidden="true">
                        <PlayIcon />
                      </span>
                    ) : null}

                    <span className="media-gallery-tile-label">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {expandedIndex !== null ? (
        <ExpandedMedia
          items={data.items}
          index={expandedIndex}
          showPath={groupByFolder}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
        />
      ) : null}
    </div>
  );
}

export function MediaGalleryFileOpener({ path, source }: PluginFileOpenerProps) {
  const rpc = useRpc<typeof rpcContract>();
  const [data, setData] = useState<GalleryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const refresh = useCallback(() => {
    setRefreshNonce((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    void rpc
      .call("listMedia", { path, source })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Could not load this gallery.");
      });

    return () => {
      cancelled = true;
    };
  }, [
    path,
    rpc,
    source.environmentId,
    source.kind,
    source.projectId,
    source.threadId,
    refreshNonce,
  ]);

  usePreviewRefresh(data, refresh);

  if (error) {
    return (
      <div className="media-gallery-state" role="alert">
        <strong>Gallery unavailable</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="media-gallery-state" role="status">
        <span className="media-gallery-spinner" aria-hidden="true" />
        <span>Loading media…</span>
      </div>
    );
  }

  return (
    <MediaGalleryContent
      data={data}
      currentIndex={data.selectedIndex}
      sourceLabel={source.kind === "thread-storage" ? "Thread storage" : "Files"}
      emptyTitle="No media in this folder"
      emptyDescription="Supported images and videos will appear here."
      groupByFolder={false}
    />
  );
}
