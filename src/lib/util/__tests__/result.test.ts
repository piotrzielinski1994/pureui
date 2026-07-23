import { describe, expect, it } from "vitest";

import { toResult } from "@/lib/util/result";

// Hoisted Result helper (AC-008). `toResult` turns a rejecting promise into a
// resolved discriminated union so callers never `try/catch`: it maps a fulfil
// to `{ ok: true, value }` and a reject to `{ ok: false, error }`, where `error`
// is `err.message` for an Error and `String(err)` for anything else. The key
// contract is that it NEVER itself rejects. These assert the resolved value and
// the never-rejects contract, not the internal try/catch shape.

describe("toResult", () => {
  // TC-015 -> AC-008 - behavior: a fulfilled promise yields ok:true with the value.
  it("should yield { ok: true, value: 42 } if the promise resolves 42", async () => {
    await expect(toResult(Promise.resolve(42))).resolves.toEqual({
      ok: true,
      value: 42,
    });
  });

  // TC-016 -> AC-008 - behavior: an Error rejection maps error to err.message.
  it("should yield { ok: false, error: 'boom' } if the promise rejects with Error('boom')", async () => {
    await expect(toResult(Promise.reject(new Error("boom")))).resolves.toEqual({
      ok: false,
      error: "boom",
    });
  });

  // TC-016 -> AC-008 - side-effect-contract: an Error rejection is swallowed,
  // toResult itself never rejects.
  it("should not reject if the wrapped promise rejects with an Error", async () => {
    let rejected = false;

    await toResult(Promise.reject(new Error("boom"))).catch(() => {
      rejected = true;
    });

    expect(rejected).toBe(false);
  });

  // TC-017 -> AC-008 - behavior: a non-Error rejection maps error via String(err).
  it("should yield { ok: false, error: 'nope' } if the promise rejects with the string 'nope'", async () => {
    await expect(toResult(Promise.reject("nope"))).resolves.toEqual({
      ok: false,
      error: "nope",
    });
  });
});
