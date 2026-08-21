// UI thread — runs in an iframe inside Figma. Sends messages to code.ts via
// parent.postMessage and receives them via window.message events.

import { extractPresetCode } from "./preset";
import { generateRandomResolvablePreset } from "./registry";
import { POPULAR_PRESETS } from "./popularPresets";
import type { PluginToUi, UiToPlugin } from "./messages";
import {
  completeReplacementScope,
  FULL_REPLACEMENT_SCOPE,
  sameReplacementScope,
  type ReplacementAvailability,
  type ReplacementScope,
} from "./replacement";

const input = document.getElementById("preset") as HTMLInputElement;
const generateButton = document.getElementById("generate") as HTMLButtonElement;
const generateLabel = generateButton.querySelector(
  ".btn-label",
) as HTMLSpanElement;
const generateFill = generateButton.querySelector(
  ".btn-fill",
) as HTMLSpanElement;
const confirmReplaceButton = document.getElementById(
  "confirm-replace",
) as HTMLButtonElement;
const confirmCancelButton = document.getElementById(
  "confirm-cancel",
) as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;
const presetsList = document.getElementById("presets-list") as HTMLDivElement;
const replaceOptions = document.getElementById(
  "replace-options",
) as HTMLFieldSetElement;
const replaceNote = document.getElementById(
  "replace-note",
) as HTMLParagraphElement;
const scopeInputs = Array.from(
  replaceOptions.querySelectorAll<HTMLInputElement>("input[data-scope]"),
);

// Created in renderPopularPresets, kept for direct shuffle triggering.
let shuffleButton: HTMLButtonElement;

let busy = false;
// The preset code awaiting a "replace everything" confirmation. Set when the
// sandbox reports Niram already exists; cleared once the user confirms/cancels.
let pendingPresetCode: string | null = null;
let pendingAvailability: ReplacementAvailability = FULL_REPLACEMENT_SCOPE;

function postToPlugin(message: UiToPlugin) {
  parent.postMessage({ pluginMessage: message }, "*");
}

