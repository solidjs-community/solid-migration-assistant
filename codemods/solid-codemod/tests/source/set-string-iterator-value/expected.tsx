// TODO(solid-2): Review semantic migration sites in this file: createMemo.
import { createMemo } from "solid-js";

export function createSingleSelectListState(props: { onSelectionChange?: (key: string) => void }) {
	const selectedKey = createMemo(() => "first");
	const setSelectedKey = (key: string) => key;

	return {
		onSelectionChange: (keys: Set<string>) => {
			const key = (keys as Set<string>).values().next().value as string;

			if (key === selectedKey()) {
				props.onSelectionChange?.(key);
			}

			setSelectedKey(key);
		},
	};
}

export function leaveOtherIterators(keys: Set<number>) {
	const key = (keys as Set<number>).values().next().value;
	return key;
}
