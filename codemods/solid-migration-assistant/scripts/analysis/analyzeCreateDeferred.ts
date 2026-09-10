import { analyzeCreateDeferred } from "../../rules/analysis/reactivity/transition-apis/transition-apis.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeCreateDeferred);
