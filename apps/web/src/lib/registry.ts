export type RegistrySource =
  | {
      type: "official"
      item: string
    }
  | {
      type: "github"
      owner: string
      repo: string
      item: string
      ref?: string
    }

const segmentPattern = /^[a-zA-Z0-9._-]+$/

export function getRegistryAddress(source: RegistrySource): string {
  if (source.type === "official") {
    return `@shadcn/${source.item}`
  }

  const ref = source.ref ? `#${source.ref}` : ""
  return `${source.owner}/${source.repo}/${source.item}${ref}`
}

export function getRegistryLabel(source: RegistrySource): string {
  if (source.type === "official") {
    return "Official shadcn"
  }

  return "GitHub registry"
}

export function getInstallCommand(source: RegistrySource): string {
  return `bunx --bun shadcn@latest add ${getRegistryAddress(source)}`
}

export function isValidRegistrySource(source: RegistrySource): boolean {
  if (source.type === "official") {
    return segmentPattern.test(source.item)
  }

  return [source.owner, source.repo, source.item].every((segment) =>
    segmentPattern.test(segment)
  )
}
