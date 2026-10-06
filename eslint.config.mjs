import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

const finalConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", ".browser-profile/**"] },
  { files: ["**/*.ts", "**/*.tsx"], languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } } } },
  { files: ["**/*.tsx"], plugins: { "react-hooks": reactHooks }, rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" } },
];
export default finalConfig;
