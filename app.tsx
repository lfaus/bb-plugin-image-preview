import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { mountImagePreview } from "./image-preview";

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "chat-image-preview",
    mount: ({ signal }) => mountImagePreview(signal),
  });
});
