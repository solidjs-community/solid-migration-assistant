import { createEffect, onCleanup } from "solid-js";

function Widget() {
	createEffect(() => {
		start();
		onCleanup(() => stopReactive());
	});

	onCleanup(() => stopWidget());
	return null;
}
