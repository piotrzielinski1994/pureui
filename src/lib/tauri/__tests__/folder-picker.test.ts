import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as folderPickerModule from "@/lib/tauri/folder-picker";
import { createNoopFolderPicker } from "@/lib/tauri/folder-picker";

// Hoisted folder-picker (AC-007). Only the `FolderPicker` port + the noop fake
// are hoisted; the concrete `createTauriFolderPicker` (which imports
// @tauri-apps/plugin-dialog) stays app-side, mirroring the window-controller
// port+noop split. These assert the noop's resolved value + never-throws
// contract, plus the purity contract that the module neither exports the Tauri
// factory nor imports @tauri-apps/* (the latter checked by reading the source
// off disk, like the updater purity test).

const moduleDir = dirname(fileURLToPath(import.meta.url));
const folderPickerSourcePath = resolve(moduleDir, "../folder-picker.ts");

describe("createNoopFolderPicker", () => {
  // TC-013 -> AC-007 - behavior: the noop picker resolves null (no selection).
  it("should resolve to null when pick() is called", async () => {
    const picker = createNoopFolderPicker();

    await expect(picker.pick()).resolves.toBeNull();
  });

  // TC-013 -> AC-007 - side-effect-contract: pick() does not throw / reject
  // (no native interaction).
  it("should not throw or reject when pick() is called", async () => {
    const picker = createNoopFolderPicker();

    let rejected = false;
    await picker.pick().catch(() => {
      rejected = true;
    });

    expect(rejected).toBe(false);
  });
});

describe("folder-picker module purity (AC-002 / AC-007)", () => {
  // TC-014 -> AC-002, AC-007 - behavior: the Tauri factory is NOT part of the
  // hoisted module (it stays app-side).
  it("should not export createTauriFolderPicker", () => {
    expect(
      (folderPickerModule as Record<string, unknown>).createTauriFolderPicker,
    ).toBeUndefined();
  });

  // TC-014 -> AC-002, AC-007 - side-effect-contract: the module source imports
  // no @tauri-apps/* package.
  it("should not import @tauri-apps/* in its source", () => {
    const source = readFileSync(folderPickerSourcePath, "utf8");

    expect(source).not.toMatch(/@tauri-apps\//);
  });
});
