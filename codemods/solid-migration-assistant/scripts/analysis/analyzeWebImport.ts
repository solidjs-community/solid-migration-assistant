import { analyzeWebImport } from "../../rules/analysis/imports/web-import/web-import.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeWebImport);
