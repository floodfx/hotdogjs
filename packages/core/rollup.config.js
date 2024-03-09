// import typescript from "rollup-plugin-typescript2";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

// packages that will be loaded externally
const external = ["zod","bun"];

export default [
  {
    external,
    input: "./src/index.ts",
    output: {
      file: "./build/hotdog.js",
      format: "cjs",
    },
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      typescript({ tsconfig: "./tsconfig.json", declarationDir: "./rollup", declaration: true }),
      commonjs(),
    ],
  },
  {
    external,
    input: "./src/index.ts",
    output: {
      file: "./build/hotdog.mjs",
      format: "esm",
    },
    plugins: [
      {
        banner() {
          // add typescript types to the javascript bundle
          return '/// <reference types="./hotdog.d.ts" />';
        },
      },
      resolve({
        preferBuiltins: true,
      }),
      typescript({ tsconfig: "./tsconfig.json", declarationDir: "./rollup", declaration: true }),
      commonjs(),
    ],
  },
  {
    external,
    input: "./build/index.d.ts",
    output: {
      file: "./build/hotdog.d.ts",
      format: "cjs",
    },
    plugins: [dts()],
  },
  {
    external,
    input: "./build/index.d.ts",
    output: {
      file: "./build/hotdog.d.mts",
      format: "esm",
    },
    plugins: [dts()],
  },
];
