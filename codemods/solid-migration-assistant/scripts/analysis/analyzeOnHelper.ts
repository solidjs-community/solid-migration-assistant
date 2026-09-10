import { analyzeOnHelper } from "../../rules/analysis/reactivity/on-helper/on-helper.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeOnHelper);
