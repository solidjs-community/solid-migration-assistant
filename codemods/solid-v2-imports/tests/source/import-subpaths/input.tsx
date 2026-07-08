import html from "solid-js/html";
import { createRenderer } from "solid-js/universal";
import { jsx } from "solid-js/jsx-runtime";
import { jsxDEV } from "solid-js/jsx-dev-runtime";
import h from "solid-js/h";

export const view = html`<p>Hello</p>`;
export const renderer = createRenderer({});
export const vnode = jsx("span", { children: "Hi" });
export const devNode = jsxDEV("span", { children: "Hi" }, undefined, false, undefined, this);
export const factory = h("div", null);
