import { analyzeContextProvider } from "../../rules/analysis/jsx/context-provider/context-provider.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeContextProvider);
