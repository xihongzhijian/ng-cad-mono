import {includeIgnoreFile} from "@eslint/compat";
import {FlatCompat} from "@eslint/eslintrc";
import js from "@eslint/js";
import prettier from "eslint-plugin-prettier";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});
const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default [
  includeIgnoreFile(gitignorePath, "Imported .gitignore patterns"),
  {
    languageOptions: {
      globals: {}
    },

    rules: {}
  },
  ...compat
    .extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:@angular-eslint/recommended",
      "plugin:@angular-eslint/template/process-inline-templates",
      "plugin:prettier/recommended"
    )
    .map((config) => ({
      ...config,
      files: ["**/*.ts"]
    })),
  {
    files: ["**/*.ts"],

    plugins: {
      prettier
    },

    languageOptions: {
      ecmaVersion: 5,
      sourceType: "script",

      parserOptions: {
        project: ["tsconfig.json", "scripts/tsconfig.scripts.json", "packages/*/tsconfig.json"],
        createDefaultProgram: true
      }
    },

    rules: {
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case"
        }
      ],
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase"
        }
      ],
      "@angular-eslint/no-input-rename": "off",
      "@angular-eslint/no-output-rename": "off",
      "@angular-eslint/no-output-native": "off",

      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: null,
          leadingUnderscore: "allowSingleOrDouble"
        }
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-deprecated": "warn",
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": ["error", {ignoreTypeValueShadow: true}],
      "no-empty": [
        "error",
        {
          allowEmptyCatch: true
        }
      ]
    }
  },
  ...compat.extends("plugin:@angular-eslint/template/recommended").map((config) => ({
    ...config,
    files: ["**/*.component.html", "**/index.html"]
  })),
  {
    files: ["**/*.component.html", "**/index.html"],
    rules: {}
  },
  ...compat.extends("plugin:@angular-eslint/template/process-inline-templates").map((config) => ({
    ...config,
    files: ["**/*.component.ts"]
  }))
];
