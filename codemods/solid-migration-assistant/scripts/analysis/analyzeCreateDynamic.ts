import { analyzeCreateDynamic } from "../../rules/analysis/reactivity/create-dynamic/create-dynamic.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeCreateDynamic);
