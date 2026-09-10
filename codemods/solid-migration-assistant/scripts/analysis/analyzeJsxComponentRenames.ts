import { analyzeJsxComponentRenames } from "../../rules/analysis/jsx/component-renames/component-renames.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeJsxComponentRenames);
