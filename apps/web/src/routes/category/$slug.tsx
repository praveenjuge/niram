import { createFileRoute, Link, notFound } from "@tanstack/react-router"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategoryBySlug } from "@/lib/blocks"

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
  loader: ({ params }) => {
    const category = getCategoryBySlug(params.slug)
    if (!category) {
      throw notFound()
    }
    return { category }
  },
})

function CategoryPage() {
  const { category } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <Link
        to="/"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All categories
      </Link>
      <header className="mt-4 mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          {category.title}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {category.description}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {category.blocks.map((block) => (
          <Card key={block.name}>
            <CardHeader>
              <CardTitle>{block.name}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </main>
  )
}
