import { ErrorEvent } from "maplibre-gl";

export function createError(msg: string): ErrorEvent {
  return { error: new Error(msg), type: "error" };
}
