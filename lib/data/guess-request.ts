import "server-only";
import { parseGuessRequest } from "../game/validation";
import { ApiFailure } from "./http";
import { readJsonBody } from "./json-body";

/** Bound bytes while reading, including chunked requests without Content-Length. */
export async function readGuessRequest(request: Request) {
  const invalid = () => new ApiFailure(
    400, "INVALID_GUESS", "Provide a question ID and a positive number within the allowed maximum.",
  );
  const parsed = parseGuessRequest(await readJsonBody(request, 1024, invalid));
  if (!parsed) throw invalid();
  return parsed;
}
