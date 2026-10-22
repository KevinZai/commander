import { createRequire } from "node:module";

// src/lib and dist/lib resolve the same package manifest, including in Docker.
const require = createRequire(import.meta.url);
export const SERVER_VERSION: string = require("../../package.json").version;
