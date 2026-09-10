import { analyzeProduce } from "../../rules/analysis/store/produce/produce.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeProduce);
