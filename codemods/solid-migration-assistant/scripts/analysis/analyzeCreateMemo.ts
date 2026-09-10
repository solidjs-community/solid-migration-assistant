import { analyzeCreateMemo } from "../../rules/analysis/reactivity/create-memo/create-memo.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeCreateMemo);
