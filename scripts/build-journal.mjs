import { copyFile, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, "public");
const outputDir = join(root, "dist-journal");

await rm(outputDir, { recursive: true, force: true });
await mkdir(join(outputDir, "assets"), { recursive: true });

const journalHtml = await readFile(join(publicDir, "journal.html"), "utf8");
const standaloneHtml = journalHtml.replace(/\s*<a class="metadata-button journal-planner-link" href="\.\/">Planner<\/a>/, "");

await writeFile(join(outputDir, "index.html"), standaloneHtml);
await copyFile(join(publicDir, "journal.js"), join(outputDir, "journal.js"));
await copyFile(join(publicDir, "styles.css"), join(outputDir, "styles.css"));
await copyFile(join(publicDir, "assets", "paper-texture.png"), join(outputDir, "assets", "paper-texture.png"));
