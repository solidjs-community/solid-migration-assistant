import { For, mergeProps } from "solid-js/web";
import { Dynamic, createDynamic, createDynamic as makeDynamic } from "solid-js/web";
import * as SolidWeb from "solid-js/web";

const direct = createDynamic(source, props);
const alias = makeDynamic(aliasSource, aliasProps);
const namespace = SolidWeb.createDynamic(nsSource, nsProps);

export const view = <><Dynamic component={Comp} /><For each={items}>{item => item}</For>{direct}{alias}{namespace}{mergeProps({})}</>;
