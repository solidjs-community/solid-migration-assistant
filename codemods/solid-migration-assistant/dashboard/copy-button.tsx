import { createSignal, onCleanup } from "solid-js";

export function CopyButton(props: {
  readonly value: string;
  readonly idleLabel: string;
  readonly class?: string;
}) {
  const [status, setStatus] = createSignal<"idle" | "copied" | "failed">("idle");
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => { if (resetTimer !== undefined) clearTimeout(resetTimer); });

  async function copyValue() {
    try {
      await copyText(props.value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => setStatus("idle"), 1_500);
  }

  const label = () => status() === "copied" ? "Copied" : status() === "failed" ? "Copy failed" : props.idleLabel;
  return <button class={props.class} type="button" onClick={copyValue} aria-live="polite">{label()}</button>;
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Could not copy text.");
  }
}
