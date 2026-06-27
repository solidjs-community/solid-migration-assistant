import type { JSX } from "@solidjs/web";

interface Props<T extends HTMLElement> {
	onFocus: JSX.EventHandlerUnion<T, FocusEvent>;
	onBlur?: JSX.EventHandlerUnion<T, FocusEvent>;
	onChange?: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event>;
}

declare const local: Props<HTMLInputElement>;

const onFocus: JSX.EventHandlerUnion<HTMLInputElement, FocusEvent> = (event) => {
	event.currentTarget.focus();
};

const notSolid: Other.FocusEventHandlerUnion<HTMLInputElement, FocusEvent> = local.onFocus;
