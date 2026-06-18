export type Block = {
  name: string
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
      { name: "Login" },
      { name: "Sign Up" },
      { name: "Forgot Password" },
      { name: "OTP Verification" },
    ],
  },
  {
    slug: "settings",
    title: "Settings",
    description:
      "Account, profile, and preference screens for managing a workspace.",
    blocks: [
      { name: "Profile" },
      { name: "Account" },
      { name: "Appearance" },
      { name: "Notifications" },
      { name: "Billing" },
    ],
  },
  {
    slug: "cards",
    title: "Cards",
    description: "Self-contained card layouts for forms, lists, and actions.",
    blocks: [
      { name: "Payment Method" },
      { name: "Create Account" },
      { name: "Team Members" },
      { name: "Report Issue" },
    ],
  },
]

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
