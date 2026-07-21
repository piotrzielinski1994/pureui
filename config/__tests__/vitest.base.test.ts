/// <reference types="vitest/config" />
import { createVitestConfig } from "../vitest.base";

const appUrl = "file:///tmp/fakeapp/vitest.config.ts";

describe("createVitestConfig", () => {
  it("should enable globals+jsdom, default include to src test files, and alias @->src when only appUrl is given", () => {
    const config = createVitestConfig({ appUrl });

    expect(config.test?.globals).toBe(true);
    expect(config.test?.environment).toBe("jsdom");

    const include = config.test?.include ?? [];
    expect(
      include.some((glob) => glob.includes("src") && glob.includes(".test.")),
    ).toBe(true);

    const alias = config.resolve?.alias;
    const atAlias =
      alias && !Array.isArray(alias) ? Reflect.get(alias, "@") : undefined;
    expect(typeof atAlias).toBe("string");
    expect(String(atAlias).endsWith("/tmp/fakeapp/src")).toBe(true);
  });

  it("should use the supplied setupFiles, include, and inlineDeps when overrides are provided", () => {
    const config = createVitestConfig({
      appUrl,
      setupFiles: ["./x.ts"],
      include: ["a"],
      inlineDeps: ["codemirror-json-schema"],
    });

    expect(config.test?.setupFiles).toEqual(["./x.ts"]);
    expect(config.test?.include).toEqual(["a"]);
    expect(config.test?.server?.deps?.inline).toEqual([
      "codemirror-json-schema",
    ]);
  });
});
