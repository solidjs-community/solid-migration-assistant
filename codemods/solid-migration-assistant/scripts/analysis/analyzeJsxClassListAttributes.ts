import { analyzeJsxClassListAttributes } from "../../rules/analysis/jsx/class-list/class-list.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeJsxClassListAttributes);
