import type { JSX } from "solid-js";

interface Props<T extends HTMLElement> {
	onFocus: JSX.FocusEventHandlerUnion<T, FocusEvent>;
	onBlur?: JSX.FocusEventHandlerUnion<T, FocusEvent>;
	onChange?: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event>;
}

declare const local: Props<HTMLInputElement>;

const onFocus: JSX.FocusEventHandlerUnion<HTMLInputElement, FocusEvent> = (event) => {
	event.currentTarget.focus();
};

const notSolid: Other.FocusEventHandlerUnion<HTMLInputElement, FocusEvent> = local.onFocus;
