import { analyzeIndexArray } from "../../rules/analysis/reactivity/index-array/index-array.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeIndexArray);
