// fixture: named-imports
import { render } from "solid-js/web";
import { hydrate, render as renderApp } from "solid-js/web";
import { hydrate as singleQuoted } from 'solid-js/web';
import { isServer } from "solid-js/web";
import type { render as RenderType } from "solid-js/web";
import { type isServer as IsServerType, hydrate as hydrateApp } from "solid-js/web";
import {
  isServer as onServer,
  render as renderIndented,
} from "solid-js/web";
import { render as duplicateOne, render as duplicateTwo } from "solid-js/web";

void render;
void hydrate;
void renderApp;
void singleQuoted;
void isServer;
void hydrateApp;
void onServer;
void renderIndented;
void duplicateOne;
void duplicateTwo;
type _RenderType = typeof RenderType;
type _IsServerType = IsServerType;
