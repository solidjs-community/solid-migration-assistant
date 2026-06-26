import { catchError, createEffect, createRenderEffect, createResource } from "solid-js";

export const data = createResource(() => "id", async id => id);
export const guarded = catchError(() => data[0](), () => "fallback");
createEffect((prev = 0) => prev + 1);
createRenderEffect((prev = 0) => prev + 1);
