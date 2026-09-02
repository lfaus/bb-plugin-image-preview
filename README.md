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
