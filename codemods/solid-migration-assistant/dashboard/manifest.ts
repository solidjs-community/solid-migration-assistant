import { createRuleManifest } from "../shared/report.ts";
import { componentRenamesSlice } from "../rules/analysis/jsx/component-renames/ui.tsx";
import { createEffectSlice } from "../rules/analysis/reactivity/create-effect/ui.tsx";
import { legacySubpathRelocationSlice } from "../rules/transformations/imports/legacy-subpath-relocation/ui.tsx";
import { webImportSlice } from "../rules/analysis/imports/web-import/ui.tsx";

export const ruleManifest = createRuleManifest([webImportSlice, componentRenamesSlice, createEffectSlice, legacySubpathRelocationSlice]);
