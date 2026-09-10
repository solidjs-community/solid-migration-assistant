import { analyzeCreateComputed } from "../../rules/analysis/reactivity/create-computed/create-computed.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeCreateComputed);
