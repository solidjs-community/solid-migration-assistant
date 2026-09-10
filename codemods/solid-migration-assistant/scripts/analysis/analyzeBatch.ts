import { analyzeBatch } from "../../rules/analysis/reactivity/batch/batch.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeBatch);
