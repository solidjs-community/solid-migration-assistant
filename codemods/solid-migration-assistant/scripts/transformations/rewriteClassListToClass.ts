import { rewriteClassListToClass } from "../../rules/transformations/jsx/class-list-to-class/class-list-to-class.ts";
import { createTransformEntrypoint } from "../../shared/entrypoint.ts";

export default createTransformEntrypoint(rewriteClassListToClass);
