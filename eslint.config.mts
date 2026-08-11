import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig(
  globalIgnores([
    "node_modules",
    "coverage",
    "esbuild.config.mjs",
    "version-bump.mjs",
    "versions.json",
    "main.js",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "Notes/**"
  ]),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mts", "manifest.json"]
        },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".json"]
      }
    }
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "obsidianmd/ui/sentence-case": [
        "warn",
        {
          brands: ["Gallery Excluder", "Android", "Obsidian"]
        }
      ]
    }
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/unbound-method": "off",
      "obsidianmd/no-nodejs-modules": "off"
    }
  }
);
