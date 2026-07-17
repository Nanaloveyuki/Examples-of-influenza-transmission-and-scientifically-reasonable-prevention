import { STRAINS } from "../data/strains.js";
import { CAMPUS_MODES, LOCATIONS, NAV_EDGES, NAV_NODES, QUEUE_NODES } from "../data/campus-map.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const movementPolicies = { remote: 0.26, staggered: 0.72, normal: 1 };

export class CampusSimulation {
  constructor(settings) {
    this.settings = settings;
    this.people = [];
    this.contacts = [];
    this.elapsedMinutes = 0;
    this.day = 1;
    this.phaseLabel = "";
    this.nodeById = new Map(NAV_NODES.map((node) => [node.id, node]));
    this.locationById = new Map(LOCATIONS.map((location) => [location.id, location]));
    this.graph = this.buildGraph();
    this.nodeTraffic = new Map();
    this.reset();
  }

  get mode() {
    return CAMPUS_MODES[this.settings.campusMode];
  }

  buildGraph() {
    const graph = new Map(NAV_NODES.map((node) => [node.id, []]));
    NAV_EDGES.forEach(([left, right]) => {
      graph.get(left).push(right);
      graph.get(right).push(left);
    });
    return graph;
  }

  reset() {
    this.elapsedMinutes = 0;
    this.day = 1;
    this.contacts = [];
    this.contamination = new Map();
    this.activeScheduleKey = null;
    this.phaseLabel = this.scheduleForMinute(this.mode.startMinute).label;
    this.people = Array.from({ length: this.settings.population }, (_, id) => this.createPerson(id));
    this.people[0].state = "symptomatic";
    this.people[0].stateAge = 12;
    this.people[0].vaccinated = false;
  }

  createPerson(id) {
    const classrooms = LOCATIONS.filter((location) => location.kind === "classroom");
    const dorms = LOCATIONS.filter((location) => location.kind === "dorm");
    const schedule = this.scheduleForMinute(this.mode.startMinute);
    const initial = this.pickLocation(schedule.weights, new Map());
    const courseSlots = ["morning-1", "morning-2", "afternoon-1"].filter(() => Math.random() < 0.58);
    const person = {
      id,
      cohortId: Math.floor(id / this.settings.classSize),
      homeClass: classrooms[Math.floor(id / this.settings.classSize) % classrooms.length],
      homeDorm: dorms[id % dorms.length],
      courseSlots,
      x: initial.location.x,
      y: initial.location.y,
      zone: initial.location,
      destination: initial.location,
      currentNodeId: initial.location.nodeId,
      route: [initial.location.nodeId],
      routeIndex: 1,
      targetX: initial.location.x,
      targetY: initial.location.y,
      targetKind: "seat",
      queued: false,
      state: "susceptible",
      stateAge: 0,
      immuneStrain: null,
      reexposureMinutes: 0,
      illnessMinutes: 0,
      severe: false,
      masked: Math.random() < this.settings.mask / 100,
      vaccinated: Math.random() < this.settings.vaccinationCoverage / 100,
      isolated: false,
      wasNewlyExposed: false,
    };
    this.assignSeat(person);
    person.x = person.targetX;
    person.y = person.targetY;
    return person;
  }

  updateSettings(settings) {
    const mapModeChanged = settings.campusMode !== this.settings.campusMode;
    const populationChanged = settings.population !== this.settings.population;
    this.settings = settings;
    if (mapModeChanged || populationChanged) {
      this.reset();
      return;
    }
    this.people.forEach((person) => {
      person.masked = Math.random() < settings.mask / 100;
      person.vaccinated = Math.random() < settings.vaccinationCoverage / 100;
    });
  }

  scheduleForMinute(minuteOfDay) {
    return this.mode.schedule.find((item) => minuteOfDay < item.until) ?? this.mode.schedule.at(-1);
  }

  chooseBuilding(weights) {
    let sample = Math.random();
    const entries = Object.entries(weights);
    for (const [buildingId, weight] of entries) {
      sample -= weight;
      if (sample <= 0) return buildingId;
    }
    return entries.at(-1)[0];
  }

  pickLocation(weights, occupancy) {
    const buildingId = this.chooseBuilding(weights);
    const candidates = LOCATIONS.filter((location) => location.buildingId === buildingId);
    const available = candidates.filter((location) => (occupancy.get(location.id) ?? 0) < location.capacity);
    const choices = available.length ? available : candidates;
    const location = choices[Math.floor(Math.random() * choices.length)];
    const used = occupancy.get(location.id) ?? 0;
    occupancy.set(location.id, used + 1);
    return { location, queued: used >= location.capacity };
  }

