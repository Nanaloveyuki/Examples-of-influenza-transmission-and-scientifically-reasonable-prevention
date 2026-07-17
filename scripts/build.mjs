import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

const data = (await read("src/data/strains.js")).replaceAll("export const ", "const ");
const campusMap = (await read("src/data/campus-map.js")).replaceAll("export const ", "const ");
const engine = (await read("src/simulation/engine.js"))
  .replace('import { STRAINS } from "../data/strains.js";\n', "")
  .replace('import { CAMPUS_MODES, LOCATIONS, NAV_EDGES, NAV_NODES, QUEUE_NODES } from "../data/campus-map.js";\n', "")
  .replace("export class CampusSimulation", "class CampusSimulation");
const renderer = (await read("src/renderer/campus-renderer.js"))
  .replace('import { BUILDINGS, LOCATIONS, NAV_EDGES, NAV_NODES } from "../data/campus-map.js";\n\n', "")
  .replace("export class CampusRenderer", "class CampusRenderer");
const controls = (await read("src/ui/controls.js"))
  .replace('import { ATTENTION_LABELS, DENSITY_LABELS, HYGIENE_LABELS, POLICY_NOTES, SCENARIOS, STRAINS, VENTILATION_LABELS } from "../data/strains.js";\n', "")
  .replace('import { CAMPUS_MODES } from "../data/campus-map.js";\n', "")
  .replace("const element = ", "const controlElement = ")
  .replaceAll("element(", "controlElement(")
  .replace("export function setupControls", "function setupControls");
const main = (await read("src/main.js"))
  .replace('import { CampusRenderer } from "./renderer/campus-renderer.js";\n', "")
  .replace('import { CampusSimulation } from "./simulation/engine.js";\n', "")
  .replace('import { setupControls } from "./ui/controls.js";\n', "")
  .replace('import { CAMPUS_MODES } from "./data/campus-map.js";\n', "");

await writeFile(resolve(root, "app.js"), "(() => {\n" + data + "\n" + campusMap + "\n" + engine + "\n" + renderer + "\n" + controls + "\n" + main + "\n})();\n");
