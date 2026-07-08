import { createSignal } from "solid-js";

export interface CreateControllableSignalProps<T> {
	defaultValue?: () => T | undefined;
}

export function createControllableSignal<T>(props: CreateControllableSignalProps<T>) {
	const [_value, _setValue] = createSignal(props.defaultValue?.());
	const [alreadyTyped] = createSignal<T | undefined>(props.defaultValue?.());
	const [alreadyAsserted] = createSignal(props.defaultValue?.() as Exclude<T, Function> | undefined);
	return [_value, _setValue, alreadyTyped, alreadyAsserted] as const;
}

export function createConcreteSignal(props: { defaultValue?: () => string | undefined }) {
	const [value] = createSignal(props.defaultValue?.());
	return value;
}
