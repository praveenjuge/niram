// Builds the "Components" region of the shared `Niram` page — real Figma
// components (ComponentNode / ComponentSetNode) so designers can drag instances
// and swap variants. The region is appended beneath the Design System region;
// the Blocks region is later appended to its right.
//
// Each component is created via figma.createComponent(), grouped into a
// ComponentSet when there are multiple variants. The region only holds the
// components themselves — no example frames or showcases.

import { addAccordionSection } from "./sections/accordion";
import { addAlertSection } from "./sections/alert";
import { addAlertDialogSection } from "./sections/alertDialog";
import { addAspectRatioSection } from "./sections/aspectRatio";
import { addAvatarSection } from "./sections/avatar";
import { addBadgeSection } from "./sections/badge";
import { addBreadcrumbSection } from "./sections/breadcrumb";
import { addButtonSection } from "./sections/button";
import { addButtonGroupSection } from "./sections/buttonGroup";
import { addCalendarSection } from "./sections/calendar";
import { addCardSection } from "./sections/card";
import { addCarouselSection } from "./sections/carousel";
import { addCheckboxSection } from "./sections/checkbox";
import { addCollapsibleSection } from "./sections/collapsible";
import { addComboboxSection } from "./sections/combobox";
import { addCommandSection } from "./sections/command";
import { addContextMenuSection } from "./sections/contextMenu";
import { addDataTableSection } from "./sections/dataTable";
import { addDatePickerSection } from "./sections/datePicker";
import { addDialogSection } from "./sections/dialog";
import { addDrawerSection } from "./sections/drawer";
import { addDropdownMenuSection } from "./sections/dropdownMenu";
import { addEmptySection } from "./sections/empty";
import { addFieldSection } from "./sections/field";
import { addFormSection } from "./sections/form";
import { addHeader } from "./sections/header";
import { addHoverCardSection } from "./sections/hoverCard";
import { addInputSection } from "./sections/input";
import { addInputGroupSection } from "./sections/inputGroup";
import { addInputOtpSection } from "./sections/inputOtp";
import { addItemSection } from "./sections/item";
import { addKbdSection } from "./sections/kbd";
import { addLabelSection } from "./sections/label";
import { addMenubarSection } from "./sections/menubar";
import { addNativeSelectSection } from "./sections/nativeSelect";
import { addNavigationMenuSection } from "./sections/navigationMenu";
import { addPaginationSection } from "./sections/pagination";
import { addPopoverSection } from "./sections/popover";
import { addProgressSection } from "./sections/progress";
import { addRadioGroupSection } from "./sections/radioGroup";
import { addResizableSection } from "./sections/resizable";
import { addScrollAreaSection } from "./sections/scrollArea";
import { addSelectSection } from "./sections/select";
import { addSeparatorSection } from "./sections/separator";
import { addSheetSection } from "./sections/sheet";
import { addSkeletonSection } from "./sections/skeleton";
import { addSliderSection } from "./sections/slider";
import { addSonnerSection } from "./sections/sonner";
import { addSpinnerSection } from "./sections/spinner";
import { addSwitchSection } from "./sections/switch";
import { addTableSection } from "./sections/table";
import { addTabsSection } from "./sections/tabs";
import { addTextareaSection } from "./sections/textarea";
import { addToggleSection } from "./sections/toggle";
import { addToggleGroupSection } from "./sections/toggleGroup";
import { addTooltipSection } from "./sections/tooltip";
import { addTypographySection } from "./sections/typography";
import {
  PAGE_NAME,
  REGION_GAP,
  SECTION_GAP,
  SECTION_WIDTH,
  type ComponentsInputs,
  type ComponentsResult,
  type SectionBuilder,
} from "./types";
import { loadComponentsFonts } from "./utils";
import { applyDocsToSections } from "./docs";
import { ensureEffectStyles } from "../effectStyles";
import { ensureTextStyles, applyTextStylesChunked } from "../textStyles";
import { applyTokenBindingsChunked } from "../tokenBindings";
import { yieldToUi } from "../async";

export type { ComponentsInputs, ComponentsResult } from "./types";

// Everything Niram generates shares one page (Figma Starter/free files cap at
// 3 pages). The Design System builder owns page creation and renders its
// sections first; this builder appends the component grid beneath that region.
// Each builder tags the top-level frames it owns with this plugin-data key so
// a re-run clears and rebuilds only its own region.
const REGION_KEY = "niramRegion";
const REGION_ID = "components";
const DESIGN_SYSTEM_REGION_ID = "design-system";

// The header is always rendered first; every other section is laid out in
// alphabetical order so newly added components slot into the right place
// automatically. Keep this list sorted by `label` (the runtime sort below is
// a safety net, but a sorted source keeps diffs readable).
const HEADER_SECTION: SectionBuilder = { label: "Header", build: addHeader };

