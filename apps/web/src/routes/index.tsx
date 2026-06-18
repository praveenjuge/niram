import { createFileRoute, Link } from "@tanstack/react-router"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { categories } from "@/lib/blocks"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6">
      <section className="flex flex-col items-center gap-6 py-20 text-center">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Evergreen shadcn blocks designed by @praveenjuge
        </h1>
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search blocks…"
            aria-label="Search blocks"
            readOnly
            className="h-12 w-full pl-11 text-base"
          />
        </div>
      </section>

      <section className="pb-24">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Browse by category
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="group block"
            >
              <Card className="h-full transition-colors group-hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                  <CardDescription className="mt-1 text-xs">
                    {category.blocks.length} blocks
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
