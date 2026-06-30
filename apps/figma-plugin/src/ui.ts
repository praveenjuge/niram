// UI thread — runs in an iframe inside Figma. Sends messages to code.ts via
// parent.postMessage and receives them via window.message events.

import { extractPresetCode } from "./preset";
import { generateRandomResolvablePreset } from "./registry";
import { POPULAR_PRESETS } from "./popularPresets";
import type { PluginToUi, UiToPlugin } from "./messages";

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

// Created in renderPopularPresets, kept for direct shuffle triggering.
let shuffleButton: HTMLButtonElement;

let busy = false;
// The preset code awaiting a "replace everything" confirmation. Set when the
// sandbox reports Niram already exists; cleared once the user confirms/cancels.
let pendingPresetCode: string | null = null;

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

// Turn the Generate button into the progress indicator: a determinate fill
// when a percent is known, otherwise an indeterminate sliding stripe.
function setButtonProgress(percent: number | undefined, label: string) {
  generateButton.classList.add("working");
  generateLabel.textContent = label;
  if (typeof percent === "number") {
    generateButton.classList.remove("indeterminate");
    generateFill.style.width = `${clampPercent(percent)}%`;
  } else {
    generateButton.classList.add("indeterminate");
    generateFill.style.width = "";
  }
}

// Drive the button from a progress message: keep the percent in the label and
// the fill width; fall back to the detail/message text when no percent yet.
function updateProgress(message: Extract<PluginToUi, { type: "progress" }>) {
  const detail = message.detail ?? message.message;
  const label =
    typeof message.percent === "number"
      ? `${detail} · ${message.percent}%`
      : detail;
  setButtonProgress(message.percent, label);
}

function startProgress() {
  setStatus("");
  setButtonProgress(undefined, "Working…");
}

function finishProgress() {
  generateButton.classList.remove("indeterminate");
  generateFill.style.width = "100%";
  setTimeout(() => {
    resetProgress();
  }, 600);
}

function resetProgress() {
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

function runPreset(presetCode: string, confirmReplace = false) {
  busy = true;
  // Remember the code in case the sandbox comes back asking to confirm a
  // destructive replace; the confirm button resends exactly this code.
  pendingPresetCode = presetCode;
  syncGenerateButton();
  startProgress();
  postToPlugin({ type: "generate", presetCode, confirmReplace });
}

// Swap the Generate button for the inline Cancel / Replace prompt (or back).
function setConfirmVisible(visible: boolean) {
  generateButton.hidden = visible;
  confirmCancelButton.hidden = !visible;
  confirmReplaceButton.hidden = !visible;
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
  runPreset(presetCode, true);
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