const SECTIONS: SectionBuilder[] = [
  { label: "Accordion", build: addAccordionSection },
  { label: "Alert", build: addAlertSection },
  { label: "Alert Dialog", build: addAlertDialogSection },
  { label: "Aspect Ratio", build: addAspectRatioSection },
  { label: "Avatar", build: addAvatarSection },
  { label: "Badge", build: addBadgeSection },
  { label: "Breadcrumb", build: addBreadcrumbSection },
  { label: "Button", build: addButtonSection },
  { label: "Button Group", build: addButtonGroupSection },
  { label: "Calendar", build: addCalendarSection },
  { label: "Card", build: addCardSection },
  { label: "Carousel", build: addCarouselSection },
  { label: "Checkbox", build: addCheckboxSection },
  { label: "Collapsible", build: addCollapsibleSection },
  { label: "Combobox", build: addComboboxSection },
  { label: "Command", build: addCommandSection },
  { label: "Context Menu", build: addContextMenuSection },
  { label: "Data Table", build: addDataTableSection },
  { label: "Date Picker", build: addDatePickerSection },
  { label: "Dialog", build: addDialogSection },
  { label: "Drawer", build: addDrawerSection },
  { label: "Dropdown Menu", build: addDropdownMenuSection },
  { label: "Empty", build: addEmptySection },
  { label: "Field", build: addFieldSection },
  { label: "Hover Card", build: addHoverCardSection },
  { label: "Input", build: addInputSection },
  { label: "Input Group", build: addInputGroupSection },
  { label: "Input OTP", build: addInputOtpSection },
  { label: "Item", build: addItemSection },
  { label: "Kbd", build: addKbdSection },
  { label: "Label", build: addLabelSection },
  { label: "Menubar", build: addMenubarSection },
  { label: "Native Select", build: addNativeSelectSection },
  { label: "Navigation Menu", build: addNavigationMenuSection },
  { label: "Pagination", build: addPaginationSection },
  { label: "Popover", build: addPopoverSection },
  { label: "Progress", build: addProgressSection },
  { label: "Radio Group", build: addRadioGroupSection },
  { label: "Resizable", build: addResizableSection },
  { label: "Scroll Area", build: addScrollAreaSection },
  { label: "Select", build: addSelectSection },
  { label: "Separator", build: addSeparatorSection },
  { label: "Sheet", build: addSheetSection },
  { label: "Skeleton", build: addSkeletonSection },
  { label: "Slider", build: addSliderSection },
  { label: "Sonner", build: addSonnerSection },
  { label: "Spinner", build: addSpinnerSection },
  { label: "Switch", build: addSwitchSection },
  { label: "Table", build: addTableSection },
  { label: "Tabs", build: addTabsSection },
  { label: "Textarea", build: addTextareaSection },
  { label: "Toggle", build: addToggleSection },
  { label: "Toggle Group", build: addToggleGroupSection },
  { label: "Tooltip", build: addTooltipSection },
  { label: "Typography", build: addTypographySection },
];

// Sections that embed live instances of other page-built components (the same
// reuse model the Toggle uses for the published icon set). They must run after
// every component set above exists on the page, so they're appended after the
// alphabetical pass rather than sorted into it. Form reuses Button, Input, and
// Label.
const DEFERRED_SECTIONS: SectionBuilder[] = [
  { label: "Form", build: addFormSection },
];

// Header first, then every other section alphabetically by label, then the
// deferred sections that depend on the others already being built.
const ORDERED_SECTIONS: SectionBuilder[] = [
  HEADER_SECTION,
  ...[...SECTIONS].sort((a, b) => a.label.localeCompare(b.label)),
  ...DEFERRED_SECTIONS,
];

