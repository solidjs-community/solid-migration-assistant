import { catchError, createComputed, on, resetErrorBoundaries } from "solid-js";

export const removed = [catchError, createComputed, on, resetErrorBoundaries];
