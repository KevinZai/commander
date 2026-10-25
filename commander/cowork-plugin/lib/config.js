// Configuration management for CC Commander
// Reads/writes ~/.commander/config.json with defaults

import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.commander');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  telemetry: false,
  version: '1',
};

// Ensure config directory exists
function ensureConfigDir() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
  } catch (err) {
    // Non-fatal
  }
}

// Read configuration file
export function readConfig() {
  try {
    ensureConfigDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    }
  } catch (err) {
    // Non-fatal — return defaults
  }
  return DEFAULT_CONFIG;
}

// Write configuration file
export function writeConfig(config) {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
  } catch (err) {
    // Non-fatal
  }
}

// Telemetry is opt-in: CCC_OFFLINE=1 or offline:true wins, CCC_TELEMETRY=0/1
// beats the config file, otherwise only telemetry:true enables it.
export function isTelemetryEnabled() {
  if (process.env.CCC_OFFLINE === '1') return false;
  if (process.env.CCC_TELEMETRY === '0') return false;
  if (process.env.CCC_TELEMETRY === '1') return true;
  const config = readConfig();
  if (config.offline === true) return false;
  return config.telemetry === true;
}

// Disable telemetry
export function disableTelemetry() {
  const config = readConfig();
  config.telemetry = false;
  writeConfig(config);
}

// Enable telemetry
export function enableTelemetry() {
  const config = readConfig();
  config.telemetry = true;
  writeConfig(config);
}
