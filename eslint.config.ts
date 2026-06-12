import eslint from "@eslint/js";
import angular from "angular-eslint";
import prettierConfig from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import {defineConfig, includeIgnoreFile} from "eslint/config";
import {fileURLToPath} from "node:url";
import tseslint from "typescript-eslint";

const gitignorePaths = [".gitignore", "packages/cad-viewer/.gitignore", "packages/utils/.gitignore"].map((path) =>
  fileURLToPath(new URL(path, import.meta.url))
);

export default defineConfig([
  includeIgnoreFile(gitignorePaths, {gitignoreResolution: true}),
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.eslintRecommended,
      angular.configs.tsRecommended,
      angular.configs.tsRecommended,
      prettierConfig
    ],
    plugins: {
      prettier
    },
    languageOptions: {
      parserOptions: {
        project: ["tsconfig.json", "scripts/tsconfig.scripts.json", "packages/*/tsconfig*.json"]
      }
    },
    rules: {
      "@angular-eslint/no-input-rename": "off",
      "@angular-eslint/no-output-rename": "off",
      "@angular-eslint/no-output-native": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-deprecated": "warn",
      "no-empty": ["error", {allowEmptyCatch: true}]
    }
  }
]);
