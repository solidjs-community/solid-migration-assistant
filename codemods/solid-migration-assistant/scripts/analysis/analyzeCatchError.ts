import { analyzeCatchError } from "../../rules/analysis/reactivity/error-handling/error-handling.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeCatchError);
