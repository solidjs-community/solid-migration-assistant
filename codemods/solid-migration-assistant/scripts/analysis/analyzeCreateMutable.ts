import { analyzeCreateMutable } from "../../rules/analysis/store/mutable/mutable.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeCreateMutable);
