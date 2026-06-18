// Documentation metadata for the generated component library.
//
// Every publishable Figma asset Niram emits (the Components-region component
// sets/components plus the Blocks-region `Chart` and `Sidebar` sets) gets a
// short, usage-focused description and a single link back to the official
// shadcn/ui documentation page. Figma surfaces these in the component's
// "Description" area and the inspector's docs link, so designers can read what
// a component is for and jump to the canonical reference without leaving the
// file.
//
// The metadata is curated and bundled (never fetched at runtime) so the plugin
// keeps working offline. Keyed by the generated component/component-set name so
// the post-build pass can look each asset up by `node.name`.

// One documentation entry per asset.
export type ComponentDocEntry = {
  // Canonical shadcn/ui documentation URL. The Figma Plugin API supports a
  // single documentation link per component, so this is the one we attach.
  url: string;
  // Short markdown description focused on what the component is for and when to
  // reach for it — not implementation trivia.
  description: string;
  // Optional extra usage notes (states, variants, accessibility, composition).
  // Appended to the description as a second markdown paragraph when present.
  notes?: string;
};

const DOCS_BASE = "https://ui.shadcn.com/docs/components";
const CHARTS_URL = "https://ui.shadcn.com/charts";
const SIDEBAR_BLOCKS_URL = "https://ui.shadcn.com/blocks/sidebar";

// Small constructor so the table below reads as data, not boilerplate. `slug`
// is the shadcn docs slug; pass an absolute `url` instead for assets that live
// outside /docs/components (Chart, Sidebar).
function entry(
  slug: string,
  description: string,
  notes?: string,
): ComponentDocEntry {
  return { url: `${DOCS_BASE}/${slug}`, description, notes };
}

