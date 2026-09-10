import { analyzeCreateResource } from "../../rules/analysis/reactivity/create-resource/create-resource.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeCreateResource);
