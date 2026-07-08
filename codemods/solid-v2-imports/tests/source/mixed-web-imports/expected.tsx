import hydrate, { render, HydrationScript } from "@solidjs/web";
import * as web from "@solidjs/web";

hydrate(() => <HydrationScript />, document);
render(() => <main />, document.body);
web.render(() => <aside />, document.body);
