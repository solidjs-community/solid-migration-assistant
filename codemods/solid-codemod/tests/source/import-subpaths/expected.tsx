import html from "@solidjs/html";
import { createRenderer } from "@solidjs/universal";
import { jsx } from "@solidjs/web/jsx-runtime";
import { jsxDEV } from "@solidjs/web/jsx-dev-runtime";
import h from "@solidjs/h";

export const view = html`<p>Hello</p>`;
export const renderer = createRenderer({});
export const vnode = jsx("span", { children: "Hi" });
export const devNode = jsxDEV("span", { children: "Hi" }, undefined, false, undefined, this);
export const factory = h("div", null);
