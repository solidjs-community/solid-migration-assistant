import { mergeProps, type MergeProps } from "solid-js";

type Props = { id?: string };

export function combineProps<T extends Props[]>(...sources: T): MergeProps<T> {
  const merge = mergeProps(...sources) as MergeProps<T>;
  return merge;
}
