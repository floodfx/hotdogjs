#!/usr/bin/env bun

import { confirm, intro, outro, spinner, text } from "@clack/prompts";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, relative, resolve } from "path";
import color from "picocolors";

// ASCII art for the welcome message
const HOTDOG_ASCII = `🌭 HotdogJS - A Bun-optimized LiveView Framework`;
const defaultProjectName = "my-hotdogjs-app";

// Function to copy files recursively
function copyFiles(source: string, destination: string, exclude: string[] = []) {
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }

  // Prevent recursive copying by checking if source is inside destination or vice versa
  const relPath = relative(source, destination);
  if (!relPath.startsWith("..") && relPath !== "") {
    console.error(`Cannot copy ${source} into itself or its subdirectory`);
    return;
  }

  const entries = readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(source, entry.name);
    const destPath = join(destination, entry.name);

    // Skip excluded files/directories
    if (exclude.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyFiles(srcPath, destPath, exclude);
    } else {
      try {
        // Copy file as binary to handle all file types
        const content = readFileSync(srcPath, "utf8");
        writeFileSync(destPath, content);
      } catch (e) {
        console.error(`Error copying file ${srcPath}: ${e}`);
      }
    }
  }
}

// Main function
async function main() {
  // Intro with styled text
  intro(HOTDOG_ASCII);

  // Get project directory with styled prompt
  const defaultDir = `./${defaultProjectName}`;
  const projectDir = await text({
    message: "Where would you like to create your project?",
    placeholder: defaultDir,
    initialValue: defaultDir,
  });

  const absoluteProjectDir = resolve(projectDir as string);

  // Check if directory exists and is not empty
  if (existsSync(absoluteProjectDir)) {
    const files = readdirSync(absoluteProjectDir);
    if (files.length > 0) {
      const overwrite = await confirm({
        message: `Directory ${String(projectDir)} already exists and is not empty. Continue?`,
      });

      if (!overwrite) {
        outro("Operation cancelled.");
        process.exit(0);
      }
    }
  }

  // Get project name
  const defaultName = absoluteProjectDir.split("/").pop() || defaultProjectName;
  const projectName = await text({
    message: "What is the name of your project?",
    placeholder: defaultName,
    initialValue: defaultName,
  });

  // Create project directory if it doesn't exist
  if (!existsSync(absoluteProjectDir)) {
    mkdirSync(absoluteProjectDir, { recursive: true });
  }

  // Get the directory of the current script
  const templateDir = import.meta.dir;

  // Show spinner during file operations
  const s = spinner();
  s.start(`Creating a new HotdogJS project in ${absoluteProjectDir}...`);

  // Copy files from template to project directory
  copyFiles(templateDir, absoluteProjectDir, ["install.ts", "node_modules"]);

  // Update package.json with project name
  const packageJsonPath = join(absoluteProjectDir, "package.json");
  if (existsSync(packageJsonPath)) {
    // read package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

    // update name
    packageJson.name = projectName;
    // set version to 0.0.1
    packageJson.version = "0.0.1";
    // remove bin
    delete packageJson.bin;
    // remove @clack/prompts and picocolors from dependencies
    delete packageJson.dependencies["@clack/prompts"];
    delete packageJson.dependencies["picocolors"];
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  s.stop(`Project created successfully! 🎉`);

  // Show next steps
  console.log([`cd ${relative(process.cwd(), absoluteProjectDir)}`, `bun install`, `bun dev`], "Next steps:");
  console.log(`Happy coding with HotdogJS! ${color.yellow("🌭")}`);
}

// Run the main function
main().catch((error) => {
  console.error("Error creating project:", error);
  process.exit(1);
});
