import { analyzeCreateSelector } from "../../rules/analysis/reactivity/create-selector/create-selector.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeCreateSelector);
