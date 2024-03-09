const buildOutput = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  sourcemap: "external",
  external: ["bun", "node:https"],
});

console.log(buildOutput);

export {};
