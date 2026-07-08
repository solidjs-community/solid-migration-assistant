function __solid2ClassName(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(__solid2ClassName).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => !!enabled)
      .map(([name]) => name)
      .join(" ");
  }
  return "";
}

export function Link(props, rest) {
  return <a class={__solid2ClassName({ ...(props.class && { [props.class as string]: true }), ...(rest as any).classList, active: isActive() })} />;
}
