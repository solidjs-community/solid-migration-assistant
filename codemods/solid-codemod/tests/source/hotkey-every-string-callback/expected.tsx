function ToastList(context: { hotkey(): string[] }, ref: HTMLElement) {
  createEffect(
    () => context.hotkey(),
    (hotkey) => {
      const onKeyDown = (event: KeyboardEvent) => {
        const isHotkeyPressed = hotkey.every(
          (key: string) => (event as any)[key] || event.code === key,
        );

        return isHotkeyPressed;
      };

      document.addEventListener("keydown", onKeyDown);
    },
  );
}

function IgnoreDifferentArray(items: Array<{ key: string }>) {
  return items.every((key) => key.key.length > 0);
}

function IgnoreAlreadyTyped(hotkey: string[], event: KeyboardEvent) {
  return hotkey.every((key: string) => event.code === key);
}
