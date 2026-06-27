import { snapshot } from "solid-js";

type Details = { acceptedFiles: File[]; rejectedFiles: FileRejection[]; snapshot: readonly string[] };

const details: Details = {
	acceptedFiles: [...snapshot(acceptedFilesState)],
	rejectedFiles: [...snapshot(rejectedFilesState)],
	snapshot: snapshot(otherState),
};
