import { splitProps } from "solid-js";

const [local, rest] = splitProps(props, ["href"]);
forwardProps(local);
render(rest);
