#!/usr/bin/env bun

import { mkdir } from "fs/promises";
import { join } from "path";

const cwd = process.cwd();

const clientJsPath = (await import.meta.resolve("@hotdogjs/client")).replace("file://", "");

// Source files to copy
const serverFiles = [
  {
    src: import.meta.dir + "/default.ts",
    dest: join(cwd, "src/server/default.ts"),
  },
  {
    src: import.meta.dir + "/start.ts",
    dest: join(cwd, "src/server/start.ts"),
  },
];

const clientFiles = [
  {
    src: clientJsPath,
    dest: join(cwd, "src/client/hotdogjs-client.ts"),
  },
];

// Eject does the following:
// 1. Creates directories for server and client files
// 2. Creates the new files, updating their imports to use the hotdogjs package instead of relative paths
// 3. Add / updates a hotdogjs-config.toml file overriding the location of the client javascript
// 4. Updates the package.json to replace the `dev` and `start` scripts.
async function eject() {
  try {
    // Create directories if they don't exist
    await mkdir(join(cwd, "src/server"), { recursive: true });
    await mkdir(join(cwd, "src/client"), { recursive: true });

    // server files
    for (const file of serverFiles) {
      const source = Bun.file(file.src);
      const sourceText = await source.text();
      // for default.ts update imports to use the hotdogjs package
      if (file.src === import.meta.dir + "/default.ts") {
        // update any line with import that is relative to the hotdogjs package
        const updatedText = sourceText.replace(
          /import\s*{([^}]+)}\s*from\s*(['"])\..[^'"]+\2/g,
          "import { $1 } from $2hotdogjs$2"
        );
        await Bun.write(file.dest, updatedText);
      } else {
        await Bun.write(file.dest, sourceText);
      }
      console.log(`✅ Copied ${file.src} to ${file.dest}`);
    }

    // client files
    for (const file of clientFiles) {
      const source = Bun.file(file.src);
      const sourceText = await source.text();
      // update any line with import that is relative to the hotdogjs package
      const updatedText = sourceText.replace(
        /import\s*{([^}]+)}\s*from\s*(['"])\.[\/\\]([^'"]+)\2/g,
        "import { $1 } from $2@hotdogjs/client/$3$2"
      );
      await Bun.write(file.dest, updatedText);
      console.log(`✅ Copied ${file.src} to ${file.dest}`);
    }

    // check if there is a hotdogjs-conf.toml file in the cwd and if so, update it, otherwise create it
    const hotdogjsConf = join(cwd, "hotdogjs-conf.toml");
    if (await Bun.file(hotdogjsConf).exists()) {
      const hotdogjsConfText = await Bun.file(hotdogjsConf).text();
      if (hotdogjsConfText.includes("clientJSSourceFile")) {
        const updatedText = hotdogjsConfText.replace(
          /clientJSSourceFile\s*=\s*".*"/g,
          "clientJSSourceFile = " + `"src/client/hotdogjs-client.ts"`
        );
        await Bun.write(hotdogjsConf, updatedText);
      } else {
        await Bun.write(hotdogjsConf, hotdogjsConfText + `\nclientJSSourceFile = "src/client/hotdogjs-client.ts"`);
      }
    } else {
      await Bun.write(hotdogjsConf, `clientJSSourceFile = "src/client/hotdogjs-client.ts"`);
    }

    // update the package.json to replace the `dev` and `start` scripts with `bun --watch run SERVER_FILE` and `bun run SERVER_FILE`
    const packageJson = join(cwd, "package.json");
    const packageJsonJson = await Bun.file(packageJson).json();
    const updatedPackageJson = {
      // copy over the existing package.json
      ...packageJsonJson,
      scripts: {
        // overwrite the dev and start scripts
        ...packageJsonJson.scripts,
        dev: "bun --watch run src/server/default.ts",
        start: "bun run src/server/default.ts",
      },
    };
    // remove eject script
    delete updatedPackageJson.scripts.eject;
    // update the package.json
    await Bun.write(packageJson, JSON.stringify(updatedPackageJson, null, 2));

    console.log("\n🌭 Successfully ejected server and client files!");
    console.log("You can now customize these files in your project's src directory.");
  } catch (error) {
    console.error("❌ Failed to eject files:", error);
    process.exit(1);
  }
}

eject();
