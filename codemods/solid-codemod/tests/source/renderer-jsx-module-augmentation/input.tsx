import type { JSX } from "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface AnchorHTMLAttributes<T> {
      state?: string;
    }
  }
}

export type AnchorProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement>;
