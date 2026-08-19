export const FINDINGS_PER_PAGE = 100;

export function formatFindingLocation(
  filename: string,
  line: number,
  column: number,
): string {
  const normalizedFilename = filename.replaceAll("\\", "/").replace(/^\.\/+/, "");
  return `${normalizedFilename}:${line}:${column}`;
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
