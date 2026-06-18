// UI thread — runs in an iframe inside Figma. Sends messages to code.ts via
// parent.postMessage and receives them via window.message events.

import { extractPresetCode } from "./preset";
import { generateRandomResolvablePreset } from "./registry";
import { POPULAR_PRESETS } from "./popularPresets";
import type { PluginToUi, UiToPlugin } from "./messages";

const input = document.getElementById("preset") as HTMLInputElement;
const generateButton = document.getElementById("generate") as HTMLButtonElement;
const confirmReplaceButton = document.getElementById(
  "confirm-replace",
) as HTMLButtonElement;
const confirmCancelButton = document.getElementById(
  "confirm-cancel",
) as HTMLButtonElement;
const shuffleButton = document.getElementById("shuffle") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLSpanElement;
const meta = document.getElementById("meta") as HTMLSpanElement;
const progress = document.getElementById("progress") as HTMLDivElement;
const progressBar = progress.querySelector(".bar") as HTMLSpanElement;
const presetsList = document.getElementById("presets-list") as HTMLDivElement;

let busy = false;
// The preset code awaiting a "replace everything" confirmation. Set when the
// sandbox reports Niram already exists; cleared once the user confirms/cancels.
let pendingPresetCode: string | null = null;

function postToPlugin(message: UiToPlugin) {
  parent.postMessage({ pluginMessage: message }, "*");
}

function setStatus(text: string, variant: "info" | "error" | "done" = "info") {
  status.textContent = text;
  status.classList.toggle("error", variant === "error");
  status.classList.toggle("done", variant === "done");
}

function setMeta(text: string) {
  meta.textContent = text;
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

// Drive the bar + meta from a progress message: determinate percent when
// available, otherwise the indeterminate stripe.
function updateProgress(message: Extract<PluginToUi, { type: "progress" }>) {
  progress.classList.add("visible");
  setStatus(message.detail ?? message.message);

  setMeta(typeof message.percent === "number" ? `${message.percent}%` : "");

  if (typeof message.percent === "number") {
    progress.classList.remove("indeterminate");
    progressBar.style.width = `${Math.max(0, Math.min(100, message.percent))}%`;
  } else {
    progress.classList.add("indeterminate");
    progressBar.style.width = "";
  }
}

function startProgress(presetCode: string) {
  setStatus(`Working on it (${presetCode})…`);
  setMeta("");
  progress.classList.add("visible", "indeterminate");
  progressBar.style.width = "";
}

function finishProgress() {
  progress.classList.remove("indeterminate");
  progressBar.style.width = "100%";
  setTimeout(() => {
    progress.classList.remove("visible");
    progressBar.style.width = "0%";
  }, 600);
}

function resetProgress() {
  setMeta("");
  progress.classList.remove("visible", "indeterminate");
  progressBar.style.width = "0%";
}

function syncGenerateButton() {
  if (busy) {
    generateButton.disabled = true;
    shuffleButton.disabled = true;
    setPresetButtonsDisabled(true);
    return;
  }
  generateButton.disabled = extractPresetCode(input.value) === null;
  shuffleButton.disabled = false;
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
  startProgress(presetCode);
  postToPlugin({ type: "generate", presetCode, confirmReplace });
}

// Swap the Generate button for the inline Cancel / Replace prompt (or back).
function setConfirmVisible(visible: boolean) {
  generateButton.hidden = visible;
  confirmCancelButton.hidden = !visible;
  confirmReplaceButton.hidden = !visible;
}

function renderPopularPresets() {
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

shuffleButton.addEventListener("click", () => {
  runShuffle();
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
    // Niram exists. Stop the indeterminate stripe and swap the Generate button
    // for the inline replace prompt. Stay busy so shuffle/preset chips can't
    // fire while the prompt is up; `pendingPresetCode` already holds the code
    // the confirm button will resend.
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
    setMeta("");
    finishProgress();
    syncGenerateButton();
    return;
  }
});
