// Sample data for the 16 Sidebar block variants, transcribed from shadcn's
// apps/v4/registry/new-york-v4/blocks/sidebar-01 … sidebar-16. Icon references
// use lucide names (the curated subset bundled in src/data/icons.ts); a couple
// map to the nearest bundled lucide glyph (square-terminal → terminal-square,
// audio-waveform → audio-lines). shadcn's emoji glyphs (favorites / workspaces)
// are rendered as lucide icons instead, since bundling emoji would force an
// unloaded fallback font and break the idempotent re-run binding sweep.

export type SubItem = { title: string; active?: boolean };
export type NavGroup = { title: string; active?: boolean; items: SubItem[] };

// The "docs" nav shared by sidebar-01/02/03/04/05/06/14. "Data Fetching" is the
// active leaf.
export const DOCS_NAV: NavGroup[] = [
  {
    title: "Getting Started",
    items: [{ title: "Installation" }, { title: "Project Structure" }],
  },
  {
    title: "Build Your Application",
    items: [
      { title: "Routing" },
      { title: "Data Fetching", active: true },
      { title: "Rendering" },
      { title: "Caching" },
      { title: "Styling" },
      { title: "Optimizing" },
      { title: "Configuring" },
      { title: "Testing" },
      { title: "Authentication" },
      { title: "Deploying" },
      { title: "Upgrading" },
      { title: "Examples" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { title: "Components" },
      { title: "File Conventions" },
      { title: "Functions" },
      { title: "next.config.js Options" },
      { title: "CLI" },
      { title: "Edge Runtime" },
    ],
  },
  {
    title: "Architecture",
    items: [
      { title: "Accessibility" },
      { title: "Fast Refresh" },
      { title: "Next.js Compiler" },
      { title: "Supported Browsers" },
      { title: "Turbopack" },
    ],
  },
  {
    title: "Community",
    items: [{ title: "Contribution Guide" }],
  },
];

export const DOCS_VERSIONS = ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"];

// The "Platform" nav shared by sidebar-07/08/16 (icon + collapsible).
export type PlatformItem = {
  title: string;
  icon: string;
  active?: boolean;
  items: string[];
};
export const PLATFORM_NAV: PlatformItem[] = [
  {
    title: "Playground",
    icon: "terminal-square",
    active: true,
    items: ["History", "Starred", "Settings"],
  },
  { title: "Models", icon: "bot", items: ["Genesis", "Explorer", "Quantum"] },
  {
    title: "Documentation",
    icon: "book-open",
    items: ["Introduction", "Get Started", "Tutorials", "Changelog"],
  },
  {
    title: "Settings",
    icon: "settings-2",
    items: ["General", "Team", "Billing", "Limits"],
  },
];

export const PROJECTS = [
  { name: "Design Engineering", icon: "frame" },
  { name: "Sales & Marketing", icon: "pie-chart" },
  { name: "Travel", icon: "map" },
];

export const NAV_SECONDARY = [
  { title: "Support", icon: "life-buoy" },
  { title: "Feedback", icon: "send" },
];

export const USER = { name: "shadcn", email: "m@example.com" };

// sidebar-09 mail nav + messages.
export const MAIL_NAV = [
  { title: "Inbox", icon: "inbox", active: true },
  { title: "Drafts", icon: "file" },
  { title: "Sent", icon: "send" },
  { title: "Junk", icon: "archive-x" },
  { title: "Trash", icon: "trash-2" },
];

export const MAILS = [
  { name: "William Smith", date: "09:34 AM", subject: "Meeting Tomorrow" },
  { name: "Alice Smith", date: "Yesterday", subject: "Re: Project Update" },
  { name: "Bob Johnson", date: "2 days ago", subject: "Weekend Plans" },
  {
    name: "Emily Davis",
    date: "2 days ago",
    subject: "Re: Question about Budget",
  },
  {
    name: "Michael Wilson",
    date: "1 week ago",
    subject: "Important Announcement",
  },
  {
    name: "Sarah Brown",
    date: "1 week ago",
    subject: "Re: Feedback on Proposal",
  },
  { name: "David Lee", date: "1 week ago", subject: "New Project Idea" },
  { name: "Olivia Wilson", date: "1 week ago", subject: "Vacation Plans" },
];

// sidebar-10 / sidebar-15 favorites + workspaces (emoji → lucide icon).
export const NAV_MAIN_NOTION = [
  { title: "Search", icon: "search" },
  { title: "Ask AI", icon: "sparkles" },
  { title: "Home", icon: "home", active: true },
  { title: "Inbox", icon: "inbox", badge: "10" },
];

export const NOTION_SECONDARY = [
  { title: "Calendar", icon: "calendar" },
  { title: "Settings", icon: "settings-2" },
  { title: "Templates", icon: "blocks" },
  { title: "Trash", icon: "trash-2" },
  { title: "Help", icon: "message-circle-question" },
];

export const FAVORITES = [
  "Project Management & Task Tracking",
  "Family Recipe Collection & Meal Planning",
  "Fitness Tracker & Workout Routines",
  "Book Notes & Reading List",
  "Sustainable Gardening Tips & Plant Care",
  "Language Learning Progress & Resources",
];

export const WORKSPACES = [
  "Personal Life Management",
  "Professional Development",
  "Creative Projects",
  "Home Management",
  "Travel & Adventure",
];

// sidebar-11 changes + file tree.
export const CHANGES = [
  { file: "README.md", state: "M" },
  { file: "api/hello/route.ts", state: "U" },
  { file: "app/layout.tsx", state: "M" },
];

export const FILE_TREE: {
  name: string;
  folder?: boolean;
  depth: number;
  active?: boolean;
}[] = [
  { name: "app", folder: true, depth: 0 },
  { name: "api", folder: true, depth: 1 },
  { name: "components", folder: true, depth: 0 },
  { name: "ui", folder: true, depth: 1 },
  { name: "button.tsx", depth: 2, active: true },
  { name: "card.tsx", depth: 2 },
  { name: "header.tsx", depth: 1 },
  { name: "footer.tsx", depth: 1 },
  { name: "lib", folder: true, depth: 0 },
  { name: "package.json", depth: 0 },
  { name: "README.md", depth: 0 },
];

// sidebar-12 / sidebar-15 calendars.
export const CALENDARS = [
  { name: "My Calendars", items: ["Personal", "Work", "Family"] },
  { name: "Favorites", items: ["Holidays", "Birthdays"] },
  { name: "Other", items: ["Travel", "Reminders", "Deadlines"] },
];

// sidebar-13 settings dialog nav. "Messages & media" is active.
export const SETTINGS_NAV = [
  { title: "Notifications", icon: "bell" },
  { title: "Navigation", icon: "menu" },
  { title: "Home", icon: "home" },
  { title: "Appearance", icon: "paintbrush" },
  { title: "Messages & media", icon: "message-circle", active: true },
  { title: "Language & region", icon: "globe" },
  { title: "Accessibility", icon: "keyboard" },
  { title: "Mark as read", icon: "check" },
  { title: "Audio & video", icon: "video" },
  { title: "Connected accounts", icon: "link" },
  { title: "Privacy & visibility", icon: "lock" },
  { title: "Advanced", icon: "settings" },
];
