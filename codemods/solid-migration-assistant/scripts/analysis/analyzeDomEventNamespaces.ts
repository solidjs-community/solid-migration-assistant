import { analyzeDomEventNamespaces } from "../../rules/analysis/jsx/dom-event-namespaces/dom-event-namespaces.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeDomEventNamespaces);
