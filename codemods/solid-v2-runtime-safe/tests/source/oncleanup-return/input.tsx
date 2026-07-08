import { createEffect, on, onCleanup } from "solid-js";

createEffect(() => onCleanup(register(id())));

createEffect(
	on(source, (value) => {
		start(value);
		onCleanup(() => stop(value));
	}),
);
