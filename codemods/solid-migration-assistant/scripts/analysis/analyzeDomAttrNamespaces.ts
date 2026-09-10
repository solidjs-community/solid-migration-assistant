import { analyzeDomAttrNamespaces } from "../../rules/analysis/jsx/dom-attr-namespaces/dom-attr-namespaces.ts";
import { createAnalysisEntrypoint } from "../../shared/entrypoint.ts";

export default createAnalysisEntrypoint(analyzeDomAttrNamespaces);
