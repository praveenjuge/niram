// Canonical manifest of the shadcn blocks Niram reproduces.
//
// Scope is fixed to the 27 in-scope blocks: the five login layouts
// (https://ui.shadcn.com/blocks/login), the five signup layouts
// (https://ui.shadcn.com/blocks/signup), all sixteen sidebar layouts
// (https://ui.shadcn.com/blocks/sidebar), and the dashboard
// (https://ui.shadcn.com/blocks). OTP, Calendar, and the standalone chart
// registry blocks are intentionally out of scope.
//
// Each entry pins a registry id to the Figma node that realizes it so tests can
// prove every in-scope block ships. login/signup/dashboard blocks each render a
// top-level canvas frame (the `name` passed to createBlockCanvas); the sixteen
// sidebar layouts are variants of the single "Sidebar" component set, keyed by
// the `Variant=sidebar-NN` switcher value.

export type BlockFamily = "login" | "signup" | "sidebar" | "dashboard";

// How a block maps onto the rendered Niram page.
//   - "canvas": a standalone block canvas frame named `name`.
//   - "sidebar-variant": a variant on the shared "Sidebar" component set, keyed
//     by `key` (the value shown in Figma's variant switcher).
export type BlockNode =
  | { kind: "canvas"; name: string }
  | { kind: "sidebar-variant"; key: string };

export type BlockManifestEntry = {
  // The shadcn registry id (e.g. "login-01"), matching the `{block}.json`
  // entry at https://ui.shadcn.com/r/styles/new-york-v4/{block}.json.
  id: string;
  family: BlockFamily;
  node: BlockNode;
  // A short description of what the layout shows, paraphrased from the official
  // block so the manifest reads as the spec the builders implement.
  description: string;
};

// The five login layouts. Frame names match the `createBlockCanvas` calls in
// src/blocksPage/blocks/login*.ts.
const LOGIN_BLOCKS: BlockManifestEntry[] = [
  {
    id: "login-01",
    family: "login",
    node: { kind: "canvas", name: "Login" },
    description:
      "A simple centered login card with email + password fields, a primary submit, a Google button, and a sign-up footer.",
  },
  {
    id: "login-02",
    family: "login",
    node: { kind: "canvas", name: "Login (Two Column)" },
    description:
      "A two-column login: a centered email + password form with a brand lockup beside a muted cover image panel.",
  },
  {
    id: "login-03",
    family: "login",
    node: { kind: "canvas", name: "Login (Social)" },
    description:
      "A login card led by Apple + Google social buttons above an email + password form, with a terms note below the card.",
  },
  {
    id: "login-04",
    family: "login",
    node: { kind: "canvas", name: "Login (Card)" },
    description:
      "A wide split card: a padded login form beside a muted cover panel, with a 3-up grid of social icon buttons.",
  },
  {
    id: "login-05",
    family: "login",
    node: { kind: "canvas", name: "Login (Email)" },
    description:
      "A compact logo-led login: a stacked brand mark over a single email field, a submit, and two social buttons.",
  },
];

// The five signup layouts. Note the file/label mapping: signup-03 is the
// "Signup (Card)" canvas (addSignupSocialBlock) and signup-04 is the
// "Signup (Split)" canvas (addSignupCardBlock).
const SIGNUP_BLOCKS: BlockManifestEntry[] = [
  {
    id: "signup-01",
    family: "signup",
    node: { kind: "canvas", name: "Signup" },
    description:
      "A centered signup card with full-name, email, and password + confirm-password fields, each with a description line.",
  },
  {
    id: "signup-02",
    family: "signup",
    node: { kind: "canvas", name: "Signup (Two Column)" },
    description:
      "A two-column signup: a centered create-account form with a brand lockup beside a muted cover image panel.",
  },
  {
    id: "signup-03",
    family: "signup",
    node: { kind: "canvas", name: "Signup (Card)" },
    description:
      "A signup card with name + email fields and a two-up password / confirm-password grid, with a terms note below.",
  },
  {
    id: "signup-04",
    family: "signup",
    node: { kind: "canvas", name: "Signup (Split)" },
    description:
      "A wide split card: a padded signup form beside a muted cover panel, with a 3-up grid of social icon buttons.",
  },
  {
    id: "signup-05",
    family: "signup",
    node: { kind: "canvas", name: "Signup (Email)" },
    description:
      "A compact logo-led signup: a stacked brand mark over a single email field, a submit, and two social buttons.",
  },
];

