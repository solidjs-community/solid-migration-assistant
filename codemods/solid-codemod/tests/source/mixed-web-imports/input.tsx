import hydrate, { render, HydrationScript } from "solid-js/web";
import * as web from "solid-js/web";

hydrate(() => <HydrationScript />, document);
render(() => <main />, document.body);
web.render(() => <aside />, document.body);
