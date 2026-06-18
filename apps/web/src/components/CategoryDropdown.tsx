import { ChevronDown } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { categorySummaries } from "@/lib/blocks"

export function CategoryDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Categories
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Browse categories</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {categorySummaries.map((category) => (
          <DropdownMenuItem key={category.slug} asChild>
            <Link to="/category/$slug" params={{ slug: category.slug }}>
              <span>{category.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {category.count}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CategoryDropdown
