import { analyzeUnwrap } from "../../rules/analysis/store/unwrap/unwrap.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeUnwrap);