// Keyed by the exact name each builder assigns to its top-level component or
// component set (see src/componentsPage/sections/* and src/blocksPage/blocks/*).
export const componentDocs: Record<string, ComponentDocEntry> = {
  Accordion: entry(
    "accordion",
    "A vertically stacked set of headers that each reveal a section of content. Use it to condense long pages into expandable panels.",
    "Only one item is shown expanded here; in product, choose single- or multiple-open behavior to match the content density.",
  ),
  Alert: entry(
    "alert",
    "A callout for short, important messages that sit inline with page content. Pairs an icon, a title, and a supporting description.",
    "The `Variant` axis covers default, success, warning, and destructive tones.",
  ),
  "Alert Dialog": entry(
    "alert-dialog",
    "A modal that interrupts the user to confirm a consequential action. Use it for destructive or irreversible choices that need explicit confirmation.",
  ),
  "Aspect Ratio": entry(
    "aspect-ratio",
    "Constrains its content to a fixed width-to-height ratio. Use it to keep media and embeds from shifting layout as they load.",
  ),
  Avatar: entry(
    "avatar",
    "A small image element with a text fallback, used to represent a user or entity. Falls back to initials when no image is available.",
  ),
  Badge: entry(
    "badge",
    "A compact label for statuses, counts, and tags. Reach for it to annotate items without competing with primary content.",
    "The `Style` axis covers plain, status dot, leading icon, dismissible, and count layouts.",
  ),
  Breadcrumb: entry(
    "breadcrumb",
    "Shows the path to the current page and lets users step back up the hierarchy. Use it on deep, nested screens.",
  ),
  Button: entry(
    "button",
    "Triggers an action or event. The default starting point for most interactions in a UI.",
    "Variants set tone (default, secondary, destructive, outline, ghost, link); sizes cover text and icon-only buttons; the `State` axis previews hover, focus, and disabled.",
  ),
  "Button Group": entry(
    "button-group",
    "Groups related buttons into a single segmented control with shared edges. Use it for closely related actions or exclusive choices.",
  ),
  Calendar: entry(
    "calendar",
    "A date grid for selecting single days or ranges. The building block behind the Date Picker.",
  ),
  Card: entry(
    "card",
    "A flexible container that groups related content and actions into a bordered surface. Composes a header, content, and footer.",
    "Variants show the resting card, an interactive (hoverable) card, a body-only layout, a media card, and an action footer.",
  ),
  Carousel: entry(
    "carousel",
    "A horizontally scrollable set of slides with previous/next controls. Use it to browse a series of items in limited space.",
  ),
  Checkbox: entry(
    "checkbox",
    "A control for toggling a single option on or off, or for selecting several options from a list.",
    "Covers unchecked, checked, indeterminate, and disabled states.",
  ),
  Collapsible: entry(
    "collapsible",
    "Shows and hides a single section of content behind a trigger. Use it for progressive disclosure of secondary detail.",
  ),
  Combobox: entry(
    "combobox",
    "An input combined with a filterable list, for picking one or more values from a large set. Use it when a plain Select would be too long.",
  ),
  Command: entry(
    "command",
    "A command palette: a searchable list of actions and navigation targets. Use it for fast, keyboard-driven access across an app.",
  ),
  "Context Menu": entry(
    "context-menu",
    "A menu of actions surfaced on right-click for a specific element. Use it for contextual, item-level commands.",
  ),
  "Data Table": entry(
    "data-table",
    "A table with built-in filtering, selection, and pagination chrome for browsing structured rows. Use it for dense, sortable datasets.",
  ),
  "Date Picker": entry(
    "date-picker",
    "A trigger that opens a calendar for choosing a date or range. Combines a popover with the Calendar.",
  ),
  Dialog: entry(
    "dialog",
    "A modal window layered over the page for focused tasks and short flows. Use it for content that needs the user's full attention.",
    "Holds a title, description, body, footer actions, and a close button.",
  ),
  Drawer: entry(
    "drawer",
    "A panel that slides in from an edge of the screen. Good for mobile-friendly sheets and secondary flows.",
  ),
  "Dropdown Menu": entry(
    "dropdown-menu",
    "A menu of actions or options anchored to a trigger. Use it for a tidy set of commands tied to a button.",
  ),
  Empty: entry(
    "empty",
    "A placeholder state shown when there's no data yet, paired with an icon, a message, and a call to action. Use it to guide first use.",
  ),
  Field: entry(
    "field",
    "A form-field wrapper that arranges a label, control, description, and error message. Use it to keep form rows consistent.",
  ),
  Form: entry(
    "form",
    "A composed form built from reusable Label, Input, and Button instances. Demonstrates the standard field-to-submit layout.",
  ),
  "Hover Card": entry(
    "hover-card",
    "A rich preview that appears when hovering a trigger, for sighted users to glance at related detail without navigating away.",
  ),
  Input: entry(
    "input",
    "A single-line text field for short free-form entry. The default control for names, emails, search, and similar values.",
    "Covers default, focused, disabled, and invalid states, with an optional leading icon.",
  ),
  "Input Group": entry(
    "input-group",
    "An input paired with leading or trailing add-ons such as icons, text, or buttons. Use it for prefixes, suffixes, and inline actions.",
  ),
  "Input OTP": entry(
    "input-otp",
    "A segmented input for one-time passcodes and verification codes, with one box per character.",
  ),
  Item: entry(
    "item",
    "A flexible list row that lines up an optional icon/media, title, description, and trailing action. Use it for settings rows and list entries.",
  ),
  Kbd: entry(
    "kbd",
    "Renders a keyboard key or shortcut inline with text. Use it in help, menus, and tooltips to document hotkeys.",
  ),
  Label: entry(
    "label",
    "An accessible caption for a form control. Pair it with inputs so the field has a clickable, screen-reader-friendly name.",
  ),
  Menubar: entry(
    "menubar",
    "A horizontal bar of top-level menus, like a desktop application menu. Use it for app-wide command groups.",
  ),
  "Native Select": entry(
    "select",
    "A select control backed by the browser's native dropdown. Use it for simple option lists where platform behavior is preferred.",
  ),
  "Navigation Menu": entry(
    "navigation-menu",
    "A primary navigation bar with optional expandable panels of links. Use it for top-level site or app navigation.",
  ),
  Pagination: entry(
    "pagination",
    "Page-number controls for moving through long, paged result sets. Use it under tables and lists.",
  ),
  Popover: entry(
    "popover",
    "A small floating panel anchored to a trigger, for secondary content and controls. Use it for lightweight overlays that aren't modal.",
  ),
  Progress: entry(
    "progress",
    "A bar that communicates the completion of a task or process. Use it for determinate loading and multi-step flows.",
  ),
  "Radio Group": entry(
    "radio-group",
    "A set of mutually exclusive options where exactly one can be selected. Use it for short, visible choice lists.",
  ),
  Resizable: entry(
    "resizable",
    "Resizable panel groups split by draggable handles. Use it for adjustable split views and side-by-side layouts.",
  ),
  "Scroll Area": entry(
    "scroll-area",
    "A scrollable region with styled, consistent scrollbars across platforms. Use it to contain overflowing content.",
  ),
  Select: entry(
    "select",
    "A trigger that opens a list for choosing one option from a set. Use it for medium-length, single-choice lists.",
  ),
  Separator: entry(
    "separator",
    "A thin line that visually or semantically divides content. Available in horizontal and vertical orientations.",
  ),
  Sheet: entry(
    "sheet",
    "A panel that slides in over the page from an edge, built on Dialog. Use it for side panels and supplementary flows.",
  ),
  Skeleton: entry(
    "skeleton",
    "A placeholder shape shown while content loads, hinting at the layout to come. Use it to reduce perceived wait.",
  ),
  Slider: entry(
    "slider",
    "A draggable control for choosing a value or range along a track. Use it for volumes, prices, and other continuous values.",
  ),
  Sonner: entry(
    "sonner",
    "An opinionated toast for brief, non-blocking notifications. Use it for confirmations, errors, and background status.",
  ),
  Spinner: entry(
    "spinner",
    "An indeterminate loading indicator for short waits. Use it when progress can't be measured.",
  ),
  Switch: entry(
    "switch",
    "A toggle for an on/off setting that applies immediately. Use it for binary preferences rather than form submission.",
  ),
  Table: entry(
    "table",
    "A semantic table for displaying rows and columns of data. The static base beneath the Data Table.",
  ),
  Tabs: entry(
    "tabs",
    "Switches between sections of content within the same context. Use it to organize related views without navigation.",
  ),
  Textarea: entry(
    "textarea",
    "A multi-line text field for longer free-form entry such as messages and notes.",
    "Covers default, focused, disabled, and invalid states.",
  ),
  Toggle: entry(
    "toggle",
    "A two-state button that stays pressed when active. Use it for a single on/off formatting or filter control.",
    "Variants cover default and outline styles across small, default, and large sizes; the `Pressed` axis is the on/off state.",
  ),
  "Toggle Group": entry(
    "toggle-group",
    "A set of toggles grouped together for single- or multiple-selection of related options, such as text formatting.",
  ),
  Tooltip: entry(
    "tooltip",
    "A small label that appears on hover or focus to describe an element. Use it for concise, supplementary hints.",
    "The `Side` axis previews top, bottom, left, and right placements.",
  ),
  "Chart Tooltip": entry(
    "chart",
    "The hover callout used by charts (ChartTooltipContent): a popover listing the hovered series, values, and an optional total.",
    "Variants cover dot, line, icon, and no-indicator layouts plus a labelled total footer.",
  ),
  Typography: entry(
    "typography",
    "Reference text styles — headings, body, lists, and inline elements — that mirror the Tailwind typography scale.",
  ),

  // --- Blocks region -------------------------------------------------------
  Chart: {
    url: CHARTS_URL,
    description:
      "A library of chart patterns — area, bar, line, pie, radar, and radial — that recolor with the active theme's chart palette.",
    notes:
      "Pick a chart with the `Family` and `Variant` properties; every series binds to the `chart-1…5` theme variables.",
  },
  Sidebar: {
    url: SIDEBAR_BLOCKS_URL,
    description:
      "The full set of 16 shadcn sidebar layouts as variants, from simple navigation rails to collapsible, multi-section app shells.",
    notes:
      "Switch layouts with the `Variant` property (sidebar-01 … sidebar-16).",
  },
};