// The dashboard block.
const DASHBOARD_BLOCKS: BlockManifestEntry[] = [
  {
    id: "dashboard-01",
    family: "dashboard",
    node: { kind: "canvas", name: "Dashboard" },
    description:
      "An inset-sidebar app shell: a site header, four KPI section cards, an interactive area chart, and a data table with a tabs toolbar.",
  },
];

// The sixteen sidebar layouts, realized as variants of the "Sidebar" component
// set (Variant=sidebar-01 … Variant=sidebar-16).
const SIDEBAR_DESCRIPTIONS: Record<string, string> = {
  "sidebar-01":
    "A docs sidebar with a version switcher + search header and a SidebarGroup per section.",
  "sidebar-02": "A docs sidebar with collapsible groups (chevron labels).",
  "sidebar-03": "A sidebar with a single group of nested collapsible submenus.",
  "sidebar-04": "A floating-variant sidebar with nested submenus.",
  "sidebar-05":
    "A collapsible-menu sidebar with plus/minus expand toggles and search.",
  "sidebar-06":
    "A sidebar with dropdown nav and a newsletter opt-in footer card.",
  "sidebar-07":
    "A team-switcher sidebar with a collapsible Platform nav, projects, and a user footer.",
  "sidebar-08":
    "An inset-variant sidebar with Platform nav, projects, a secondary group, and a user footer.",
  "sidebar-09":
    "A dual-pane mail sidebar: a narrow icon rail beside a mail list.",
  "sidebar-10":
    "A Notion-style sidebar with a team switcher, main nav, favorites, and workspaces.",
  "sidebar-11":
    "A file-explorer sidebar with a Changes group and a Files tree.",
  "sidebar-12":
    "A calendar sidebar with a user header, a mini month grid, and calendar groups.",
  "sidebar-13": "A settings-dialog nav rail with a single flat icon menu.",
  "sidebar-14": "A right-side sidebar holding a Table of Contents tree.",
  "sidebar-15":
    "A Notion-style left rail (the left member of the dual-sidebar page).",
  "sidebar-16":
    "A header-anchored sidebar (top border) with Platform nav, projects, and a user footer.",
};

const SIDEBAR_BLOCKS: BlockManifestEntry[] = Array.from(
  { length: 16 },
  (_, i) => {
    const key = `sidebar-${String(i + 1).padStart(2, "0")}`;
    return {
      id: key,
      family: "sidebar" as const,
      node: { kind: "sidebar-variant" as const, key },
      description: SIDEBAR_DESCRIPTIONS[key] ?? "",
    };
  },
);

// The full set of in-scope blocks Niram reproduces (27 total).
export const BLOCK_MANIFEST: BlockManifestEntry[] = [
  ...LOGIN_BLOCKS,
  ...SIGNUP_BLOCKS,
  ...SIDEBAR_BLOCKS,
  ...DASHBOARD_BLOCKS,
];

// All supported registry ids, in manifest order.
export const SUPPORTED_BLOCK_IDS: string[] = BLOCK_MANIFEST.map((b) => b.id);

// The canvas frame names every standalone block renders (login/signup/dashboard).
export const BLOCK_CANVAS_NAMES: string[] = BLOCK_MANIFEST.filter(
  (b) => b.node.kind === "canvas",
).map((b) => (b.node as { kind: "canvas"; name: string }).name);

// The sidebar variant keys (Variant=<key>) the "Sidebar" component set ships.
export const SIDEBAR_VARIANT_KEYS: string[] = BLOCK_MANIFEST.filter(
  (b) => b.node.kind === "sidebar-variant",
).map((b) => (b.node as { kind: "sidebar-variant"; key: string }).key);

// Look up a manifest entry by registry id.
export function blockById(id: string): BlockManifestEntry | undefined {
  return BLOCK_MANIFEST.find((b) => b.id === id);
}
