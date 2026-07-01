import type { RegistrySource } from "@/lib/registry"

export type Block = {
  slug: string
  title: string
  description: string
  source: RegistrySource
  reference?: RegistrySource
  tags: string[]
}

export type Category = {
  slug: string
  title: string
  description: string
  blocks: Block[]
}

export const categories: Category[] = [
  {
    slug: "auth",
    title: "Authentication",
    description:
      "Sign-in, sign-up, and recovery flows built from shadcn primitives.",
    blocks: [
      {
        slug: "login-workspace",
        title: "Workspace Login",
        description: "A focused email/password login card for SaaS teams.",
        source: github("login-workspace"),
        reference: shadcn("login-01"),
        tags: ["auth", "workspace", "email"],
      },
      {
        slug: "signup-team",
        title: "Team Signup",
        description: "A compact signup flow with workspace context.",
        source: github("signup-team"),
        reference: shadcn("signup-05"),
        tags: ["auth", "onboarding", "team"],
      },
      {
        slug: "password-recovery",
        title: "Password Recovery",
        description: "A direct reset request block with support fallback.",
        source: github("password-recovery"),
        tags: ["auth", "recovery", "support"],
      },
      {
        slug: "invite-acceptance",
        title: "Invite Acceptance",
        description: "A join-workspace screen for invited teammates.",
        source: github("invite-acceptance"),
        tags: ["auth", "invite", "team"],
      },
    ],
  },
  {
    slug: "settings",
    title: "Settings",
    description:
      "Account, profile, and preference screens for managing a workspace.",
    blocks: [
      {
        slug: "profile-settings",
        title: "Profile Settings",
        description: "A durable account identity panel with save action.",
        source: github("profile-settings"),
        tags: ["settings", "profile", "account"],
      },
      {
        slug: "team-settings",
        title: "Team Settings",
        description: "A simple team identity and member invitation block.",
        source: github("team-settings"),
        tags: ["settings", "team", "members"],
      },
      {
        slug: "notification-settings",
        title: "Notification Settings",
        description: "A preference block for operational email updates.",
        source: github("notification-settings"),
        tags: ["settings", "notifications", "email"],
      },
      {
        slug: "billing-settings",
        title: "Billing Settings",
        description: "A plan and invoice summary block for SaaS billing.",
        source: github("billing-settings"),
        tags: ["settings", "billing", "plan"],
      },
    ],
  },
  {
    slug: "cards",
    title: "Cards",
    description: "Self-contained card layouts for forms, lists, and actions.",
    blocks: [
      {
        slug: "metric-card",
        title: "Metric Card",
        description: "A concise KPI card with label, value, and context.",
        source: github("metric-card"),
        tags: ["card", "metric", "dashboard"],
      },
      {
        slug: "payment-method-card",
        title: "Payment Method",
        description: "A saved-payment card with expiry and update action.",
        source: github("payment-method-card"),
        tags: ["card", "billing", "payment"],
      },
      {
        slug: "team-member-card",
        title: "Team Member",
        description: "A member summary card with role and contact details.",
        source: github("team-member-card"),
        tags: ["card", "team", "profile"],
      },
      {
        slug: "support-ticket-card",
        title: "Support Ticket",
        description: "A compact issue status card for customer support.",
        source: github("support-ticket-card"),
        tags: ["card", "support", "status"],
      },
    ],
  },
]

function github(item: string): RegistrySource {
  return {
    type: "github",
    owner: "praveenjuge",
    repo: "niram",
    item,
  }
}

function shadcn(item: string): RegistrySource {
  return {
    type: "official",
    item,
  }
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug)
}

export type CategorySummary = {
  slug: string
  title: string
  count: number
}

export const categorySummaries: CategorySummary[] = categories.map(
  (category) => ({
    slug: category.slug,
    title: category.title,
    count: category.blocks.length,
  })
)