  chooseDestination(person, schedule, occupancy) {
    if (schedule.activity === "class") {
      const attends = this.settings.campusMode === "highSchool" || person.courseSlots.includes(schedule.slot);
      if (attends) {
        const used = occupancy.get(person.homeClass.id) ?? 0;
        occupancy.set(person.homeClass.id, used + 1);
        return { location: person.homeClass, queued: used >= person.homeClass.capacity };
      }
    }
    if (this.settings.campusMode === "university" && schedule.activity === "free" && Math.random() < 0.62) {
      const used = occupancy.get(person.homeDorm.id) ?? 0;
      occupancy.set(person.homeDorm.id, used + 1);
      return { location: person.homeDorm, queued: used >= person.homeDorm.capacity };
    }
    return this.pickLocation(schedule.weights, occupancy);
  }

  nearestNodeId(x, y) {
    return NAV_NODES.reduce((nearest, node) => {
      const nearestNode = this.nodeById.get(nearest);
      return Math.hypot(node.x - x, node.y - y) < Math.hypot(nearestNode.x - x, nearestNode.y - y) ? node.id : nearest;
    }, NAV_NODES[0].id);
  }

  findRoute(startId, targetId) {
    if (startId === targetId) return [startId];
    const queue = [startId];
    const parent = new Map([[startId, null]]);
    while (queue.length) {
      const current = queue.shift();
      const neighbors = [...(this.graph.get(current) ?? [])].sort((left, right) => (this.nodeTraffic.get(left) ?? 0) - (this.nodeTraffic.get(right) ?? 0));
      for (const next of neighbors) {
        if (parent.has(next)) continue;
        parent.set(next, current);
        if (next === targetId) {
          const route = [next];
          while (route.at(-1) !== startId) route.push(parent.get(route.at(-1)));
          return route.reverse();
        }
        queue.push(next);
      }
    }
    return [startId];
  }

  assignSeat(person) {
    const spread = person.queued ? 0.014 : 0.022;
    const angle = person.id * 2.399963229728653;
    const radius = (0.25 + (person.id % 7) / 10) * spread;
    const anchor = person.queued ? this.nodeById.get(QUEUE_NODES[person.destination.buildingId]) : person.destination;
    person.targetX = anchor.x + Math.cos(angle) * radius;
    person.targetY = anchor.y + Math.sin(angle) * radius;
    person.targetKind = "seat";
  }

  setNodeWaypoint(person, node) {
    const laneRadius = node.laneRadius ?? 0.004;
    const angle = (person.id * 1.61803398875 + person.routeIndex * 0.87) % (Math.PI * 2);
    person.targetX = node.x + Math.cos(angle) * laneRadius;
    person.targetY = node.y + Math.sin(angle) * laneRadius;
    person.targetKind = "node";
  }

  routeTo(person, destination, queued) {
    person.destination = destination;
    person.queued = queued;
    const startId = this.nearestNodeId(person.x, person.y);
    const targetNodeId = queued ? QUEUE_NODES[destination.buildingId] : destination.nodeId;
    person.route = this.findRoute(startId, targetNodeId);
    person.route.forEach((nodeId) => this.nodeTraffic.set(nodeId, (this.nodeTraffic.get(nodeId) ?? 0) + 1));
    person.routeIndex = person.route.length > 1 ? 1 : person.route.length;
    if (person.routeIndex < person.route.length) {
      const node = this.nodeById.get(person.route[person.routeIndex]);
      this.setNodeWaypoint(person, node);
    } else {
      this.assignSeat(person);
    }
  }

  assignTargets(force = false) {
    const minuteOfDay = (this.mode.startMinute + this.elapsedMinutes) % 1440;
    const schedule = this.scheduleForMinute(minuteOfDay);
    this.phaseLabel = schedule.label;
    const scheduleKey = schedule.activity + ":" + (schedule.slot ?? schedule.label);
    const freeWander = schedule.activity === "free" && this.elapsedMinutes % 20 === 0;
    if (!force && scheduleKey === this.activeScheduleKey && !freeWander) return;
    this.activeScheduleKey = scheduleKey;
    this.nodeTraffic = new Map();
    const occupancy = new Map();
    this.people.forEach((person) => {
      if (person.isolated) return;
      const next = this.chooseDestination(person, schedule, occupancy);
      if (person.destination.id !== next.location.id || person.queued !== next.queued) {
        this.routeTo(person, next.location, next.queued);
      }
    });
  }

  advance(minutes) {
    this.contacts = [];
    for (let minute = 0; minute < minutes; minute += 1) {
      this.elapsedMinutes += 1;
      this.day = Math.floor(this.elapsedMinutes / 1440) + 1;
      this.people.forEach((person) => { person.wasNewlyExposed = false; });
      this.assignTargets();
      this.people.forEach((person) => this.movePerson(person, 1));
      this.resolveCrowding();
      this.updateContamination();
      this.people.forEach((person) => this.advanceState(person, 1));
      this.spread(1);
    }
  }

