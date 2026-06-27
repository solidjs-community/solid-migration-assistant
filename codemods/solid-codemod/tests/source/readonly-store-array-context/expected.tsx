// TODO(solid-2): Review semantic migration sites in this file: createContext default value.
import { createContext } from "solid-js";
import type { FileRejection } from "./types";

export interface FileFieldContextValue {
	acceptedFiles: readonly File[]; // store
	rejectedFiles: readonly FileRejection[]; // store
	otherFiles: File[]; // store
	acceptedFilesReadonly: readonly File[]; // store
	acceptedFilesWithoutMarker: File[];
}

export const FileFieldContext = createContext<FileFieldContextValue>(null as any);
