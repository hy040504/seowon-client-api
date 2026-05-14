const fs = require("node:fs");
const path = require("node:path");

const source = path.join("src", "ecampus", "legacy", "login-crypto.cjs");
const targetDir = path.join("dist", "legacy");
const target = path.join(targetDir, "login-crypto.cjs");

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