// Status is shown only when there is something worth saying (error, done,
// confirm prompt). Working progress lives in the Generate button instead.
function setStatus(text: string, variant: "info" | "error" | "done" = "info") {
  status.textContent = text;
  status.hidden = text === "";
  status.classList.toggle("error", variant === "error");
  status.classList.toggle("done", variant === "done");
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

// Progress rendering for the Generate button. The sandbox only hears back from
// the host at async boundaries, so messages can arrive in bursts with gaps;
// the UI keeps the bar alive between them by easing the fill toward the last
// reported percent, creeping forward when updates stall, and ticking the
// elapsed time so it never looks frozen.
const TICK_MS = 250;
// After this long without a message, nudge the target forward so the bar
// keeps moving (capped below 100% — only `done` completes the run).
const STALL_MS = 2000;
const CREEP_STEP = 0.4;
// Fraction of the remaining gap the fill covers per tick.
const EASE_FACTOR = 0.3;

let workTimer: number | null = null;
let currentDetail = "Working…";
let targetPercent: number | null = null; // null → indeterminate stripe
let displayPercent = 0;
let lastElapsedMs = 0;
let lastMessageAt = 0;

function composeLabel(): string {
  const parts: string[] = [currentDetail];
  if (targetPercent !== null) {
    parts.push(`${Math.round(displayPercent)}%`);
  }
  const seconds = Math.floor(lastElapsedMs / 1000);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.join(" · ");
}

function renderProgress() {
  generateLabel.textContent = composeLabel();
  if (targetPercent !== null) {
    generateButton.classList.remove("indeterminate");
    generateFill.style.width = `${clampPercent(displayPercent)}%`;
  } else {
    generateButton.classList.add("indeterminate");
    generateFill.style.width = "";
  }
}

function tickProgress() {
  if (targetPercent !== null) {
    if (
      Date.now() - lastMessageAt > STALL_MS &&
      targetPercent < 99
    ) {
      targetPercent = Math.min(99, targetPercent + CREEP_STEP);
    }
    const gap = targetPercent - displayPercent;
    displayPercent =
      Math.abs(gap) < 0.05 ? targetPercent : displayPercent + gap * EASE_FACTOR;
  }
  renderProgress();
}

// Turn the Generate button into the progress indicator and start the local
// ticker that animates it between sandbox messages.
function startWorkVisuals(label: string) {
  generateButton.classList.add("working");
  currentDetail = label;
  targetPercent = null;
  displayPercent = 0;
  lastElapsedMs = 0;
  lastMessageAt = Date.now();
  renderProgress();
  if (workTimer === null) {
    workTimer = window.setInterval(tickProgress, TICK_MS);
  }
}

// Turn the Generate button into the progress indicator: a determinate fill
// once a percent is known, otherwise an indeterminate sliding stripe.
function setButtonProgress(percent: number | undefined, label: string) {
  generateButton.classList.add("working");
  currentDetail = label;
  if (typeof percent === "number") {
    const next = clampPercent(percent);
    // Never lower the target: stall creep may have eased it past a late
    // message's reading, and a backwards fill reads as a restart.
    targetPercent =
      targetPercent === null ? next : Math.max(targetPercent, next);
  }
  lastMessageAt = Date.now();
  renderProgress();
}

// Drive the button from a progress message: keep the percent in the label and
// the fill width; fall back to the detail/message text when no percent yet.
function updateProgress(message: Extract<PluginToUi, { type: "progress" }>) {
  if (typeof message.elapsedMs === "number") {
    lastElapsedMs = message.elapsedMs;
  }
  setButtonProgress(message.percent, message.detail ?? message.message);
}

function startProgress() {
  setStatus("");
  startWorkVisuals("Working…");
}

function stopWorkTimer() {
  if (workTimer !== null) {
    window.clearInterval(workTimer);
    workTimer = null;
  }
}

function finishProgress() {
  stopWorkTimer();
  generateButton.classList.remove("indeterminate");
  targetPercent = 100;
  displayPercent = 100;
  generateFill.style.width = "100%";
  setTimeout(() => {
    resetProgress();
  }, 600);
}

function resetProgress() {
  stopWorkTimer();
  generateButton.classList.remove("working", "indeterminate");
  generateFill.style.width = "0%";
  generateLabel.textContent = "Generate";
}

function syncGenerateButton() {
  if (busy) {
    generateButton.disabled = true;
    setPresetButtonsDisabled(true);
    return;
  }
  generateButton.disabled = extractPresetCode(input.value) === null;
  setPresetButtonsDisabled(false);
}

function setPresetButtonsDisabled(disabled: boolean) {
  const buttons = presetsList.querySelectorAll<HTMLButtonElement>(
    "button.preset-badge",
  );
  buttons.forEach((button) => {
    button.disabled = disabled;
  });
}

function runPreset(
  presetCode: string,
  confirmReplace = false,
  replacementScope?: ReplacementScope,
) {
  busy = true;
  // Remember the code in case the sandbox comes back asking to confirm a
  // destructive replace; the confirm button resends exactly this code.
  pendingPresetCode = presetCode;
  syncGenerateButton();
  startProgress();
  postToPlugin({
    type: "generate",
    presetCode,
    confirmReplace,
    replacementScope,
  });
}

// Swap the Generate button for the inline Cancel / Replace prompt (or back).
function setConfirmVisible(visible: boolean) {
  generateButton.hidden = visible;
  replaceOptions.hidden = !visible;
  confirmCancelButton.hidden = !visible;
  confirmReplaceButton.hidden = !visible;
}

function readScope(): ReplacementScope {
  const scope = { ...FULL_REPLACEMENT_SCOPE };
  for (const input of scopeInputs) {
    const key = input.dataset.scope as keyof ReplacementScope;
    scope[key] = input.checked;
  }
  return scope;
}

function writeScope(scope: ReplacementScope) {
  for (const input of scopeInputs) {
    const key = input.dataset.scope as keyof ReplacementScope;
    input.checked = scope[key];
  }
}

function syncReplacementScope(changed?: keyof ReplacementScope) {
  const requested = readScope();
  // Let users deselect a dependency chain naturally: turning off a downstream
  // target also turns off any selected upstream target that would force it on.
  if (changed === "blocks" && !requested.blocks) {
    requested.components = false;
    requested.designSystem = false;
  } else if (changed === "components" && !requested.components) {
    requested.designSystem = false;
  }
  const completed = completeReplacementScope(requested, pendingAvailability);
  writeScope(completed);
  replaceNote.textContent = sameReplacementScope(requested, completed)
    ? ""
    : "Required dependencies were selected automatically.";
  confirmReplaceButton.disabled = !(
    completed.theme ||
    completed.designSystem ||
    completed.components ||
    completed.blocks
  );
}

for (const input of scopeInputs) {
  input.addEventListener("change", () => {
    syncReplacementScope(input.dataset.scope as keyof ReplacementScope);
  });
}

function renderPopularPresets() {
  // Shuffle is the leading chip in the row.
  shuffleButton = document.createElement("button");
  shuffleButton.type = "button";
  shuffleButton.className = "preset-badge shuffle";
  shuffleButton.title = "Import a random resolvable preset";
  shuffleButton.setAttribute("aria-label", "Shuffle a random preset");
  shuffleButton.textContent = "Shuffle";
  shuffleButton.addEventListener("click", () => {
    runShuffle();
  });
  presetsList.appendChild(shuffleButton);

  for (const preset of POPULAR_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-badge";
    button.title = `${preset.description} · ${preset.code}`;
    button.setAttribute("aria-label", `Import ${preset.name} preset`);
    button.textContent = preset.name;

    button.addEventListener("click", () => {
      if (busy) return;
      input.value = preset.code;
      runPreset(preset.code);
    });

    presetsList.appendChild(button);
  }
}

renderPopularPresets();

input.addEventListener("input", syncGenerateButton);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !generateButton.disabled) {
    generateButton.click();
  }
});

