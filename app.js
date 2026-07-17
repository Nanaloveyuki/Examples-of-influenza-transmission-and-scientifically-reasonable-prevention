(() => {
const STRAINS = {
  seasonal: { label: "季节性株", transmission: 0.46, symptoms: 0.58, note: "传播性与症状表现较为平衡。" },
  fast: { label: "高传播株", transmission: 0.72, symptoms: 0.3, note: "症状不明显时，发现和隔离可能滞后。" },
  severe: { label: "高症状株", transmission: 0.4, symptoms: 0.8, note: "症状更易被察觉，及时隔离尤为关键。" },
  surge: { label: "复合高风险株", transmission: 0.76, symptoms: 0.76, note: "用于对比多项不利因素叠加时的传播表现。" },
};

const SCENARIOS = {
  baseline: { campusMode: "highSchool", population: 84, temperature: 20, classSize: 42, density: 3, ventilation: 4, hygiene: 4, vaccinationCoverage: 45, vaccineEffectiveness: 50, mask: 60, isolation: 70, attention: 4, policy: "normal" },
  outbreak: { campusMode: "highSchool", population: 120, temperature: 20, classSize: 56, density: 5, ventilation: 2, hygiene: 2, vaccinationCoverage: 20, vaccineEffectiveness: 50, mask: 20, isolation: 25, attention: 2, policy: "normal" },
  intervention: { campusMode: "highSchool", population: 84, temperature: 20, classSize: 30, density: 2, ventilation: 5, hygiene: 5, vaccinationCoverage: 75, vaccineEffectiveness: 50, mask: 90, isolation: 90, attention: 5, policy: "staggered" },
  kindergarten: { campusMode: "kindergarten", population: 125, populationJitter: 75, temperature: 22, classSize: 20, density: 2, ventilation: 4, hygiene: 4, vaccinationCoverage: 50, vaccineEffectiveness: 50, mask: 5, isolation: 80, attention: 5, policy: "normal" },
  primary: { campusMode: "primary", population: 850, populationJitter: 75, temperature: 21, classSize: 40, density: 3, ventilation: 4, hygiene: 4, vaccinationCoverage: 45, vaccineEffectiveness: 50, mask: 25, isolation: 80, attention: 5, policy: "normal" },
  secondary: { campusMode: "highSchool", population: 1350, populationJitter: 75, temperature: 20, classSize: 50, density: 4, ventilation: 3, hygiene: 3, vaccinationCoverage: 35, vaccineEffectiveness: 50, mask: 45, isolation: 75, attention: 4, policy: "normal" },
  universityPressure: { campusMode: "university", population: 2400, temperature: 20, classSize: 60, density: 5, ventilation: 2, hygiene: 3, vaccinationCoverage: 10, vaccineEffectiveness: 50, mask: 65, isolation: 45, attention: 3, policy: "normal" },
};

const DENSITY_LABELS = ["很低", "较低", "中等", "较高", "很高"];
const HYGIENE_LABELS = ["较差", "偏弱", "一般", "良好", "严格"];
const ATTENTION_LABELS = ["忽视", "滞后", "常规", "积极", "联动"];
const VENTILATION_LABELS = ["不足", "偏弱", "一般", "良好", "充分"];
const POLICY_NOTES = {
  normal: "维持正常班级与校园接触模式。",
  staggered: "以错峰、限流降低近距离接触频率。",
  remote: "模拟暂停线下聚集活动后的接触下降。",
};

const BUILDINGS = [
  {
    id: "academic",
    label: "教学楼 A",
    kind: "indoor",
    floors: 3,
    shapes: [
      { type: "rect", x: 0.08, y: 0.12, width: 0.39, height: 0.28 },
      { type: "rect", x: 0.38, y: 0.24, width: 0.15, height: 0.16 },
      { type: "circle", x: 0.44, y: 0.18, radius: 0.06 },
    ],
    bounds: { x: 0.08, y: 0.12, width: 0.45, height: 0.31 },
  },
  {
    id: "library",
    label: "图书馆",
    kind: "indoor",
    floors: 2,
    shapes: [
      { type: "rect", x: 0.61, y: 0.12, width: 0.28, height: 0.25 },
      { type: "circle", x: 0.87, y: 0.19, radius: 0.06 },
    ],
    bounds: { x: 0.61, y: 0.12, width: 0.32, height: 0.27 },
  },
  {
    id: "dining",
    label: "食堂",
    kind: "indoor",
    floors: 2,
    shapes: [
      { type: "rect", x: 0.08, y: 0.57, width: 0.32, height: 0.23 },
      { type: "circle", x: 0.35, y: 0.72, radius: 0.08 },
    ],
    bounds: { x: 0.08, y: 0.57, width: 0.36, height: 0.27 },
  },
  {
    id: "dorm",
    label: "宿舍组团",
    kind: "indoor",
    floors: 5,
    shapes: [
      { type: "rect", x: 0.52, y: 0.53, width: 0.14, height: 0.28 },
      { type: "rect", x: 0.68, y: 0.53, width: 0.12, height: 0.28 },
      { type: "rect", x: 0.52, y: 0.72, width: 0.28, height: 0.09 },
    ],
    bounds: { x: 0.52, y: 0.53, width: 0.28, height: 0.28 },
  },
  {
    id: "field",
    label: "操场",
    kind: "outdoor",
    floors: 1,
    shapes: [{ type: "circle", x: 0.85, y: 0.67, radius: 0.13 }],
    bounds: { x: 0.72, y: 0.54, width: 0.26, height: 0.26 },
  },
  {
    id: "isolation",
    label: "隔离室",
    kind: "indoor",
    floors: 1,
    shapes: [{ type: "rect", x: 0.45, y: 0.5, width: 0.08, height: 0.08 }],
    bounds: { x: 0.45, y: 0.5, width: 0.08, height: 0.08 },
  },
];

const ZONES = BUILDINGS.flatMap((building) => Array.from({ length: building.floors }, (_, index) => ({
  id: building.id + "-" + (index + 1),
  buildingId: building.id,
  floor: index + 1,
  label: building.label,
  kind: building.kind,
  bounds: building.bounds,
})));

const LOCATIONS = [
  { id: "academic-1a", nodeId: "academic-1a", buildingId: "academic", floor: 1, label: "1层 101", kind: "classroom", x: 0.2, y: 0.2, capacity: 56 },
  { id: "academic-1b", nodeId: "academic-1b", buildingId: "academic", floor: 1, label: "1层 102", kind: "classroom", x: 0.34, y: 0.2, capacity: 56 },
  { id: "academic-2a", nodeId: "academic-2a", buildingId: "academic", floor: 2, label: "2层 201", kind: "classroom", x: 0.2, y: 0.3, capacity: 56 },
  { id: "academic-2b", nodeId: "academic-2b", buildingId: "academic", floor: 2, label: "2层 202", kind: "classroom", x: 0.34, y: 0.3, capacity: 56 },
  { id: "academic-3a", nodeId: "academic-3a", buildingId: "academic", floor: 3, label: "3层 301", kind: "classroom", x: 0.2, y: 0.36, capacity: 56 },
  { id: "academic-3b", nodeId: "academic-3b", buildingId: "academic", floor: 3, label: "3层 302", kind: "classroom", x: 0.34, y: 0.36, capacity: 56 },
  { id: "library-1", nodeId: "library-1", buildingId: "library", floor: 1, label: "图书馆阅览区", kind: "study", x: 0.73, y: 0.23, capacity: 140 },
  { id: "library-2", nodeId: "library-2", buildingId: "library", floor: 2, label: "图书馆自习区", kind: "study", x: 0.82, y: 0.3, capacity: 110 },
  { id: "dining-1", nodeId: "dining-1", buildingId: "dining", floor: 1, label: "食堂一层", kind: "dining", x: 0.2, y: 0.66, capacity: 180 },
  { id: "dining-2", nodeId: "dining-2", buildingId: "dining", floor: 2, label: "食堂二层", kind: "dining", x: 0.34, y: 0.72, capacity: 140 },
  { id: "dorm-1", nodeId: "dorm-1", buildingId: "dorm", floor: 1, label: "宿舍一层", kind: "dorm", x: 0.57, y: 0.62, capacity: 130 },
  { id: "dorm-2", nodeId: "dorm-2", buildingId: "dorm", floor: 2, label: "宿舍二层", kind: "dorm", x: 0.72, y: 0.62, capacity: 130 },
  { id: "dorm-3", nodeId: "dorm-3", buildingId: "dorm", floor: 3, label: "宿舍三层", kind: "dorm", x: 0.57, y: 0.75, capacity: 130 },
  { id: "dorm-4", nodeId: "dorm-4", buildingId: "dorm", floor: 4, label: "宿舍四层", kind: "dorm", x: 0.72, y: 0.75, capacity: 130 },
  { id: "dorm-5", nodeId: "dorm-5", buildingId: "dorm", floor: 5, label: "宿舍五层", kind: "dorm", x: 0.65, y: 0.79, capacity: 130 },
  { id: "field-1", nodeId: "field-1", buildingId: "field", floor: 1, label: "操场", kind: "outdoor", x: 0.86, y: 0.67, capacity: 500 },
  { id: "isolation-1", nodeId: "isolation-1", buildingId: "isolation", floor: 1, label: "隔离室", kind: "isolation", x: 0.49, y: 0.54, capacity: 80 },
];

const NAV_NODES = [
  { id: "quad", x: 0.5, y: 0.48, kind: "path", occupancy: "transit", laneRadius: 0.012 },
  { id: "north-court", x: 0.5, y: 0.4, kind: "path", occupancy: "transit", laneRadius: 0.01 },
  { id: "south-court", x: 0.5, y: 0.62, kind: "path", occupancy: "transit", laneRadius: 0.01 },
  { id: "west-court", x: 0.42, y: 0.5, kind: "path", occupancy: "transit", laneRadius: 0.009 },
  { id: "east-court", x: 0.64, y: 0.46, kind: "path", occupancy: "transit", laneRadius: 0.009 },
  { id: "academic-entry", x: 0.42, y: 0.42, kind: "path", occupancy: "transit", laneRadius: 0.008 },
  { id: "academic-stair-1", x: 0.43, y: 0.31, buildingId: "academic", floor: 1, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "academic-stair-2", x: 0.43, y: 0.31, buildingId: "academic", floor: 2, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "academic-stair-3", x: 0.43, y: 0.31, buildingId: "academic", floor: 3, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "library-entry", x: 0.75, y: 0.4, kind: "path", occupancy: "transit", laneRadius: 0.008 },
  { id: "library-stair-1", x: 0.84, y: 0.3, buildingId: "library", floor: 1, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "library-stair-2", x: 0.84, y: 0.3, buildingId: "library", floor: 2, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "dining-entry", x: 0.38, y: 0.56, kind: "path", occupancy: "transit", laneRadius: 0.008 },
  { id: "dining-stair-1", x: 0.34, y: 0.7, buildingId: "dining", floor: 1, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "dining-stair-2", x: 0.34, y: 0.7, buildingId: "dining", floor: 2, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "dorm-entry", x: 0.64, y: 0.52, kind: "path", occupancy: "transit", laneRadius: 0.008 },
  { id: "isolation-entry", x: 0.49, y: 0.48, kind: "path", occupancy: "transit", laneRadius: 0.006 },
  { id: "dorm-stair-1", x: 0.66, y: 0.69, buildingId: "dorm", floor: 1, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "dorm-stair-2", x: 0.66, y: 0.69, buildingId: "dorm", floor: 2, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "dorm-stair-3", x: 0.66, y: 0.69, buildingId: "dorm", floor: 3, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "dorm-stair-4", x: 0.66, y: 0.69, buildingId: "dorm", floor: 4, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  { id: "dorm-stair-5", x: 0.66, y: 0.69, buildingId: "dorm", floor: 5, kind: "stair", occupancy: "transit", laneRadius: 0.006 },
  ...LOCATIONS.map(({ nodeId, x, y, buildingId, floor }) => ({ id: nodeId, x, y, buildingId, floor, kind: "room", occupancy: "stay" })),
];

const NAV_EDGES = [
  ["quad", "north-court"], ["quad", "south-court"], ["quad", "west-court"], ["quad", "east-court"],
  ["north-court", "west-court"], ["north-court", "east-court"], ["south-court", "west-court"], ["south-court", "east-court"],
  ["west-court", "academic-entry"], ["west-court", "dining-entry"], ["east-court", "library-entry"], ["south-court", "dorm-entry"], ["east-court", "field-1"], ["south-court", "field-1"], ["north-court", "isolation-entry"], ["isolation-entry", "isolation-1"],
  ["academic-entry", "academic-stair-1"], ["academic-stair-1", "academic-stair-2"], ["academic-stair-2", "academic-stair-3"],
  ["academic-stair-1", "academic-1a"], ["academic-stair-1", "academic-1b"], ["academic-stair-2", "academic-2a"], ["academic-stair-2", "academic-2b"], ["academic-stair-3", "academic-3a"], ["academic-stair-3", "academic-3b"],
  ["library-entry", "library-stair-1"], ["library-stair-1", "library-stair-2"], ["library-stair-1", "library-1"], ["library-stair-2", "library-2"],
  ["dining-entry", "dining-stair-1"], ["dining-stair-1", "dining-stair-2"], ["dining-stair-1", "dining-1"], ["dining-stair-2", "dining-2"],
  ["dorm-entry", "dorm-stair-1"], ["dorm-stair-1", "dorm-stair-2"], ["dorm-stair-2", "dorm-stair-3"], ["dorm-stair-3", "dorm-stair-4"], ["dorm-stair-4", "dorm-stair-5"],
  ["dorm-stair-1", "dorm-1"], ["dorm-stair-2", "dorm-2"], ["dorm-stair-3", "dorm-3"], ["dorm-stair-4", "dorm-4"], ["dorm-stair-5", "dorm-5"],
];

const QUEUE_NODES = {
  academic: "academic-entry",
  library: "library-entry",
  dining: "dining-entry",
  dorm: "dorm-entry",
  field: "field-1",
  isolation: "isolation-entry",
};

const CAMPUS_MODES = {
  kindergarten: {
    label: "幼儿园模式",
    note: "班级规模小、活动与午休集中；口罩覆盖较低，但教师和园方响应通常更快。",
    startMinute: 450,
    schedule: [
      { until: 510, label: "晨间入园", activity: "arrival", weights: { academic: 0.48, dining: 0.28, field: 0.24 } },
      { until: 600, label: "集体活动", activity: "class", slot: "morning-1", weights: { academic: 0.82, field: 0.12, dining: 0.06 } },
      { until: 660, label: "户外与点心", activity: "break", weights: { academic: 0.22, dining: 0.38, field: 0.4 } },
      { until: 720, label: "午餐与午休", activity: "meal", weights: { academic: 0.38, dining: 0.56, field: 0.06 } },
      { until: 900, label: "午后活动", activity: "class", slot: "afternoon-1", weights: { academic: 0.72, field: 0.2, dining: 0.08 } },
      { until: 1440, label: "离园后", activity: "free", weights: { academic: 0.3, dining: 0.18, field: 0.52 } },
    ],
  },
  primary: {
    label: "小学模式",
    note: "班级稳定、课间集中，防控执行依赖教师组织，口罩和接种覆盖均处于中等水平。",
    startMinute: 420,
    schedule: [
      { until: 480, label: "晨间到校", activity: "arrival", weights: { academic: 0.6, dining: 0.25, field: 0.15 } },
      { until: 600, label: "第一节课", activity: "class", slot: "morning-1", weights: { academic: 0.86, field: 0.08, dining: 0.06 } },
      { until: 630, label: "课间活动", activity: "break", weights: { academic: 0.34, dining: 0.2, field: 0.36, library: 0.1 } },
      { until: 720, label: "第二节课", activity: "class", slot: "morning-2", weights: { academic: 0.86, field: 0.08, dining: 0.06 } },
      { until: 780, label: "午餐时段", activity: "meal", weights: { academic: 0.12, dining: 0.67, field: 0.14, library: 0.07 } },
      { until: 900, label: "下午课程", activity: "class", slot: "afternoon-1", weights: { academic: 0.82, library: 0.08, field: 0.07, dining: 0.03 } },
      { until: 1440, label: "课后活动", activity: "free", weights: { academic: 0.25, dining: 0.2, field: 0.4, library: 0.15 } },
    ],
  },
  highSchool: {
    label: "中学模式",
    note: "07:00-08:00 从食堂与教学楼过渡，08:00 后以课堂聚集为主。",
    startMinute: 420,
    schedule: [
      { until: 480, label: "晨间到校", activity: "arrival", weights: { academic: 0.55, dining: 0.34, field: 0.11 } },
      { until: 600, label: "第一节课", activity: "class", slot: "morning-1", weights: { academic: 0.84, library: 0.05, field: 0.06, dining: 0.05 } },
      { until: 630, label: "课间活动", activity: "break", weights: { academic: 0.35, dining: 0.22, field: 0.31, library: 0.12 } },
      { until: 720, label: "第二节课", activity: "class", slot: "morning-2", weights: { academic: 0.84, library: 0.05, field: 0.06, dining: 0.05 } },
      { until: 780, label: "午餐时段", activity: "meal", weights: { academic: 0.08, dining: 0.66, field: 0.16, library: 0.1 } },
      { until: 900, label: "下午课程", activity: "class", slot: "afternoon-1", weights: { academic: 0.8, library: 0.09, field: 0.07, dining: 0.04 } },
      { until: 1440, label: "课后活动", activity: "free", weights: { academic: 0.24, dining: 0.2, field: 0.38, library: 0.18 } },
    ],
  },
  university: {
    label: "大学模式",
    note: "课程分散，食堂、教学楼、图书馆和无课学生的宿舍活动会并行发生。",
    startMinute: 420,
    schedule: [
      { until: 480, label: "晨间活动", activity: "arrival", weights: { academic: 0.23, dining: 0.36, dorm: 0.27, library: 0.08, field: 0.06 } },
      { until: 600, label: "上午课程", activity: "class", slot: "morning-1", weights: { academic: 0.46, dining: 0.12, dorm: 0.24, library: 0.13, field: 0.05 } },
      { until: 630, label: "课间流动", activity: "break", weights: { academic: 0.24, dining: 0.17, dorm: 0.22, library: 0.16, field: 0.21 } },
      { until: 720, label: "上午课程", activity: "class", slot: "morning-2", weights: { academic: 0.43, dining: 0.1, dorm: 0.26, library: 0.16, field: 0.05 } },
      { until: 780, label: "午餐时段", activity: "meal", weights: { academic: 0.09, dining: 0.46, dorm: 0.24, library: 0.08, field: 0.13 } },
      { until: 900, label: "下午课程", activity: "class", slot: "afternoon-1", weights: { academic: 0.42, dining: 0.09, dorm: 0.24, library: 0.18, field: 0.07 } },
      { until: 1440, label: "下午与晚间", activity: "free", weights: { academic: 0.16, dining: 0.2, dorm: 0.36, library: 0.17, field: 0.11 } },
    ],
  },
};


const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const movementPolicies = { remote: 0.26, staggered: 0.72, normal: 1 };

class CampusSimulation {
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

const COLORS = { susceptible: "#d9e4e2", exposed: "#efbf52", symptomatic: "#df5b4c", recovered: "#5fa88d", ground: "#0b2029" };

class CampusRenderer {
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


const ids = ["temperature", "class-size", "population", "density", "ventilation", "hygiene", "vaccination-coverage", "vaccine-effectiveness", "mask", "isolation", "attention"];
const controlElement = (id) => document.querySelector("#" + id);
const getSettings = () => ({
  strain: controlElement("strain").value,
  campusMode: controlElement("campus-mode").value,
  temperature: Number(controlElement("temperature").value),
  classSize: Number(controlElement("class-size").value),
  population: Number(controlElement("population").value),
  density: Number(controlElement("density").value),
  ventilation: Number(controlElement("ventilation").value),
  hygiene: Number(controlElement("hygiene").value),
  vaccinationCoverage: Number(controlElement("vaccination-coverage").value),
  vaccineEffectiveness: Number(controlElement("vaccine-effectiveness").value),
  mask: Number(controlElement("mask").value),
  isolation: Number(controlElement("isolation").value),
  attention: Number(controlElement("attention").value),
  policy: controlElement("policy").value,
});

function setupControls(onChange, onScenario) {
  const updateOutputs = () => {
    const settings = getSettings();
    controlElement("temperature-value").textContent = settings.temperature + "°C";
    controlElement("class-size-value").textContent = settings.classSize + " 人";
    controlElement("population-value").textContent = settings.population + " 人";
    controlElement("density-value").textContent = DENSITY_LABELS[settings.density - 1];
    controlElement("ventilation-value").textContent = VENTILATION_LABELS[settings.ventilation - 1];
    controlElement("hygiene-value").textContent = HYGIENE_LABELS[settings.hygiene - 1];
    controlElement("vaccination-coverage-value").textContent = settings.vaccinationCoverage + "%";
    controlElement("vaccine-effectiveness-value").textContent = settings.vaccineEffectiveness + "%";
    controlElement("mask-value").textContent = settings.mask + "%";
    controlElement("isolation-value").textContent = settings.isolation + "%";
    controlElement("attention-value").textContent = ATTENTION_LABELS[settings.attention - 1];
    controlElement("strain-note").textContent = STRAINS[settings.strain].note;
    controlElement("campus-mode-note").textContent = CAMPUS_MODES[settings.campusMode].note;
    controlElement("policy-note").textContent = POLICY_NOTES[settings.policy];
    onChange(settings);
  };
  ids.forEach((id) => controlElement(id).addEventListener("input", updateOutputs));
  controlElement("strain").addEventListener("change", updateOutputs);
  controlElement("campus-mode").addEventListener("change", updateOutputs);
  controlElement("policy").addEventListener("change", updateOutputs);
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      const values = SCENARIOS[button.dataset.scenario];
      const population = values.populationJitter
        ? Math.max(40, Math.min(2400, values.population + Math.round((Math.random() * 2 - 1) * values.populationJitter)))
        : values.population;
      controlElement("temperature").value = values.temperature;
      controlElement("campus-mode").value = values.campusMode;
      controlElement("class-size").value = values.classSize;
      controlElement("population").value = population;
      controlElement("density").value = values.density;
      controlElement("hygiene").value = values.hygiene;
      controlElement("ventilation").value = values.ventilation;
      controlElement("vaccination-coverage").value = values.vaccinationCoverage;
      controlElement("vaccine-effectiveness").value = values.vaccineEffectiveness;
      controlElement("mask").value = values.mask;
      controlElement("isolation").value = values.isolation;
      controlElement("attention").value = values.attention;
      controlElement("policy").value = values.policy;
      updateOutputs();
      onScenario(button.dataset.scenario);
    });
  });
  updateOutputs();
  return { getSettings, updateOutputs };
}


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

})();
