import { analyzeMergeProps } from "../../rules/analysis/props/merge-props/merge-props.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeMergeProps);