  animate(delta) {
    return delta;
  }

  movePerson(person, delta) {
    if (person.isolated) return;
    const distance = Math.hypot(person.targetX - person.x, person.targetY - person.y);
    if (distance < 0.004) {
      if (person.targetKind === "node") {
        person.currentNodeId = person.route[person.routeIndex];
        person.routeIndex += 1;
        if (person.routeIndex < person.route.length) {
          const nextNode = this.nodeById.get(person.route[person.routeIndex]);
          this.setNodeWaypoint(person, nextNode);
        } else {
          this.assignSeat(person);
        }
      } else {
        person.zone = person.destination;
      }
      return;
    }
    const speed = (0.028 + this.settings.density * 0.003) * movementPolicies[this.settings.policy];
    const movement = Math.min(distance, speed * delta);
    person.x += (person.targetX - person.x) / distance * movement;
    person.y += (person.targetY - person.y) / distance * movement;
  }

  resolveCrowding() {
    const cellSize = 0.018;
    const buckets = new Map();
    this.people.forEach((person) => {
      if (person.isolated) return;
      const key = Math.floor(person.x / cellSize) + ":" + Math.floor(person.y / cellSize);
      const bucket = buckets.get(key) ?? [];
      bucket.push(person);
      buckets.set(key, bucket);
    });
    buckets.forEach((bucket) => {
      for (let first = 0; first < bucket.length; first += 1) for (let second = first + 1; second < bucket.length; second += 1) {
        const left = bucket[first];
        const right = bucket[second];
        const distance = Math.hypot(left.x - right.x, left.y - right.y);
        if (distance === 0 || distance > 0.01) continue;
        const offset = (0.01 - distance) / 2;
        const directionX = (left.x - right.x) / distance;
        const directionY = (left.y - right.y) / distance;
        left.x += directionX * offset; left.y += directionY * offset;
        right.x -= directionX * offset; right.y -= directionY * offset;
      }
    });
  }

  updateContamination() {
    this.contamination.forEach((level, locationId) => {
      this.contamination.set(locationId, Math.max(0, level * 0.996 - 0.0002));
    });
    this.people.forEach((person) => {
      const infectious = person.state === "symptomatic" || (person.state === "exposed" && person.stateAge > 20);
      if (!infectious || person.isolated || person.zone.kind === "outdoor") return;
      const current = this.contamination.get(person.zone.id) ?? 0;
      this.contamination.set(person.zone.id, Math.min(1, current + (person.state === "symptomatic" ? 0.002 : 0.0008)));
    });
  }

  moveToIsolation(person) {
    const isolation = this.locationById.get("isolation-1");
    person.isolated = true;
    person.destination = isolation;
    person.zone = isolation;
    person.currentNodeId = isolation.nodeId;
    person.route = [isolation.nodeId];
    person.routeIndex = 1;
    person.queued = false;
    person.targetKind = "seat";
    const angle = person.id * 2.399963229728653;
    const radius = 0.004 + (person.id % 5) * 0.001;
    person.x = isolation.x + Math.cos(angle) * radius;
    person.y = isolation.y + Math.sin(angle) * radius;
    person.targetX = person.x;
    person.targetY = person.y;
  }

  recover(person, strongImmunity = false) {
    person.state = "recovered";
    person.stateAge = 0;
    person.illnessMinutes = 0;
    person.reexposureMinutes = 0;
    person.isolated = false;
    if (strongImmunity) person.immuneStrain = this.settings.strain;
    person.severe = false;
    person.severeAge = 0;
    this.activeScheduleKey = null;
  }

  advanceState(person, minutes) {
    const hours = minutes / 60;
    person.stateAge += hours;
    if (person.state === "exposed" && person.stateAge > 36) {
      if (Math.random() < STRAINS[this.settings.strain].symptoms) {
        person.state = "symptomatic";
        person.stateAge = 0;
      } else {
        this.recover(person);
      }
    } else if (person.state === "exposed") {
      const suspectedChance = this.settings.isolation / 100 * this.settings.attention / 5 * 0.006 * hours;
      if (!person.isolated && person.stateAge > 12 && Math.random() < suspectedChance) this.moveToIsolation(person);
    } else if (person.state === "symptomatic") {
      if (person.severe) {
        person.severeAge += hours;
        if (person.severeAge > 72) this.recover(person, true);
        return;
      }
      person.illnessMinutes += minutes;
      const isolationChance = this.settings.isolation / 100 * this.settings.attention / 5 * 0.025 * hours;
      if (!person.isolated && person.stateAge > 3 && Math.random() < isolationChance) this.moveToIsolation(person);
      const contamination = this.contamination.get(person.zone.id) ?? 0;
      const severeChance = Math.pow(STRAINS[this.settings.strain].symptoms, 2) * contamination * 0.000002;
      if (person.illnessMinutes > 2880 && Math.random() < severeChance) {
        person.severe = true;
        person.severeAge = 0;
        this.moveToIsolation(person);
      } else if (person.stateAge > 96) {
        this.recover(person);
      }
    }
  }