export async function buildComponentsPage(
  inputs: ComponentsInputs,
): Promise<ComponentsResult> {
  await figma.loadAllPagesAsync();

  // Find the shared Niram page. The Design System builder normally creates it
  // first; when this builder runs in isolation (tests, standalone callers) we
  // create it so the grid still has a home.
  let page = figma.root.children.find(
    (child) => child.type === "PAGE" && child.name === PAGE_NAME,
  ) as PageNode | undefined;

  if (page) {
    // Clear only the component frames a previous run tagged, leaving the Design
    // System and Blocks regions on the page untouched.
    inputs.onProgress?.({ phase: "clearing", current: 0, total: 1 });
    for (const node of [...page.children]) {
      if (node.getPluginData(REGION_KEY) === REGION_ID) node.remove();
    }
    inputs.onProgress?.({ phase: "clearing", current: 1, total: 1 });
  } else {
    page = figma.createPage();
    page.name = PAGE_NAME;
  }

  await loadComponentsFonts(inputs);

  // Publish/refresh the shadow + blur effect styles (idempotent) so component
  // sections can reference real styles instead of literal effects.
  const effectStyles =
    inputs.effectStyles ?? (await ensureEffectStyles(inputs.primitives));
  const inputsWithStyles: ComponentsInputs = { ...inputs, effectStyles };

  // Publish/refresh the Tailwind typography text styles so matching component
  // text nodes can be mapped onto a published style after the build.
  const textStyles =
    inputs.textStyles ??
    (await ensureTextStyles(inputs.primitives, inputs.fontVars));

  const total = ORDERED_SECTIONS.length;
  let count = 0;

  // Remember the frames already on the page (other regions) so we tag, sweep,
  // and lay out only the component frames this run appends.
  const preexisting = new Set<SceneNode>(page.children as SceneNode[]);

  for (let i = 0; i < ORDERED_SECTIONS.length; i++) {
    const section = ORDERED_SECTIONS[i]!;
    inputs.onProgress?.({
      phase: "building",
      current: i,
      total,
      label: section.label,
    });
    count += await section.build(page, inputsWithStyles);
    await yieldToUi();
  }
  inputs.onProgress?.({
    phase: "building",
    current: total,
    total,
    label: "Done",
  });

  // The frames this run appended, in ORDERED_SECTIONS order. Tag them so a
  // later re-run clears only this region.
  const sectionNodes = (page.children as SceneNode[]).filter(
    (child) => !preexisting.has(child),
  );
  for (const node of sectionNodes) node.setPluginData(REGION_KEY, REGION_ID);

  // Attach documentation metadata (a short description + a single shadcn docs
  // link) to every publishable component/component set this run appended, so
  // designers see what each component is for and can jump to the canonical
  // reference. Curated + bundled (see docs.ts) so it works offline.
  applyDocsToSections(sectionNodes as unknown as { type: string }[]);

  // Map eligible text nodes onto their Tailwind text style before the token
  // sweep, so the style owns each node's font size + line height. Chunked so
  // the UI keeps painting through this post-build sweep.
  await applyTextStylesChunked(sectionNodes, textStyles, (done, totalNodes) =>
    inputs.onProgress?.({
      phase: "text-styles",
      current: done,
      total: totalNodes,
    }),
  );

  // Bind the remaining non-color primitives (spacing, padding, gaps, border
  // widths, radii, font sizes) wherever a literal matches a token, so later
  // variable edits reflow the components instead of leaving frozen literals.
  await applyTokenBindingsChunked(
    sectionNodes,
    inputs.primitives,
    (done, totalNodes) =>
      inputs.onProgress?.({
        phase: "binding",
        current: done,
        total: totalNodes,
      }),
  );

  inputs.onProgress?.({ phase: "layout", current: 0, total: 1 });
  layoutSectionsInColumns(page, sectionNodes);
  inputs.onProgress?.({ phase: "layout", current: 1, total: 1 });
  return { nodeCount: count };
}

// Lay this region's section frames out across four equal-width columns
// (mirroring the Design System region) so the grid stays compact instead of
// running down a single tall column. The grid is placed to the right of the
// Design System region on the shared page, so the page reads left-to-right:
// Design System → Components → Blocks. The header pins to the top-left of the
// grid; every other section drops into whichever column is currently shortest,
// preserving the alphabetical build order while keeping the columns balanced in
// height.
function layoutSectionsInColumns(page: PageNode, sectionNodes: SceneNode[]) {
  const COLUMN_COUNT = 4;
  const columnHeights = new Array<number>(COLUMN_COUNT).fill(0);

  // Start the grid to the right of the Design System region (if present) so the
  // two read as side-by-side zones on the same page.
  const originX = regionOriginX(page, sectionNodes);

  sectionNodes.forEach((child, index) => {
    if (!("x" in child)) return;
    const node = child as SceneNode & {
      x: number;
      y: number;
      height: number;
    };

    // The header (first frame) always anchors the top of the left column.
    let target = 0;
    if (index > 0) {
      // Pick the shortest column so the stacks stay balanced.
      for (let col = 1; col < COLUMN_COUNT; col++) {
        if (columnHeights[col]! < columnHeights[target]!) target = col;
      }
    }

    node.x = originX + target * (SECTION_WIDTH + SECTION_GAP);
    node.y = columnHeights[target]!;

    const height = node.height ?? 0;
    columnHeights[target] = columnHeights[target]! + height + SECTION_GAP;
  });
}

// The x where the component grid starts: just past the right edge of the Design
// System region, plus a gutter. Falls back to 0 when no Design System region
// exists (isolated callers / tests rendering onto a bare page).
function regionOriginX(page: PageNode, sectionNodes: SceneNode[]): number {
  const own = new Set<SceneNode>(sectionNodes);
  let maxRight = 0;
  let seen = false;
  for (const child of page.children as SceneNode[]) {
    if (own.has(child)) continue;
    if (child.getPluginData(REGION_KEY) !== DESIGN_SYSTEM_REGION_ID) continue;
    if (!("x" in child)) continue;
    const node = child as SceneNode & { x: number; width: number };
    const right = (node.x ?? 0) + (node.width ?? 0);
    if (right > maxRight) maxRight = right;
    seen = true;
  }
  return seen ? maxRight + REGION_GAP : 0;
}
