import { analyzeObservable } from "../../rules/analysis/reactivity/from-observable/from-observable.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeObservable);
