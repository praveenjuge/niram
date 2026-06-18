// Design System page header — preset code and a compact summary line.

import { createSectionFrame } from "../layout";
import { createDesignSystemContext } from "../context";
import type { DesignSystemInputs } from "../types";
import { countDescendants, summarizePreset } from "../utils";

export async function addHeader(
  page: PageNode,
  inputs: DesignSystemInputs,
): Promise<number> {
  const frame = createSectionFrame(
    "Niram",
    {
      title: inputs.presetCode,
      titleSize: 28,
      subtitle: summarizePreset(inputs.presetSummary),
    },
    createDesignSystemContext(inputs),
  );
  page.appendChild(frame);
  return countDescendants(frame);
}
