import { analyzeOnMount } from "../../rules/analysis/lifecycle/on-mount/on-mount.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeOnMount);
