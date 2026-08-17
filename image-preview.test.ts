import { afterEach, describe, expect, it } from "vitest";
import { isChatImage, LIGHTBOX_ID, mountImagePreview } from "./image-preview";

const IMAGE_SOURCE = "data:image/png;base64,deadbeef";

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

afterEach(() => {
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

  it("adds a thumbnail for an image-file link in a message", () => {
    const message = document.createElement("article");
    message.dataset.messageId = "message-2";
    const link = document.createElement("a");
    link.href = "/tmp/generated-diff.png";
    link.textContent = "generated-diff.png";
    message.append(link);
    document.body.append(message);

    const dispose = mountImagePreview(new AbortController().signal);

    expect(link.querySelector("img")?.classList.contains("bb-image-preview-thumbnail")).toBe(
      true,
    );

    dispose();
  });
});
