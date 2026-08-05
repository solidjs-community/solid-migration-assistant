import * as fs from "fs";
import { basename, isAbsolute, relative, resolve, sep } from "path";

const runtimeFs = fs as typeof fs & {
  unlinkSync(path: string): void;
};

export function resolveReportDirectory(
  targetDirectory: string,
  configuredPath: string,
): string {
  const requested = configuredPath.trim();
  if (!requested) throw new Error("report_directory must not be empty");
  if (isAbsolute(requested)) {
    throw new Error("report_directory must be relative to the target directory");
  }

  const target = resolve(targetDirectory);
  const output = resolve(target, requested);
  const fromTarget = relative(target, output);
  if (
    fromTarget === ".." ||
    fromTarget.startsWith(`..${sep}`) ||
    isAbsolute(fromTarget)
  ) {
    throw new Error("report_directory must stay inside the target directory");
  }
  return output;
}

export function prepareReportDirectory(
  targetDirectory: string,
  configuredPath: string,
): string {
  const target = resolve(targetDirectory);
  const output = resolveReportDirectory(targetDirectory, configuredPath);
  assertNoSymlinkPath(target, output);
  fs.mkdirSync(output, { recursive: true });
  assertNoSymlinkPath(target, output);
  return output;
}

export function writeReportFile(
  outputDirectory: string,
  filename: string,
  contents: string,
): void {
  if (
    !filename ||
    filename === "." ||
    filename === ".." ||
    basename(filename) !== filename
  ) {
    throw new Error("report filename must be a plain filename");
  }

  const destination = resolve(outputDirectory, filename);
  try {
    runtimeFs.unlinkSync(destination);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  fs.writeFileSync(destination, contents);
}

function assertNoSymlinkPath(target: string, output: string): void {
  let current = target;
  const segments = relative(target, output).split(sep).filter(Boolean);

  for (const segment of segments) {
    const entry = existingEntry(current, segment);
    if (!entry) return;
    if (entry.isSymbolicLink()) {
      throw new Error("report_directory must not traverse a symbolic link");
    }
    current = resolve(current, segment);
  }
}

function existingEntry(
  directory: string,
  name: string,
): ReturnType<typeof fs.readdirSync>[number] | undefined {
  try {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .find((entry) => entry.name === name);
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
