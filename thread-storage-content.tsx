import { createRoot, type Root } from "react-dom/client";
import { useCallback, useEffect, useState } from "react";

import {
  MediaGalleryContent,
  usePreviewRefresh,
  type GalleryData,
} from "./media-gallery";

const STORAGE_GALLERY_ROOT_ATTRIBUTE =
  "data-bb-image-preview-thread-storage-gallery";

type StorageGalleryMount = {
  host: HTMLDivElement;
  nativeChildren: Array<{ element: HTMLElement; display: string }>;
  root: Root;
  row: HTMLElement;
};

type RpcEnvelope =
  | { ok: true; result: GalleryData }
  | { ok: false; error?: { message?: string } };

function InlineThreadStorageGallery({ threadId }: { threadId: string }) {
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

    void fetch("/api/v1/plugins/image-preview/rpc/listThreadMedia", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId }),
    })
      .then(async (response) => {
        const envelope = (await response.json()) as RpcEnvelope;
        if (!response.ok || !envelope.ok) {
          throw new Error(
            (!envelope.ok ? envelope.error?.message : null) ??
              "Could not load Thread storage.",
          );
        }
        return envelope.result;
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Could not load Thread storage.");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshNonce, threadId]);

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
        <span>Loading Thread storage…</span>
      </div>
    );
  }

  return (
    <MediaGalleryContent
      data={data}
      currentIndex={null}
      sourceLabel="Thread storage"
      emptyTitle="No media in Thread storage"
      emptyDescription="Images and videos created by this thread will appear here."
      groupByFolder
      showHeader={false}
    />
  );
}

function currentThreadId(): string | null {
  const match = window.location.pathname.match(/(?:^|\/)\b(thr_[A-Za-z0-9_-]+)\b/);
  return match?.[1] ?? null;
}

function findThreadStorageValue(): {
  row: HTMLElement;
  value: HTMLElement;
} | null {
  const labels = Array.from(document.querySelectorAll<HTMLElement>("dt")).filter(
    (label) => label.textContent?.trim() === "Thread storage",
  );

  for (const label of labels) {
    const row = label.parentElement;
    if (!(row instanceof HTMLElement)) continue;
    const value = Array.from(row.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === "DD",
    );
    if (value) return { row, value };
  }
  return null;
}

function restoreMount(mount: StorageGalleryMount): void {
  mount.root.unmount();
  mount.host.remove();
  for (const { element, display } of mount.nativeChildren) {
    element.style.display = display;
  }
}

function mountStorageGallery(
  target: { row: HTMLElement; value: HTMLElement },
  threadId: string,
): StorageGalleryMount | null {
  if (target.value.querySelector(`[${STORAGE_GALLERY_ROOT_ATTRIBUTE}]`)) {
    return null;
  }

  const nativeChildren = Array.from(target.value.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .map((element) => ({ element, display: element.style.display }));
  for (const { element } of nativeChildren) {
    element.style.display = "none";
  }

  const host = document.createElement("div");
  host.setAttribute(STORAGE_GALLERY_ROOT_ATTRIBUTE, "true");
  host.style.height = "100%";
  host.style.minHeight = "0";
  host.style.width = "100%";
  target.value.append(host);

  const root = createRoot(host);
  root.render(<InlineThreadStorageGallery threadId={threadId} />);
  return { host, nativeChildren, root, row: target.row };
}

export function mountThreadStorageGallery(signal: AbortSignal): () => void {
  let disposed = false;
  let scheduled = false;
  let mount: StorageGalleryMount | null = null;

  const reconcile = () => {
    scheduled = false;
    if (disposed) return;

    const threadId = currentThreadId();
    if (!threadId) {
      if (mount) {
        restoreMount(mount);
        mount = null;
      }
      return;
    }
    const target = findThreadStorageValue();
    if (!target) {
      if (mount) {
        restoreMount(mount);
        mount = null;
      }
      return;
    }

    if (mount && (!mount.row.isConnected || !target.value.contains(mount.host))) {
      restoreMount(mount);
      mount = null;
    }
    if (!mount) {
      mount = mountStorageGallery(target, threadId);
    }
  };

  const schedule = () => {
    if (scheduled || disposed) return;
    scheduled = true;
    queueMicrotask(reconcile);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  schedule();

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    window.removeEventListener("popstate", schedule);
    window.removeEventListener("hashchange", schedule);
    if (mount) restoreMount(mount);
    mount = null;
  };

  if (signal.aborted) dispose();
  else signal.addEventListener("abort", dispose, { once: true });

  return dispose;
}
