// eslint.config.mjs
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  { ignores: ["**/build/", "**/coverage/"] },

  // ✅ Don’t run the TS parser (esp. type-aware) on the ESLint config itself
  {
    files: ["eslint.config.mjs"],
    languageOptions: { parserOptions: { project: null } },
  },

  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ),

  {
    plugins: { "@typescript-eslint": typescriptEslint },

    languageOptions: {
      parser: tsParser,

      // ⚠️ Your current ecmaVersion/sourceType are for old JS.
      // For TS projects, this is typically:
      ecmaVersion: "latest",
      sourceType: "module",

      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },

    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
      "guard-for-in": ["warn"],
      "@typescript-eslint/prefer-for-of": ["warn"],
    },
  },
];