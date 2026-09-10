import { relocateWebPackage } from "../../rules/transformations/imports/web-package-relocation/web-package-relocation.ts";
import { createTransformEntrypoint } from "../../shared/entrypoint.ts";

export default createTransformEntrypoint(relocateWebPackage);
