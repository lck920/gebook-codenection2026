import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const UA = "Gebook/0.1 (hackathon project; contact tanlokqi@gmail.com)";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public/destinations");
const OUT = process.argv[2] ?? join(ROOT, "public/destinations/credits.json");

/** id -> Commons file name (no "File:" prefix). */
const FILES = {
  "genin-lake": "Lac Genin 3.jpg",
  "lake-como": "Sentiero del Viandante DSC 6340 (14020554463).jpg",
  "banff-park": "Moraine Lake 17092005.jpg",
  "kyoto-old-town": "Arashiyama, Part II - Arashiyama7534.jpg",
  santorini: "Oia sunset - panoramio (2).jpg",
  reykjavik: "Reykjavík, view from Hallgrímskirkja (2).jpg",
  marrakesh: "Pavillon Menaragärten.jpg",
  queenstown: "Queenstown 1 (8168013172).jpg",
  "ha-long-bay": "Ha Long Bay in 2019.jpg",
  "machu-picchu": "Machu Picchu, 2023 (012).jpg",
  ubud: "Ubud (49818456887).jpg",
  langkawi: "Eagle square at Kuah Langkawi.jpg",
};

function text(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

await mkdir(DIR, { recursive: true });
const credits = [];
for (const [id, file] of Object.entries(FILES)) {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
    "&iiprop=url|extmetadata&iiurlwidth=1200&titles=" +
    encodeURIComponent("File:" + file);
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  const data = await res.json();
  const page = Object.values(data.query.pages)[0];
  const info = page.imageinfo?.[0];
  if (!info) { console.log(`${id}: NOT FOUND`); continue; }

  const meta = info.extmetadata ?? {};
  const bytes = await fetch(info.thumburl, { headers: { "User-Agent": UA } }).then((r) =>
    r.arrayBuffer(),
  );
  await sharp(Buffer.from(bytes))
    .resize({ width: 1000, height: 700, fit: "cover", position: "attention" })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(join(DIR, `${id}.jpg`));

  credits.push({
    id,
    file,
    artist: text(meta.Artist?.value) || "Unknown",
    license: text(meta.LicenseShortName?.value) || "See Commons",
    source: info.descriptionurl,
  });
  console.log(`${id}: ok (${text(meta.LicenseShortName?.value)})`);
}
await writeFile(OUT, JSON.stringify(credits, null, 2));
