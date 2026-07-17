export const STRAINS = {
  seasonal: { label: "季节性株", transmission: 0.46, symptoms: 0.58, note: "传播性与症状表现较为平衡。" },
  fast: { label: "高传播株", transmission: 0.72, symptoms: 0.3, note: "症状不明显时，发现和隔离可能滞后。" },
  severe: { label: "高症状株", transmission: 0.4, symptoms: 0.8, note: "症状更易被察觉，及时隔离尤为关键。" },
  surge: { label: "复合高风险株", transmission: 0.76, symptoms: 0.76, note: "用于对比多项不利因素叠加时的传播表现。" },
};

export const SCENARIOS = {
  baseline: { campusMode: "highSchool", population: 84, temperature: 20, classSize: 42, density: 3, ventilation: 4, hygiene: 4, vaccinationCoverage: 45, vaccineEffectiveness: 50, mask: 60, isolation: 70, attention: 4, policy: "normal" },
  outbreak: { campusMode: "highSchool", population: 120, temperature: 20, classSize: 56, density: 5, ventilation: 2, hygiene: 2, vaccinationCoverage: 20, vaccineEffectiveness: 50, mask: 20, isolation: 25, attention: 2, policy: "normal" },
  intervention: { campusMode: "highSchool", population: 84, temperature: 20, classSize: 30, density: 2, ventilation: 5, hygiene: 5, vaccinationCoverage: 75, vaccineEffectiveness: 50, mask: 90, isolation: 90, attention: 5, policy: "staggered" },
  kindergarten: { campusMode: "kindergarten", population: 125, populationJitter: 75, temperature: 22, classSize: 20, density: 2, ventilation: 4, hygiene: 4, vaccinationCoverage: 50, vaccineEffectiveness: 50, mask: 5, isolation: 80, attention: 5, policy: "normal" },
  primary: { campusMode: "primary", population: 850, populationJitter: 75, temperature: 21, classSize: 40, density: 3, ventilation: 4, hygiene: 4, vaccinationCoverage: 45, vaccineEffectiveness: 50, mask: 25, isolation: 80, attention: 5, policy: "normal" },
  secondary: { campusMode: "highSchool", population: 1350, populationJitter: 75, temperature: 20, classSize: 50, density: 4, ventilation: 3, hygiene: 3, vaccinationCoverage: 35, vaccineEffectiveness: 50, mask: 45, isolation: 75, attention: 4, policy: "normal" },
  universityPressure: { campusMode: "university", population: 2400, temperature: 20, classSize: 60, density: 5, ventilation: 2, hygiene: 3, vaccinationCoverage: 10, vaccineEffectiveness: 50, mask: 65, isolation: 45, attention: 3, policy: "normal" },
};

export const DENSITY_LABELS = ["很低", "较低", "中等", "较高", "很高"];
export const HYGIENE_LABELS = ["较差", "偏弱", "一般", "良好", "严格"];
export const ATTENTION_LABELS = ["忽视", "滞后", "常规", "积极", "联动"];
export const VENTILATION_LABELS = ["不足", "偏弱", "一般", "良好", "充分"];
export const POLICY_NOTES = {
  normal: "维持正常班级与校园接触模式。",
  staggered: "以错峰、限流降低近距离接触频率。",
  remote: "模拟暂停线下聚集活动后的接触下降。",
};
