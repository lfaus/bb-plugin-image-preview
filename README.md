# Media Gallery

`bb-plugin-image-preview` turns images and videos in BB chat messages into a
compact gallery. It also provides a Media Gallery file opener for workspace,
host, and Thread storage files.

Image tiles expand into a larger lightbox. Video tiles show a play button and
never play in the grid; playback controls and the video source are added only
inside the expanded viewer. Escape, the close button, or the backdrop closes
the viewer.

The chat gallery supports media rendered by Markdown, temporary/blob media,
and ordinary media-file links. Composer previews and small UI artwork are left
unchanged.

## Local file links in chat

Agents often link media by absolute path (`/Users/you/shots/a.png`) or by a
workspace-relative path. BB cannot serve those hrefs directly, so the chat
script asks the plugin server for a preview URL for that file's folder (one
`listMedia` call per folder, cached until the preview nears expiry) and swaps
it into the generated tile. Galleries rebuild once the URL lands. Links with a
real scheme (`https:`, `blob:`, `data:`) are used as-is.

## Thread storage

When the Thread storage info view is open, the plugin replaces the native file
tree with the same thumbnail gallery used for chat media. Images open in the
gallery lightbox. Videos show a play button and only play in the expanded
viewer.

The file opener remains available for workspace and host files. To use it by
default for an extension, select Media Gallery in **Settings → File openers**.

The opener groups media files from the selected file's folder. BB's preview
transport currently supports images up to 10 MiB and videos up to 25 MiB.

## Install

```sh
npm install
bb plugin install .
```

After editing the plugin:

```sh
bb plugin reload image-preview
```

## Verify

```sh
npm test
npm run typecheck
npm run build
```
