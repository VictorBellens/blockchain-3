// Shim for Windows ARM64: redirect native module lookups to x64 versions
// (x64 binaries run fine on Windows ARM64 via WoW64 emulation)
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const nmDir = join(__dirname, "node_modules", "@nomicfoundation");

const shims = [
  {
    arm64Pkg: "edr-win32-arm64-msvc",
    x64Main: "../edr-win32-x64-msvc/edr.win32-x64-msvc.node",
    version: "0.12.0-next.29",
  },
  {
    arm64Pkg: "solidity-analyzer-win32-arm64-msvc",
    x64Main:
      "../solidity-analyzer-win32-x64-msvc/solidity-analyzer.win32-x64-msvc.node",
    version: "0.1.2",
  },
];

for (const { arm64Pkg, x64Main, version } of shims) {
  const dir = join(nmDir, arm64Pkg);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      { name: `@nomicfoundation/${arm64Pkg}`, version, main: x64Main },
      null,
      2
    )
  );
}

console.log("ARM64 shims created successfully.");
