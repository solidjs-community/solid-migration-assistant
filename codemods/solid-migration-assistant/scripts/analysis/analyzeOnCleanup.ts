import { analyzeOnCleanup } from "../../rules/analysis/lifecycle/on-cleanup/on-cleanup.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeOnCleanup);
