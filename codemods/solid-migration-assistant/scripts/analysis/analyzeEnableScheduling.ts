import { analyzeEnableScheduling } from "../../rules/analysis/reactivity/utility-renames/utility-renames.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeEnableScheduling);
