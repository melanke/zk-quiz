#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const circuitsDir = path.join(__dirname, "..", "circuits");
const contractsDir = path.join(__dirname, "..", "contracts");
const keysDir = path.join(circuitsDir, "keys");
const tempDir = path.join(circuitsDir, "temp");
const publicCircuitsDir = path.join(
  __dirname,
  "..",
  "..",
  "nextjs",
  "public",
  "circuits"
);
const publicKeysDir = path.join(publicCircuitsDir, "keys");

// Colors for output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ensureDirectoriesExist() {
  // Create keys folder if it doesn't exist
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
    log(`📁 'keys' folder created at: ${keysDir}`, "green");
  }

  // Create temp folder if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    log(`📁 'temp' folder created at: ${tempDir}`, "green");
  }

  // Create public circuits folder structure if it doesn't exist
  if (!fs.existsSync(publicCircuitsDir)) {
    fs.mkdirSync(publicCircuitsDir, { recursive: true });
    log(`📁 'circuits' folder created at: ${publicCircuitsDir}`, "green");
  }

  if (!fs.existsSync(publicKeysDir)) {
    fs.mkdirSync(publicKeysDir, { recursive: true });
    log(`📁 'keys' folder created at: ${publicKeysDir}`, "green");
  }
}

function runCommand(command, cwd = circuitsDir) {
  try {
    log(`Executing: ${command}`, "blue");
    execSync(command, {
      cwd,
      stdio: "inherit",
      encoding: "utf8",
    });
    return true;
  } catch (error) {
    log(`Error executing command: ${command}`, "red");
    log(`Error: ${error.message}`, "red");
    return false;
  }
}

function compileZokratesFile(filename) {
  const baseName = path.basename(filename, ".zok");

  log(`\n📝 Processing file: ${filename}`, "yellow");

  // Define file paths
  const outFile = path.join("temp", `${baseName}.out`);
  const rlcsFile = path.join("temp", `${baseName}.rlcs`);
  const abiFile = path.join("temp", `${baseName}.abi`);
  const provingKeyFile = path.join("keys", `${baseName}.proving.key`);
  const verificationKeyFile = path.join("keys", `${baseName}.verification.key`);

  // Check if keys already exist
  const provingKeyExists = fs.existsSync(
    path.join(circuitsDir, provingKeyFile)
  );
  const verificationKeyExists = fs.existsSync(
    path.join(circuitsDir, verificationKeyFile)
  );
  const keysExist = provingKeyExists && verificationKeyExists;

  // Step 1: Compile
  log(`1️⃣ Compiling ${baseName}.zok...`, "blue");
  const compileSuccess = runCommand(
    `zokrates compile -i ${baseName}.zok -o ${outFile} -r ${rlcsFile} -s ${abiFile}`
  );

  if (!compileSuccess) {
    log(`❌ Compilation failed for ${baseName}`, "red");
    return false;
  }

  // Step 2: Setup (skip if keys already exist)
  if (keysExist) {
    log(`2️⃣ ⏭️ Setup skipped for ${baseName} (keys already exist)`, "yellow");
  } else {
    log(`2️⃣ Running setup for ${baseName}...`, "blue");
    const setupSuccess = runCommand(
      `zokrates setup -i ${outFile} -p ${provingKeyFile} -v ${verificationKeyFile}`
    );

    if (!setupSuccess) {
      log(`❌ Setup failed for ${baseName}`, "red");
      return false;
    }
  }

  // Step 3: Export verifier
  log(`3️⃣ Exporting verifier to ${baseName}.sol...`, "blue");
  const exportSuccess = runCommand(
    `zokrates export-verifier -i ${verificationKeyFile} -o ../contracts/${baseName}.sol`
  );

  if (!exportSuccess) {
    log(`❌ Verifier export failed for ${baseName}`, "red");
    return false;
  }

  // Step 4: Rename contract in the generated file
  log(`4️⃣ Renaming contract to ${baseName}...`, "blue");
  const contractPath = path.join(contractsDir, `${baseName}.sol`);
  try {
    let contractContent = fs.readFileSync(contractPath, "utf8");

    // Replace contract name and related references
    contractContent = contractContent
      .replace(/contract Verifier/g, `contract ${baseName}`)
      .replace(/struct Verifier\.Proof/g, `struct ${baseName}.Proof`);

    fs.writeFileSync(contractPath, contractContent, "utf8");
    log(`  ✅ Contract renamed to ${baseName}`, "green");
  } catch (error) {
    log(`  ❌ Failed to rename contract: ${error.message}`, "red");
    return false;
  }

  log(`✅ ${baseName} processed successfully!`, "green");
  return true;
}

