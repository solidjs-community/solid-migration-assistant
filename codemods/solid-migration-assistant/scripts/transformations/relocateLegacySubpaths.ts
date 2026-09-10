import { relocateLegacySubpaths } from "../../rules/transformations/imports/legacy-subpath-relocation/legacy-subpath-relocation.ts";
import { createTransformEntrypoint } from "../../shared/entrypoint.ts";

export default createTransformEntrypoint(relocateLegacySubpaths);