  nearbySusceptible(source) {
    const cellSize = 0.1;
    const centerX = Math.floor(source.x / cellSize);
    const centerY = Math.floor(source.y / cellSize);
    const nearby = [];
    for (let x = centerX - 1; x <= centerX + 1; x += 1) for (let y = centerY - 1; y <= centerY + 1; y += 1) {
      nearby.push(...(this.susceptibleGrid.get(x + ":" + y) ?? []));
    }
    return nearby;
  }

  spread(minutes) {
    const strain = STRAINS[this.settings.strain];
    const temperatureFit = 0.62 + Math.max(0, 1 - Math.abs(this.settings.temperature - 20) / 14) * 0.38;
    const densityFactor = 0.48 + this.settings.density * 0.16;
    const hygieneFactor = 1.26 - this.settings.hygiene * 0.09;
    const attentionFactor = 1.17 - this.settings.attention * 0.07;
    const policyFactor = this.settings.policy === "remote" ? 0.24 : this.settings.policy === "staggered" ? 0.66 : 1;
    const baseRisk = strain.transmission * temperatureFit * densityFactor * hygieneFactor * attentionFactor * policyFactor;
    const sources = this.people.filter((person) => (person.state === "symptomatic" && !person.isolated) || (person.state === "exposed" && person.stateAge > 20 && !person.isolated));
    this.people.filter((person) => person.state === "recovered").forEach((person) => {
      person.reexposureMinutes = Math.max(0, person.reexposureMinutes - minutes * 0.5);
    });
    this.susceptibleGrid = new Map();
    this.people.filter((person) => (person.state === "susceptible" || (person.state === "recovered" && person.immuneStrain !== this.settings.strain)) && !person.isolated).forEach((person) => {
      const key = Math.floor(person.x / 0.1) + ":" + Math.floor(person.y / 0.1);
      const bucket = this.susceptibleGrid.get(key) ?? [];
      bucket.push(person);
      this.susceptibleGrid.set(key, bucket);
    });
    for (const source of sources) for (const target of this.nearbySusceptible(source)) {
      if (target.isolated || (target.state !== "susceptible" && target.state !== "recovered")) continue;
      const distance = Math.hypot(source.x - target.x, source.y - target.y);
      if (distance > 0.075 + this.settings.density * 0.006) continue;
      const maskEffect = (source.masked ? 0.5 : 1) * (target.masked ? 0.5 : 1);
      const indoorFactor = source.zone.kind === "outdoor" ? 0.55 : 1.18 - this.settings.ventilation * 0.1;
      const vaccineEffect = target.vaccinated ? 1 - this.settings.vaccineEffectiveness / 100 : 1;
      const probability = baseRisk * maskEffect * indoorFactor * vaccineEffect * 0.09 * (minutes / 60);
      if (target.state === "recovered") {
        target.reexposureMinutes += minutes;
        if (target.reexposureMinutes >= 120 && Math.random() < probability * 0.3) {
          if (Math.random() < strain.symptoms * 0.65) {
            target.state = "symptomatic";
            target.stateAge = 0;
            target.illnessMinutes = 0;
          } else {
            target.immuneStrain = this.settings.strain;
            target.reexposureMinutes = 0;
          }
        }
      } else if (Math.random() < probability) {
        target.state = "exposed";
        target.stateAge = 0;
        target.wasNewlyExposed = true;
        this.contacts.push({ source, target, strength: 1 });
      } else if (Math.random() < 0.035 * (minutes / 60)) {
        this.contacts.push({ source, target, strength: 0.22 });
      }
    }
  }

  counts() {
    return this.people.reduce((result, person) => {
      result[person.state] += 1;
      return result;
    }, { susceptible: 0, exposed: 0, symptomatic: 0, recovered: 0 });
  }

  severeCount() {
    return this.people.filter((person) => person.severe).length;
  }

  riskIndex() {
    const strain = STRAINS[this.settings.strain];
    const vaccineProtection = this.settings.vaccinationCoverage / 100 * this.settings.vaccineEffectiveness / 100 * 0.58;
    const policyReduction = this.settings.policy === "remote" ? 0.7 : this.settings.policy === "staggered" ? 0.32 : 0;
    const protection = this.settings.mask / 100 * 0.42 + this.settings.isolation / 100 * 0.36 + vaccineProtection + this.settings.ventilation * 0.06 + policyReduction;
    return clamp(strain.transmission * 2.6 + this.settings.density * 0.23 + (5 - this.settings.hygiene) * 0.16 - protection, 0.1, 3.8);
  }
}