generateButton.addEventListener("click", () => {
  const presetCode = extractPresetCode(input.value);
  if (!presetCode) {
    setStatus("Couldn't find a preset code in that input.", "error");
    return;
  }
  runPreset(presetCode);
});

confirmReplaceButton.addEventListener("click", () => {
  if (!pendingPresetCode) return;
  const presetCode = pendingPresetCode;
  pendingPresetCode = null;
  setConfirmVisible(false);
  runPreset(presetCode, true, readScope());
});

confirmCancelButton.addEventListener("click", () => {
  pendingPresetCode = null;
  busy = false;
  setConfirmVisible(false);
  setStatus("Cancelled. Nothing was changed.");
  resetProgress();
  syncGenerateButton();
});

function runShuffle() {
  if (busy) return;
  const presetCode = generateRandomResolvablePreset();
  input.value = presetCode;
  runPreset(presetCode);
}

window.addEventListener("message", (event: MessageEvent) => {
  const message = event.data?.pluginMessage as PluginToUi | undefined;
  if (!message) return;

  if (message.type === "ready") {
    syncGenerateButton();
    // When launched from the "Shuffle a random preset" command in Figma's
    // quick-actions palette, kick off a shuffle immediately.
    if (message.command === "shuffle") {
      runShuffle();
    }
    return;
  }

  if (message.type === "progress") {
    updateProgress(message);
    return;
  }

  if (message.type === "awaiting-confirmation") {
    // Niram exists. Stop the progress fill and swap the Generate button for the
    // inline replace prompt. Stay busy so shuffle/preset chips can't fire while
    // the prompt is up; `pendingPresetCode` already holds the code the confirm
    // button will resend.
    setStatus(message.message);
    pendingAvailability = message.availability;
    writeScope(FULL_REPLACEMENT_SCOPE);
    syncReplacementScope();
    resetProgress();
    setConfirmVisible(true);
    return;
  }

  if (message.type === "error") {
    busy = false;
    setConfirmVisible(false);
    setStatus(message.message, "error");
    resetProgress();
    syncGenerateButton();
    return;
  }

  if (message.type === "done") {
    busy = false;
    setConfirmVisible(false);
    const s = message.summary;
    const variables = s.collections.reduce(
      (acc, collection) => acc + collection.variableCount,
      0,
    );
    const nodes = s.designSystemNodes + s.componentsNodes + s.blocksNodes;
    setStatus(
      `Done · ${formatCount(variables)} variables · ${formatCount(nodes)} nodes`,
      "done",
    );
    finishProgress();
    syncGenerateButton();
    return;
  }
});
