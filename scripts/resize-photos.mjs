import { mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const photos = new URL("../public/photos/ky/", import.meta.url);
const small = new URL("sm/", photos);
await mkdir(small, { recursive: true });
for (const name of (await readdir(photos)).filter((file) => file.endsWith(".jpg"))) {
  await sharp(fileURLToPath(new URL(name, photos)))
    .resize(240, 300)
    .webp({ quality: 72 })
    .toFile(fileURLToPath(new URL(name.replace(/\.jpg$/, ".webp"), small)));
}
