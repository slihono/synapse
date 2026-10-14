export function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-z]+)\}/g, (placeholder, name: string) => values[name] ?? placeholder)
}
