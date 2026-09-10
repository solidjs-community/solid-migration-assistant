import { analyzeDomUseDirective } from "../../rules/analysis/jsx/dom-use-directive/dom-use-directive.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeDomUseDirective);
