import { omit } from "solid-js";

const rest = omit(props, "class", "style");
