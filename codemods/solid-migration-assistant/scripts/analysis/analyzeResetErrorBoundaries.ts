import { analyzeResetErrorBoundaries } from "../../rules/analysis/reactivity/error-handling/error-handling.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeResetErrorBoundaries);
