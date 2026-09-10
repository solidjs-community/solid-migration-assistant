import { analyzeModifyMutable } from "../../rules/analysis/store/mutable/mutable.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeModifyMutable);
