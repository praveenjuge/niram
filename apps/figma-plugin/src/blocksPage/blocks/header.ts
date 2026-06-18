// Blocks region header — intro card explaining the blocks region.

import { createPageHeader } from "../layout";
import { PAGE_WIDTH, type BlocksInputs } from "../types";
import { countDescendants } from "../utils";

export async function addHeader(
  page: PageNode,
  inputs: BlocksInputs,
): Promise<number> {
  const frame = createPageHeader(inputs, PAGE_WIDTH);
  page.appendChild(frame);
  return countDescendants(frame);
}
