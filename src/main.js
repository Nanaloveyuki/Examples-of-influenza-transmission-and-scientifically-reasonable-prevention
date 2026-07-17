import { CampusRenderer } from "./renderer/campus-renderer.js";
import { CampusSimulation } from "./simulation/engine.js";
import { setupControls } from "./ui/controls.js";
import { CAMPUS_MODES } from "./data/campus-map.js";

const element = (id) => document.querySelector("#" + id);
const ui = {
  run: element("run-button"), runLabel: element("run-label"), reset: element("reset-button"),
  status: element("status-text"), clock: element("clock"), caption: element("canvas-caption"),
  riskLabel: element("risk-label"), riskSummary: element("risk-summary"),
  recommendationTitle: element("recommendation-title"), recommendationDetail: element("recommendation-detail"),
  population: element("population-label"), evidenceDialog: element("evidence-dialog"),
  step: element("step-button"), timeStep: element("time-step"), speed: element("simulation-speed"),
  viewReset: element("view-reset-button"), mapMenu: element("map-menu"),
};
let simulation;
let renderer;
let running = false;
let lastTimestamp = 0;
let stepAccumulator = 0;

const controls = setupControls(
  (settings) => { if (simulation) { simulation.updateSettings(settings); renderUi(); } },
  () => { simulation.reset(); renderUi(); },
);
simulation = new CampusSimulation(controls.getSettings());
renderer = new CampusRenderer(element("campus-canvas"), { onContextMenu: openMapMenu });

function hideMapMenu() {
  ui.mapMenu.hidden = true;
  ui.mapMenu.replaceChildren();
}

function addMapMenuButton(label, callback, active = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.classList.toggle("is-active", active);
  button.addEventListener("click", () => {
    callback();
    hideMapMenu();
    renderUi();
  });
  ui.mapMenu.append(button);
}

function openMapMenu({ building, x, y }) {
  if (!building) {
    renderer.resetView();
    hideMapMenu();
    ui.status.textContent = "已回到全局鸟瞰";
    return;
  }
  renderer.setFocus({ buildingId: building.id, floor: 1 });
  ui.mapMenu.replaceChildren();
  const title = document.createElement("p");
  title.textContent = building.label + " · 选择楼层";
  ui.mapMenu.append(title);
  for (let floor = 1; floor <= building.floors; floor += 1) {
    addMapMenuButton(floor + " 层", () => {
      renderer.setFocus({ buildingId: building.id, floor });
      ui.status.textContent = building.label + " · " + floor + "层";
    }, floor === 1);
  }
  addMapMenuButton("返回全局鸟瞰", () => {
    renderer.resetView();
    ui.status.textContent = "已回到全局鸟瞰";
  });
  ui.mapMenu.style.left = Math.min(x, element("campus-canvas").clientWidth - 176) + "px";
  ui.mapMenu.style.top = Math.min(y, element("campus-canvas").clientHeight - 210) + "px";
  ui.mapMenu.hidden = false;
  ui.status.textContent = building.label + " · 1层";
}

function riskCopy(index, settings) {
  if (index > 2.15) return { label: "传播风险较高", summary: "室内接触密集且防护不足，建议立即强化措施。", title: "压低室内密度与暴露机会", detail: "优先安排症状筛查与居家休息，改善通风，并提高口罩覆盖。" };
  if (index > 1.25) return { label: "需要持续观察", summary: "传播条件存在，早发现与早隔离可显著改变轨迹。", title: settings.mask < 60 ? "提高口罩覆盖" : "保持症状筛查", detail: settings.mask < 60 ? "密集室内场景优先提升佩戴比例。" : "发现发热、咳嗽等症状时应尽早评估并减少接触。" };
  return { label: "传播风险较低", summary: "多项防护共同降低了近距离暴露的机会。", title: "维持组合防护", detail: "继续保持通风、卫生清洁和及时隔离，而非依赖单一措施。" };
}

function renderUi() {
  const counts = simulation.counts();
  const index = simulation.riskIndex();
  const settings = controls.getSettings();
  element("metric-susceptible").textContent = counts.susceptible;
  element("metric-exposed").textContent = counts.exposed;
  element("metric-symptomatic").textContent = counts.symptomatic;
  element("metric-recovered").textContent = counts.recovered;
  element("metric-severe").textContent = simulation.severeCount();
  element("metric-r").textContent = index.toFixed(1);
  ui.population.textContent = simulation.people.length;
  const clockMinutes = (CAMPUS_MODES[settings.campusMode].startMinute + simulation.elapsedMinutes) % 1440;
  ui.clock.textContent = "DAY " + String(simulation.day).padStart(2, "0") + " · " + String(Math.floor(clockMinutes / 60)).padStart(2, "0") + ":" + String(clockMinutes % 60).padStart(2, "0");
  ui.caption.textContent = simulation.phaseLabel + " · " + (running ? simulation.contacts.length + " 条近距离接触路径正在被观察" : "可单步观察人员迁移");
  const copy = riskCopy(index, settings);
  ui.riskLabel.textContent = copy.label;
  ui.riskSummary.textContent = copy.summary;
  ui.recommendationTitle.textContent = copy.title;
  ui.recommendationDetail.textContent = copy.detail;
  renderer.render(simulation);
}

function setRunning(next) {
  running = next;
  ui.run.classList.toggle("is-running", running);
  ui.runLabel.textContent = running ? "暂停演练" : "继续演练";
  ui.status.textContent = running ? "演练进行中" : "模拟已暂停";
  if (running) requestAnimationFrame(frame);
  renderUi();
}

function frame(timestamp) {
  if (!running) return;
  const delta = Math.min((timestamp - lastTimestamp) / 1000, .08);
  lastTimestamp = timestamp;
  stepAccumulator += delta * Number(ui.speed.value);
  while (stepAccumulator >= .7) {
    simulation.advance(Number(ui.timeStep.value));
    stepAccumulator -= .7;
  }
  renderUi();
  requestAnimationFrame(frame);
}

ui.run.addEventListener("click", () => { lastTimestamp = performance.now(); setRunning(!running); });
ui.reset.addEventListener("click", () => { simulation.reset(); stepAccumulator = 0; ui.status.textContent = "模拟已重置"; renderUi(); });
ui.step.addEventListener("click", () => { simulation.advance(Number(ui.timeStep.value)); ui.status.textContent = "已推进 " + ui.timeStep.value + " 分钟"; renderUi(); });
ui.timeStep.addEventListener("change", () => { ui.step.textContent = "+" + ui.timeStep.value + " 分钟"; });
ui.viewReset.addEventListener("click", () => { renderer.resetView(); hideMapMenu(); ui.status.textContent = "已回到地图中心"; renderUi(); });
document.addEventListener("pointerdown", (event) => { if (!ui.mapMenu.contains(event.target)) hideMapMenu(); });
element("source-button").addEventListener("click", () => ui.evidenceDialog.showModal());
element("close-evidence").addEventListener("click", () => ui.evidenceDialog.close());
ui.evidenceDialog.addEventListener("click", (event) => { if (event.target === ui.evidenceDialog) ui.evidenceDialog.close(); });
renderUi();