// A node that can carry documentation metadata (ComponentNode / ComponentSetNode
// both expose `description`, `descriptionMarkdown`, and `documentationLinks`).
type DocumentableNode = {
  type: string;
  name: string;
  description?: string;
  descriptionMarkdown?: string;
  documentationLinks?: ReadonlyArray<{ uri: string }>;
};

// Look up and apply the docs metadata for a single component/component set by
// its name. Sets `descriptionMarkdown` (description + optional notes) and a
// single `documentationLinks` entry. Returns true when an entry was found and
// applied, false when the name has no registered docs.
export function applyComponentDocs(node: {
  type: string;
  name: string;
}): boolean {
  const meta = componentDocs[node.name];
  if (!meta) return false;

  const markdown = meta.notes
    ? `${meta.description}\n\n${meta.notes}`
    : meta.description;

  const target = node as DocumentableNode;
  // descriptionMarkdown is the rich field Figma renders; mirror it onto the
  // plain `description` too so older inspectors still show the summary.
  target.descriptionMarkdown = markdown;
  target.description = meta.description;
  target.documentationLinks = [{ uri: meta.url }];
  return true;
}

// Walk a built section tree and return every publishable component or component
// set at its top level. Stops at the first COMPONENT/COMPONENT_SET on each
// branch: a set's child components are variants (not separately publishable),
// and a standalone component (e.g. Label, wrapped in a section card) has no
// publishable components nested inside it.
export function collectPublishableComponents(root: {
  type: string;
  children?: ReadonlyArray<unknown>;
}): Array<{ type: string; name: string }> {
  const out: Array<{ type: string; name: string }> = [];

  function visit(node: { type: string; children?: ReadonlyArray<unknown> }) {
    if (node.type === "COMPONENT_SET" || node.type === "COMPONENT") {
      out.push(node as { type: string; name: string });
      return;
    }
    const children = node.children;
    if (children) {
      for (const child of children) {
        visit(child as { type: string; children?: ReadonlyArray<unknown> });
      }
    }
  }

  visit(root);
  return out;
}

// Apply docs metadata to every publishable component/component set found under
// the given section roots. Returns the number of assets that received docs.
export function applyDocsToSections(
  roots: ReadonlyArray<{ type: string; children?: ReadonlyArray<unknown> }>,
): number {
  let applied = 0;
  for (const root of roots) {
    for (const node of collectPublishableComponents(root)) {
      if (applyComponentDocs(node)) applied++;
    }
  }
  return applied;
}
