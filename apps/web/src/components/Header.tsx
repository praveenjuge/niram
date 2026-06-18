import { Search } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { Input } from "@/components/ui/input"
import { CategoryDropdown } from "@/components/CategoryDropdown"

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link
          to="/"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Niram
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search blocks…"
              aria-label="Search blocks"
              readOnly
              className="w-56 pl-8"
            />
          </div>
          <CategoryDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header
