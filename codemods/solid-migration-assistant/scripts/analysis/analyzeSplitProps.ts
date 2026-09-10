import { analyzeSplitProps } from "../../rules/analysis/props/split-props/split-props.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeSplitProps);
