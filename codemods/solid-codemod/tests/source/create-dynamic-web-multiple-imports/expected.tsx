import { For, mergeProps } from "@solidjs/web";
import { createComponent } from "solid-js";
import { Dynamic, dynamic } from "@solidjs/web";
import * as SolidWeb from "@solidjs/web";

const direct = createComponent(dynamic(source), props);
const alias = createComponent(dynamic(aliasSource), aliasProps);
const namespace = createComponent(SolidWeb.dynamic(nsSource), nsProps);

export const view = <><Dynamic component={Comp} /><For each={items}>{item => item}</For>{direct}{alias}{namespace}{mergeProps({})}</>;
