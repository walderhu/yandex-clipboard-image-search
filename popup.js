const YANDEX_UPLOAD_URL = "https://yandex.ru/images-apphost/image-download";
const YANDEX_RESULT_URL = "https://yandex.ru/images/search?rpt=imageview&url=";
const YANDEX_TEXT_URL = "https://ya.ru/search/?text=";

const statusEl = document.querySelector("#status");
const previewEl = document.querySelector("#preview");
const pasteButton = document.querySelector("#paste");
const openYaButton = document.querySelector("#openYa");

setStatus("Нажми кнопку, чтобы прочитать буфер.");
pasteButton.addEventListener("click", () => run());
openYaButton.addEventListener("click", () => openTab("https://ya.ru/"));

async function run() {
  pasteButton.disabled = true;
  setStatus("Reading clipboard...");
  clearPreview();

  try {
    const item = await readClipboard();

    if (item.kind === "image") {
      showPreview(item.blob);
      setStatus("Uploading image to Yandex...");
      const jpegBlob = await normalizeImage(item.blob);
      const imageUrl = await uploadToYandex(jpegBlob);
      await openTab(YANDEX_RESULT_URL + encodeURIComponent(imageUrl));
      window.close();
      return;
    }

    if (item.kind === "text") {
      setStatus("Searching clipboard text...");
      await openTab(YANDEX_TEXT_URL + encodeURIComponent(item.text.trim()));
      window.close();
      return;
    }

    throw new Error("Clipboard does not contain an image or text.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Clipboard search failed.");
  } finally {
    pasteButton.disabled = false;
  }
}

async function readClipboard() {
  if (!navigator.clipboard?.read) {
    throw new Error("This browser does not expose image clipboard access here.");
  }

  const items = await navigator.clipboard.read();
  let lastImage = null;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (imageType) {
      lastImage = { item, imageType };
    }
  }

  if (lastImage) {
    return {
      kind: "image",
      blob: await lastImage.item.getType(lastImage.imageType)
    };
  }

  for (const item of items) {
    if (item.types.includes("text/plain")) {
      const blob = await item.getType("text/plain");
      const text = await blob.text();
      if (text.trim()) {
        return { kind: "text", text };
      }
    }
  }

  return { kind: "empty" };
}

async function normalizeImage(blob) {
  const bitmap = await createImageBitmap(blob);
  const limit = 1600;
  const scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.88
  });
}

async function uploadToYandex(blob) {
  const response = await fetch(YANDEX_UPLOAD_URL, {
    method: "POST",
    headers: {
      "accept": "*/*",
      "content-type": "image/jpeg"
    },
    body: await blob.arrayBuffer()
  });

  if (!response.ok) {
    throw new Error(`Yandex upload failed: HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (!payload?.url) {
    throw new Error("Yandex did not return an image URL.");
  }

  return payload.url;
}

async function openTab(url) {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  await chrome.tabs.create({
    url,
    index: activeTab?.index == null ? undefined : activeTab.index + 1
  });
}

function showPreview(blob) {
  const img = document.createElement("img");
  img.alt = "Clipboard image preview";
  img.src = URL.createObjectURL(blob);
  previewEl.replaceChildren(img);
  previewEl.classList.remove("hidden");
}

function clearPreview() {
  const img = previewEl.querySelector("img");
  if (img?.src) URL.revokeObjectURL(img.src);
  previewEl.replaceChildren();
  previewEl.classList.add("hidden");
}

function setStatus(message) {
  statusEl.textContent = message;
}
