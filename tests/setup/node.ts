import { vi } from "vitest";

// Next.js enforces this marker in production bundles. Unit tests run on Node.
vi.mock("server-only", () => ({}));

// Never allow a unit test to accidentally contact a real Auth/DB service.
vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unit tests must mock external fetch."); }));
