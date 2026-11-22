import "server-only";
import { parseGuessRequest } from "../game/validation";
import { ApiFailure } from "./http";

/** Bound bytes while reading, including chunked requests without Content-Length. */
export async function readGuessRequest(request: Request) {
  const invalid = () => new ApiFailure(
    400, "INVALID_GUESS", "Provide a question ID and a positive number within the allowed maximum.",
  );
  const contentType = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json" || !request.body) throw invalid();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 1024) {
        await reader.cancel();
        throw invalid();
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const parsed = parseGuessRequest(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
    if (!parsed) throw invalid();
    return parsed;
  } catch {
    throw invalid();
  } finally {
    reader.releaseLock();
  }
}