function copyCircuitsToPublic() {
  log(`📋 Copying circuits to public directory...`, "blue");

  // Create README warning file
  const readmeContent = `# ⚠️ AUTO-GENERATED FILES - DO NOT EDIT

This directory contains files automatically copied from \`packages/foundry/circuits/\`.

## Important Notes

- **DO NOT EDIT** files in this directory directly
- All changes should be made in \`packages/foundry/circuits/\`
- Files here are overwritten every time the ZoKrates compilation script runs
- To update these files, run: \`yarn zokrates:compile\`

## Files in this directory

- \`*.zok\`: ZoKrates circuit source code (copied from foundry/circuits/)
- \`keys/*.key\`: ZoKrates proving and verification keys (copied from foundry/circuits/keys/)

## Last updated

Generated on: ${new Date().toISOString()}
`;

  const readmePath = path.join(publicCircuitsDir, "README.md");
  try {
    fs.writeFileSync(readmePath, readmeContent, "utf8");
    log(`  ✅ Created README.md warning file`, "green");
  } catch (error) {
    log(`  ❌ Failed to create README.md: ${error.message}`, "red");
  }

  // Copy .zok files
  const zokFiles = fs
    .readdirSync(circuitsDir)
    .filter((file) => file.endsWith(".zok"));

  for (const zokFile of zokFiles) {
    const sourcePath = path.join(circuitsDir, zokFile);
    const destPath = path.join(publicCircuitsDir, zokFile);

    try {
      fs.copyFileSync(sourcePath, destPath);
      log(`  ✅ Copied ${zokFile}`, "green");
    } catch (error) {
      log(`  ❌ Failed to copy ${zokFile}: ${error.message}`, "red");
    }
  }

  // Copy key files
  if (fs.existsSync(keysDir)) {
    const keyFiles = fs
      .readdirSync(keysDir)
      .filter((file) => file.endsWith(".key"));

    for (const keyFile of keyFiles) {
      const sourcePath = path.join(keysDir, keyFile);
      const destPath = path.join(publicKeysDir, keyFile);

      try {
        fs.copyFileSync(sourcePath, destPath);
        log(`  ✅ Copied ${keyFile}`, "green");
      } catch (error) {
        log(`  ❌ Failed to copy ${keyFile}: ${error.message}`, "red");
      }
    }

    log(
      `📋 Circuits copied to public directory: ${zokFiles.length} .zok file(s), ${keyFiles.length} key file(s)`,
      "green"
    );
  } else {
    log(
      `📋 Circuits copied to public directory: ${zokFiles.length} .zok file(s), 0 key file(s)`,
      "green"
    );
  }
}

function main() {
  log("🚀 Starting ZoKrates files compilation...", "green");

  // Check if circuits directory exists
  if (!fs.existsSync(circuitsDir)) {
    log(`❌ Circuits directory not found: ${circuitsDir}`, "red");
    process.exit(1);
  }

  // Check if contracts directory exists
  if (!fs.existsSync(contractsDir)) {
    log(`❌ Contracts directory not found: ${contractsDir}`, "red");
    process.exit(1);
  }

  // Create necessary directories
  ensureDirectoriesExist();

  // Read all .zok files from circuits directory
  const files = fs.readdirSync(circuitsDir);
  const zokFiles = files.filter((file) => file.endsWith(".zok"));

  if (zokFiles.length === 0) {
    log("⚠️ No .zok files found in circuits directory", "yellow");
    return;
  }

  log(`📁 Found ${zokFiles.length} .zok file(s):`, "blue");
  zokFiles.forEach((file) => log(`  - ${file}`, "blue"));

  let successCount = 0;
  let failCount = 0;

  // Process each .zok file
  for (const zokFile of zokFiles) {
    if (compileZokratesFile(zokFile)) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Copy circuits to public directory (only if successful)
  if (failCount === 0) {
    copyCircuitsToPublic();
  }

  // Clean up temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    log(`🗑️ Cleaned up temp directory`, "blue");
  }

  // Final report
  log(`\n📊 Final report:`, "yellow");
  log(`✅ Successes: ${successCount}`, "green");

  if (failCount > 0) {
    log(`❌ Failures: ${failCount}`, "red");
    log(`\n⚠️ Some files failed. Check the logs above.`, "yellow");
    process.exit(1);
  } else {
    log(`\n🎉 All files processed successfully!`, "green");
  }
}

// Check if zokrates is installed
try {
  execSync("zokrates --version", { stdio: "pipe" });
} catch (error) {
  log("❌ ZoKrates not found. Make sure it is installed and in PATH.", "red");
  log("💡 To install: https://zokrates.github.io/gettingstarted.html", "blue");
  process.exit(1);
}

main();
