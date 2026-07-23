import { describe, expect, it } from "vitest";

import { slugify, uniqueSlug } from "@/lib/util/slug";

// Hoisted slug helpers (AC-003, AC-004). `slugify` normalizes a display name
// into a url-safe slug; `uniqueSlug` de-duplicates against a set of already-used
// slugs, recording its answer. These assert observable output (the returned
// string) plus the side-effect contract (the `used` set is mutated), never the
// internal loop/recursion shape - the shared iterative impl and puredeck's
// drifted recursive impl are output-equivalent (AC-010).

describe("slugify", () => {
  // TC-003 -> AC-003 - behavior: lower-cases, collapses each non-alnum run to a
  // single "-", and strips leading/trailing "-".
  it("should return 'my-cool-db-2' if given 'My Cool DB #2!'", () => {
    expect(slugify("My Cool DB #2!")).toBe("my-cool-db-2");
  });

  // TC-004 -> AC-003 - behavior: an input reducing to the empty string falls
  // back to the "untitled" sentinel.
  it("should return 'untitled' if the input reduces to the empty string", () => {
    expect(slugify("!!!")).toBe("untitled");
  });
});

describe("uniqueSlug", () => {
  // TC-005 -> AC-004 - behavior: an unused base is returned verbatim.
  it("should return 'api' if the base is unused", () => {
    const used = new Set<string>();

    expect(uniqueSlug("api", used)).toBe("api");
  });

  // TC-005 -> AC-004 - side-effect-contract: the returned slug is recorded in
  // the used set.
  it("should record 'api' in the used set if the base is unused", () => {
    const used = new Set<string>();

    uniqueSlug("api", used);

    expect(used.has("api")).toBe(true);
  });

  // TC-006 -> AC-004, AC-010 - behavior: on collision it picks the first free
  // `${base}-${n}` counting from n=2 (here api, api-2 taken -> api-3).
  it("should return 'api-3' if 'api' and 'api-2' are already used", () => {
    const used = new Set(["api", "api-2"]);

    expect(uniqueSlug("api", used)).toBe("api-3");
  });

  // TC-006 -> AC-004, AC-010 - side-effect-contract: the chosen collision slug
  // is recorded in the used set.
  it("should record 'api-3' in the used set if 'api' and 'api-2' are already used", () => {
    const used = new Set(["api", "api-2"]);

    uniqueSlug("api", used);

    expect(used.has("api-3")).toBe(true);
  });
});
