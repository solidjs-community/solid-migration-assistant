import { createMemo } from "solid-js";

const origin = new URL("https://example.com");
const url = createMemo<URL>((prev = origin) => {
    try {
      return new URL(path(), origin);
    } catch {
      return prev;
    }
  }, {
    equals: (a, b) => a.href === b.href
  });
