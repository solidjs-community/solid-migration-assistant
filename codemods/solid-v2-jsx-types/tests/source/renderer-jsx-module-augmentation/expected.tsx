import type { JSX } from "@solidjs/web";

declare module "@solidjs/web" {
  namespace JSX {
    interface AnchorHTMLAttributes<T> {
      state?: string;
    }
  }
}

export type AnchorProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement>;
