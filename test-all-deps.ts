import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import util from "node:util";

import {
  ANSI,
  color,
  printSection,
  printInfo,
  printSuccess,
  printWarning,
  printErrorMessage,
  ask,
  pickFromList,
  getProgressBar
} from "./src/cli-ui.js";

import { createEcampusClient, isCookieJarUsable, watchLesson } from "./src/index.js";

console.log("All modules loaded successfully");
process.exit(0);
