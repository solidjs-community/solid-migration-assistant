import type { JSX } from "@solidjs/web";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export const REPORT_SCHEMA_VERSION = 1 as const;
export const EMBEDDED_REPORT_ID = "solid-migration-report-data";

/** A single immutable run. History policy intentionally lives outside this seam. */
export type ReportEnvelope = {
  readonly schemaVersion: typeof REPORT_SCHEMA_VERSION;
  readonly reports: Readonly<Record<string, JsonValue>>;
};

export type RuleKind = "analysis" | "transformation";

export type RuleRendererProps<TReport extends JsonValue> = {
  readonly report: TReport;
};

export type RuleSliceDefinition<TReport extends JsonValue> = {
  readonly id: string;
  readonly route: string;
  readonly title: string;
  readonly kind: RuleKind;
  readonly parseReport: (payload: JsonValue) => TReport;
  readonly Summary: (props: RuleRendererProps<TReport>) => JSX.Element;
  readonly Detail: (props: RuleRendererProps<TReport>) => JSX.Element;
};

/**
 * The host-facing descriptor erases the rule payload type. Only this rule-owned
 * closure parses payload fields and invokes its typed renderers.
 */
export type RuleSliceDescriptor = {
  readonly id: string;
  readonly route: string;
  readonly title: string;
  readonly kind: RuleKind;
  readonly renderSummary: (payload: JsonValue) => JSX.Element;
  readonly renderDetail: (payload: JsonValue) => JSX.Element;
};

export function defineRuleSlice<TReport extends JsonValue>(
  definition: RuleSliceDefinition<TReport>,
): RuleSliceDescriptor {
  return Object.freeze({
    id: definition.id,
    route: definition.route,
    title: definition.title,
    kind: definition.kind,
    renderSummary: (payload: JsonValue) =>
      definition.Summary({ report: definition.parseReport(payload) }),
    renderDetail: (payload: JsonValue) =>
      definition.Detail({ report: definition.parseReport(payload) }),
  });
}

export function createRuleManifest(
  descriptors: readonly RuleSliceDescriptor[],
): readonly RuleSliceDescriptor[] {
  const ids = new Set<string>();
  const routes = new Set<string>();

  for (const descriptor of descriptors) {
    if (!descriptor.id || ids.has(descriptor.id)) {
      throw new Error(`Duplicate or empty rule id: ${descriptor.id || "(empty)"}`);
    }
    if (!isStableRoute(descriptor.route) || routes.has(descriptor.route)) {
      throw new Error(`Duplicate or invalid rule route: ${descriptor.route || "(empty)"}`);
    }
    ids.add(descriptor.id);
    routes.add(descriptor.route);
  }

  return Object.freeze([...descriptors]);
}

function isStableRoute(route: string): boolean {
  return /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(route);
}

export function serializeReportEnvelope(envelope: ReportEnvelope): string {
  assertReportEnvelope(envelope);
  const serialized = JSON.stringify(envelope);
  if (serialized === undefined) throw new Error("Report envelope is not serializable.");
  return serialized
    .replaceAll("&", "\u0026")
    .replaceAll("<", "\u003c")
    .replaceAll(">", "\u003e")
    .replaceAll(" ", "\u2028")
    .replaceAll(" ", "\u2029");
}

export type EmbeddedReportRoot = {
  readonly getElementById: (id: string) => {
    readonly tagName: string;
    readonly type: string;
    readonly textContent: string | null;
  } | null;
};

export function readEmbeddedReport(root: EmbeddedReportRoot): ReportEnvelope {
  const element = root.getElementById(EMBEDDED_REPORT_ID);
  if (!element || element.tagName.toLowerCase() !== "script") {
    throw new Error(`Missing embedded report script #${EMBEDDED_REPORT_ID}.`);
  }
  if (element.type !== "application/json") {
    throw new Error("Embedded report script must use type application/json.");
  }

  let value: unknown;
  try {
    value = JSON.parse(element.textContent ?? "");
  } catch (error) {
    throw new Error("Embedded report JSON is invalid.", { cause: error });
  }
  assertReportEnvelope(value);
  return value;
}

export function assertReportEnvelope(value: unknown): asserts value is ReportEnvelope {
  if (!isPlainObject(value) || value.schemaVersion !== REPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported report schema; expected version ${REPORT_SCHEMA_VERSION}.`);
  }
  if (!isPlainObject(value.reports)) {
    throw new Error("Report envelope must contain a reports object.");
  }
  for (const payload of Object.values(value.reports)) assertJsonValue(payload);
}

function assertJsonValue(value: unknown, seen = new Set<object>()): asserts value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object") throw new Error("Report payload contains a non-JSON value.");
  if (seen.has(value)) throw new Error("Report payload contains a circular reference.");

  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) assertJsonValue(item, seen);
  } else {
    if (!isPlainObject(value)) throw new Error("Report payload contains a non-plain object.");
    for (const item of Object.values(value)) assertJsonValue(item, seen);
  }
  seen.delete(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
