# Image Preview

`bb-plugin-image-preview` turns images in BB chat messages into compact,
clickable thumbnails. Click or press Enter/Space on a thumbnail to open a
larger lightbox. Escape, the close button, or the backdrop closes it.

It supports images rendered by Markdown, temporary/blob images, and ordinary
image-file links in message content. Composer previews and small UI artwork
are left unchanged.

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
