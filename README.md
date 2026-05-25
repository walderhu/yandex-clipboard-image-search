# Clipboard Image Search for Yandex

Local Chromium/Yandex Browser extension.

Click the extension button:

1. Reads the clipboard.
2. If there is an image, uploads it to Yandex Images.
3. Opens reverse image search results in a new tab.
4. If there is text instead, opens a normal Yandex text search.

Install in Yandex Browser:

1. Open `browser://extensions`.
2. Enable developer mode.
3. Click "Load unpacked".
4. Select this folder.

The extension sends clipboard images only to Yandex's image upload endpoint:

`https://yandex.ru/images-apphost/image-download`
