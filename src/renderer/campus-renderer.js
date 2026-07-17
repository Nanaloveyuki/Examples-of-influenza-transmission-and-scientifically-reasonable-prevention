import { BUILDINGS, LOCATIONS, NAV_EDGES, NAV_NODES } from "../data/campus-map.js";

const COLORS = { susceptible: "#d9e4e2", exposed: "#efbf52", symptomatic: "#df5b4c", recovered: "#5fa88d", ground: "#0b2029" };

export class CampusRenderer {
  constructor(canvas, { onContextMenu } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.onContextMenu = onContextMenu;
    this.view = { centerX: 0.5, centerY: 0.5, zoom: 1 };
    this.focus = null;
    this.drag = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.bindControls();
    this.resize();
  }

  bindControls() {
    this.canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      this.drag = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.drag) return;
      this.view.centerX -= (event.clientX - this.drag.x) / (this.width * this.view.zoom);
      this.view.centerY -= (event.clientY - this.drag.y) / (this.height * this.view.zoom);
      this.drag = { x: event.clientX, y: event.clientY };
      this.clampView();
      this.render(this.latestSimulation);
    });
    this.canvas.addEventListener("pointerup", (event) => {
      this.drag = null;
      this.canvas.releasePointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const point = this.canvasPoint(event);
      const before = this.screenToWorld(point.x, point.y);
      this.view.zoom = Math.max(0.65, Math.min(5, this.view.zoom * (event.deltaY > 0 ? 0.87 : 1.15)));
      const after = this.screenToWorld(point.x, point.y);
      this.view.centerX += before.x - after.x;
      this.view.centerY += before.y - after.y;
      this.clampView();
      this.render(this.latestSimulation);
    }, { passive: false });
    this.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const point = this.canvasPoint(event);
      const world = this.screenToWorld(point.x, point.y);
      const building = this.getBuildingAt(world);
      this.onContextMenu?.({ building, x: point.x, y: point.y });
    });
  }

  canvasPoint(event) {
    const box = this.canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  clampView() {
    const margin = 0.55 / this.view.zoom;
    this.view.centerX = Math.max(-margin, Math.min(1 + margin, this.view.centerX));
    this.view.centerY = Math.max(-margin, Math.min(1 + margin, this.view.centerY));
  }

  resetView() {
    this.view = { centerX: 0.5, centerY: 0.5, zoom: 1 };
    this.focus = null;
    this.render(this.latestSimulation);
  }

  setFocus(focus) {
    this.focus = focus;
    if (focus) {
      const building = BUILDINGS.find((item) => item.id === focus.buildingId);
      this.view.centerX = building.bounds.x + building.bounds.width / 2;
      this.view.centerY = building.bounds.y + building.bounds.height / 2;
      this.view.zoom = 2.35;
    }
    this.render(this.latestSimulation);
  }

  resize() {
    const box = this.canvas.parentElement.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(box.width * ratio);
    this.canvas.height = Math.round(box.height * ratio);
    this.canvas.style.width = box.width + "px";
    this.canvas.style.height = box.height + "px";
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = box.width;
    this.height = box.height;
    if (this.latestSimulation) this.render(this.latestSimulation);
  }

  worldToScreen(x, y) {
    return {
      x: ((x - this.view.centerX) * this.view.zoom + 0.5) * this.width,
      y: ((y - this.view.centerY) * this.view.zoom + 0.5) * this.height,
    };
  }

  screenToWorld(x, y) {
    return {
      x: (x / this.width - 0.5) / this.view.zoom + this.view.centerX,
      y: (y / this.height - 0.5) / this.view.zoom + this.view.centerY,
    };
  }

  render(simulation) {
    if (!simulation || !this.width) return;
    this.latestSimulation = simulation;
    this.currentStrain = simulation.settings.strain;
    const ctx = this.context;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawGround(ctx);
    this.drawRoutes(ctx);
    this.drawBuildings(ctx);
    this.drawRoomLoads(ctx, simulation.people);
    this.drawContacts(ctx, simulation.contacts);
    this.drawPeople(ctx, simulation.people);
    this.drawFocusLabel(ctx);
  }

  drawGround(ctx) {
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = "rgba(210,237,232,.065)";
    ctx.lineWidth = 1;
    const step = this.view.zoom > 2 ? 0.025 : 0.05;
    for (let value = -0.2; value <= 1.2; value += step) {
      const x = this.worldToScreen(value, 0).x;
      const y = this.worldToScreen(0, value).y;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }
    const origin = this.worldToScreen(0.5, 0.5);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(188,219,207,.28)";
    ctx.beginPath(); ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, this.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(this.width, origin.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBuildings(ctx) {
    const buildings = this.focus ? BUILDINGS.filter((building) => building.id === this.focus.buildingId) : BUILDINGS;
    buildings.forEach((building) => this.drawBuilding(ctx, building));
  }

  drawRoutes(ctx) {
    const nodeById = new Map(NAV_NODES.map((node) => [node.id, node]));
    ctx.strokeStyle = "rgba(102,198,173,.32)";
    ctx.lineWidth = this.focus ? 1.5 : 1;
    NAV_EDGES.forEach(([leftId, rightId]) => {
      const left = nodeById.get(leftId);
      const right = nodeById.get(rightId);
      const visible = !this.focus || (
        left.buildingId === this.focus.buildingId
        && left.floor === this.focus.floor
        && right.buildingId === this.focus.buildingId
        && right.floor === this.focus.floor
      );
      if (!visible) return;
      const from = this.worldToScreen(left.x, left.y);
      const to = this.worldToScreen(right.x, right.y);
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    });
  }

  drawRoomLoads(ctx, people) {
    const loads = new Map();
    people.forEach((person) => loads.set(person.destination.id, (loads.get(person.destination.id) ?? 0) + 1));
    LOCATIONS.forEach((location) => {
      const visible = !this.focus || (location.buildingId === this.focus.buildingId && location.floor === this.focus.floor);
      if (!visible) return;
      const load = loads.get(location.id) ?? 0;
      const point = this.worldToScreen(location.x, location.y);
      const ratio = load / location.capacity;
      ctx.fillStyle = ratio > 1 ? "#df5b4c" : ratio > .8 ? "#efbf52" : "rgba(102,198,173,.72)";
      ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
    });
  }

  drawBuilding(ctx, building) {
    const floors = this.focus ? [this.focus.floor] : Array.from({ length: building.floors }, (_, index) => index + 1);
    floors.forEach((floor) => {
      const levelOffset = this.focus ? 0 : (floor - 1) * 0.009;
      const alpha = this.focus ? 0.9 : 0.28 + floor / building.floors * 0.2;
      ctx.fillStyle = building.kind === "outdoor" ? "rgba(18,56,64," + alpha + ")" : "rgba(25,58,67," + alpha + ")";
      ctx.strokeStyle = "rgba(157,216,207," + (this.focus ? 0.72 : 0.34) + ")";
      ctx.lineWidth = this.focus ? 1.6 : 1;
      building.shapes.forEach((shape) => this.drawShape(ctx, shape, levelOffset, true));
      building.shapes.forEach((shape) => this.drawShape(ctx, shape, levelOffset, false));
    });
    const anchor = this.worldToScreen(building.bounds.x + 0.02, building.bounds.y + 0.035);
    ctx.fillStyle = "rgba(234,244,240,.68)";
    ctx.font = this.focus ? "12px Consolas" : "10px Consolas";
    ctx.fillText(building.label + (this.focus ? " · " + this.focus.floor + "层" : ""), anchor.x, anchor.y);
  }

  drawShape(ctx, shape, offset, fill) {
    const center = this.worldToScreen(shape.x + offset, shape.y - offset);
    ctx.beginPath();
    if (shape.type === "rect") {
      const width = shape.width * this.width * this.view.zoom;
      const height = shape.height * this.height * this.view.zoom;
      ctx.rect(center.x, center.y, width, height);
    } else {
      const radius = shape.radius * Math.min(this.width, this.height) * this.view.zoom;
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    }
    if (fill) ctx.fill(); else ctx.stroke();
  }

  drawContacts(ctx, contacts) {
    contacts.slice(-48).forEach(({ source, target, strength }) => {
      if (!this.isVisible(source) || !this.isVisible(target)) return;
      const from = this.worldToScreen(source.x, source.y);
      const to = this.worldToScreen(target.x, target.y);
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(239,191,82," + (0.14 + strength * .35) + ")";
      ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  isVisible(person) {
    return !this.focus || (person.zone.buildingId === this.focus.buildingId && person.zone.floor === this.focus.floor);
  }

  drawPeople(ctx, people) {
    const radius = Math.max(2.1, Math.min(4.7, this.width / (this.view.zoom > 2 ? 220 : 170)));
    people.forEach((person) => {
      if (!this.isVisible(person)) return;
      const point = this.worldToScreen(person.x, person.y);
      if (point.x < -12 || point.x > this.width + 12 || point.y < -12 || point.y > this.height + 12) return;
      if (person.masked) {
        ctx.beginPath(); ctx.strokeStyle = "rgba(221,242,238,.45)"; ctx.lineWidth = 1;
        ctx.arc(point.x, point.y, radius + 1.8, 0, Math.PI * 2); ctx.stroke();
      }
      if (person.vaccinated) {
        ctx.beginPath(); ctx.fillStyle = "rgba(95,168,141,.36)";
        ctx.arc(point.x, point.y, radius * .58, 0, Math.PI * 2); ctx.fill();
      }
      if (person.queued) {
        ctx.beginPath(); ctx.strokeStyle = "rgba(239,191,82,.9)"; ctx.lineWidth = 1;
        ctx.arc(point.x, point.y, radius + 3.2, 0, Math.PI * 2); ctx.stroke();
      }
      if (person.wasNewlyExposed) {
        ctx.beginPath(); ctx.fillStyle = "rgba(239,191,82,.18)";
        ctx.arc(point.x, point.y, radius * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.fillStyle = this.personColor(person);
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
      if (person.isolated) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.stroke(); }
    });
  }

  personColor(person) {
    if (person.severe) return "#9c4a4a";
    if (person.state === "exposed" || person.state === "symptomatic") return COLORS[person.state];
    if (person.vaccinated || person.immuneStrain === this.currentStrain) return "#58aee2";
    return COLORS[person.state];
  }

  drawFocusLabel(ctx) {
    if (!this.focus) return;
    ctx.fillStyle = "rgba(7,25,32,.88)";
    ctx.fillRect(14, 14, 168, 28);
    ctx.strokeStyle = "rgba(102,198,173,.5)";
    ctx.strokeRect(14, 14, 168, 28);
    ctx.fillStyle = "#eaf4f0";
    ctx.font = "11px Consolas";
    ctx.fillText("局部楼层视图 · 右击空地退出", 24, 32);
  }

  getBuildingAt(point) {
    return BUILDINGS.find((building) => building.shapes.some((shape) => {
      if (shape.type === "rect") return point.x >= shape.x && point.x <= shape.x + shape.width && point.y >= shape.y && point.y <= shape.y + shape.height;
      return Math.hypot(point.x - shape.x, point.y - shape.y) <= shape.radius;
    })) ?? null;
  }
}
