export const view = (
	<>
		<div tabindex={0} />
		<input tabindex={-1} />
		<svg tabindex={-1}><g /></svg>
		<FocusTrap tabIndex={0} />
		<Dialog.Content tabIndex={-1} />
	</>
);
