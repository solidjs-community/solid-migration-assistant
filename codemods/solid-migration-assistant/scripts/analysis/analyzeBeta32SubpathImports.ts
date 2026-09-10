import { analyzeBeta32SubpathImports } from "../../rules/analysis/imports/beta32-subpaths/beta32-subpaths.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeBeta32SubpathImports);
