import { unwrap } from "solid-js/store";

type Details = { acceptedFiles: File[]; rejectedFiles: FileRejection[]; snapshot: readonly string[] };

const details: Details = {
	acceptedFiles: unwrap(acceptedFilesState),
	rejectedFiles: unwrap(rejectedFilesState),
	snapshot: unwrap(otherState),
};
