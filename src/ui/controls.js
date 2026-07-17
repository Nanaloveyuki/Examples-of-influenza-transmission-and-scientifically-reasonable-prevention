import { ATTENTION_LABELS, DENSITY_LABELS, HYGIENE_LABELS, POLICY_NOTES, SCENARIOS, STRAINS, VENTILATION_LABELS } from "../data/strains.js";
import { CAMPUS_MODES } from "../data/campus-map.js";

const ids = ["temperature", "class-size", "population", "density", "ventilation", "hygiene", "vaccination-coverage", "vaccine-effectiveness", "mask", "isolation", "attention"];
const element = (id) => document.querySelector("#" + id);
const getSettings = () => ({
  strain: element("strain").value,
  campusMode: element("campus-mode").value,
  temperature: Number(element("temperature").value),
  classSize: Number(element("class-size").value),
  population: Number(element("population").value),
  density: Number(element("density").value),
  ventilation: Number(element("ventilation").value),
  hygiene: Number(element("hygiene").value),
  vaccinationCoverage: Number(element("vaccination-coverage").value),
  vaccineEffectiveness: Number(element("vaccine-effectiveness").value),
  mask: Number(element("mask").value),
  isolation: Number(element("isolation").value),
  attention: Number(element("attention").value),
  policy: element("policy").value,
});

export function setupControls(onChange, onScenario) {
  const updateOutputs = () => {
    const settings = getSettings();
    element("temperature-value").textContent = settings.temperature + "°C";
    element("class-size-value").textContent = settings.classSize + " 人";
    element("population-value").textContent = settings.population + " 人";
    element("density-value").textContent = DENSITY_LABELS[settings.density - 1];
    element("ventilation-value").textContent = VENTILATION_LABELS[settings.ventilation - 1];
    element("hygiene-value").textContent = HYGIENE_LABELS[settings.hygiene - 1];
    element("vaccination-coverage-value").textContent = settings.vaccinationCoverage + "%";
    element("vaccine-effectiveness-value").textContent = settings.vaccineEffectiveness + "%";
    element("mask-value").textContent = settings.mask + "%";
    element("isolation-value").textContent = settings.isolation + "%";
    element("attention-value").textContent = ATTENTION_LABELS[settings.attention - 1];
    element("strain-note").textContent = STRAINS[settings.strain].note;
    element("campus-mode-note").textContent = CAMPUS_MODES[settings.campusMode].note;
    element("policy-note").textContent = POLICY_NOTES[settings.policy];
    onChange(settings);
  };
  ids.forEach((id) => element(id).addEventListener("input", updateOutputs));
  element("strain").addEventListener("change", updateOutputs);
  element("campus-mode").addEventListener("change", updateOutputs);
  element("policy").addEventListener("change", updateOutputs);
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      const values = SCENARIOS[button.dataset.scenario];
      const population = values.populationJitter
        ? Math.max(40, Math.min(2400, values.population + Math.round((Math.random() * 2 - 1) * values.populationJitter)))
        : values.population;
      element("temperature").value = values.temperature;
      element("campus-mode").value = values.campusMode;
      element("class-size").value = values.classSize;
      element("population").value = population;
      element("density").value = values.density;
      element("hygiene").value = values.hygiene;
      element("ventilation").value = values.ventilation;
      element("vaccination-coverage").value = values.vaccinationCoverage;
      element("vaccine-effectiveness").value = values.vaccineEffectiveness;
      element("mask").value = values.mask;
      element("isolation").value = values.isolation;
      element("attention").value = values.attention;
      element("policy").value = values.policy;
      updateOutputs();
      onScenario(button.dataset.scenario);
    });
  });
  updateOutputs();
  return { getSettings, updateOutputs };
}
