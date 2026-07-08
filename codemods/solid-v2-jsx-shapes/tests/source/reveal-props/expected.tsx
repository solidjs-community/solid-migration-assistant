import { Reveal, Loading } from "solid-js";

export function Loader() {
  return <Reveal order="together" collapsed><Loading fallback="loading">ready</Loading></Reveal>;
}
