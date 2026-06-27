export const view = (
	<>
		<input readonly={form.isReadOnly()} />
		<textarea readonly />
		<CustomInput readOnly={value()} />
	</>
);
