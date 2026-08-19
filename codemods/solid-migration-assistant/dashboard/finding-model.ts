export const FINDINGS_PER_PAGE = 100;

export function normalizeRelativeFilename(filename: string): string {
  return filename.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

export function formatFindingLocation(filename: string, line: number, column: number): string {
  return `${normalizeRelativeFilename(filename)}:${line}:${column}`;
}

export type EditorTarget = {
  readonly analyzedTargetRoot: string;
  readonly filename: string;
  readonly line: number;
  readonly column: number;
};

export type EditorAction = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
};

export function createEditorActions(target: EditorTarget): readonly EditorAction[] {
  return [{ id: "vscode", label: "Visual Studio Code", href: createVsCodeFileUri(target) }];
}

export function createVsCodeFileUri(target: EditorTarget): string {
  const root = target.analyzedTargetRoot.replaceAll("\\", "/").replace(/\/$/, "");
  const relative = normalizeRelativeFilename(target.filename).replace(/^\//, "");
  const absolutePath = `${root}/${relative}`;
  const encodedPath = absolutePath
    .split("/")
    .map((segment) => encodeURIComponent(segment).replaceAll("%3A", ":"))
    .join("/");
  return `vscode://file/${encodedPath}:${target.line}:${target.column}`;
}

export type FilterableFinding = {
  readonly filename: string;
};

export function filterFindings<TFinding extends FilterableFinding>(
  findings: readonly TFinding[],
  filenameFilter: string,
): readonly TFinding[] {
  const query = filenameFilter.trim().toLocaleLowerCase();
  if (!query) return findings;
  return findings.filter((finding) =>
    finding.filename.toLocaleLowerCase().includes(query),
  );
}

export function paginateFindings<TFinding>(
  findings: readonly TFinding[],
  requestedPage: number,
  pageSize = FINDINGS_PER_PAGE,
): {
  readonly items: readonly TFinding[];
  readonly page: number;
  readonly pageCount: number;
} {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new Error("Finding page size must be a positive integer.");
  }
  const pageCount = Math.max(1, Math.ceil(findings.length / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), pageCount);
  const start = (page - 1) * pageSize;
  return { items: findings.slice(start, start + pageSize), page, pageCount };
}
