import { createFileRoute, Link, notFound } from "@tanstack/react-router"

import { BlockPreview } from "@/lib/block-previews"
import { getCategoryBySlug } from "@/lib/blocks"
import { getInstallCommand } from "@/lib/registry"

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
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <Link
        to="/"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All categories
      </Link>
      <header className="mt-4 mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {category.title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {category.description}
        </p>
      </header>
      <div className="flex flex-col gap-6">
        {category.blocks.map((block) => (
          <section key={block.slug} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium">{block.title}</h2>
              <code className="text-xs break-all text-muted-foreground">
                {getInstallCommand(block.source)}
              </code>
            </div>
            <div className="flex min-h-80 w-full items-center justify-center rounded-lg border bg-muted/30 p-6">
              <BlockPreview block={block} />
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
