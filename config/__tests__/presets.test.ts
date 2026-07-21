import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type BiomeConfig = {
  linter?: {
    domains?: Record<string, string>;
    rules?: {
      preset?: string;
      recommended?: boolean;
      suspicious?: Record<string, string>;
    };
  };
  overrides?: unknown;
};

type TsConfig = {
  compilerOptions?: Record<string, unknown>;
};

const configDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseJsonc(text: string): unknown {
  const withoutComments = text.replace(
    /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (_match, stringLiteral) => (stringLiteral ? stringLiteral : ""),
  );
  const withoutTrailingCommas = withoutComments.replace(/,(\s*[}\]])/g, "$1");

  return JSON.parse(withoutTrailingCommas);
}

function readPreset(name: string): unknown {
  return parseJsonc(readFileSync(resolve(configDir, name), "utf8"));
}

describe("biome.base.json preset", () => {
  it("should carry the recommended preset, error-level noExplicitAny, the react domain, and no overrides", () => {
    const biome = readPreset("biome.base.json") as BiomeConfig;
    const rules = biome.linter?.rules;

    expect(rules?.preset === "recommended" || rules?.recommended === true).toBe(
      true,
    );
    expect(rules?.suspicious?.noExplicitAny).toBe("error");
    expect(biome.linter?.domains?.react).toBe("recommended");
    expect(biome.overrides).toBeUndefined();
  });
});

describe("tsconfig base presets", () => {
  it("should carry strict, bundler resolution, and no-emit in tsconfig.base.json", () => {
    const tsconfig = readPreset("tsconfig.base.json") as TsConfig;
    const compilerOptions = tsconfig.compilerOptions;

    expect(compilerOptions?.strict).toBe(true);
    expect(compilerOptions?.moduleResolution).toBe("bundler");
    expect(compilerOptions?.noEmit).toBe(true);
  });

  it("should carry node-side options in tsconfig.node.base.json", () => {
    const tsconfigNode = readPreset("tsconfig.node.base.json") as TsConfig;
    const types = tsconfigNode.compilerOptions?.types;

    expect(Array.isArray(types)).toBe(true);
    expect(Array.isArray(types) ? types.includes("node") : false).toBe(true);
  });
});
