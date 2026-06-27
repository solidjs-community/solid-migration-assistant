import { createContext } from "solid-js";
import type { FileRejection } from "./types";

export interface FileFieldContextValue {
	acceptedFiles: File[]; // store
	rejectedFiles: FileRejection[]; // store
	otherFiles: File[]; // store
	acceptedFilesReadonly: readonly File[]; // store
	acceptedFilesWithoutMarker: File[];
}

export const FileFieldContext = createContext<FileFieldContextValue>();
