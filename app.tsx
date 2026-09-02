import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { mountImagePreview } from "./image-preview";
import { mountThreadStorageGallery } from "./thread-storage-content";
import { ALL_MEDIA_EXTENSIONS } from "./media";
import {
  MediaGalleryFileOpener,
} from "./media-gallery";
import "./app.css";

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "chat-media-preview",
    mount: ({ signal }) => mountImagePreview(signal),
  });

  app.contentScripts.register({
    id: "thread-storage-media-gallery",
    mount: ({ signal }) => mountThreadStorageGallery(signal),
  });

  app.slots.fileOpener({
    id: "media-gallery",
    title: "Media Gallery",
    extensions: ALL_MEDIA_EXTENSIONS,
    component: MediaGalleryFileOpener,
  });

});
