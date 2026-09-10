import { analyzeCreateEffect } from "../../rules/analysis/reactivity/create-effect/create-effect.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeCreateEffect);
