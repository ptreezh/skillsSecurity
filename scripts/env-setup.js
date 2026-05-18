/**
 * Environment Setup for Deploy Scripts
 *
 * Loads .env file and validates required environment variables.
 * Must be imported before other modules that use process.env
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

// Load .env from project root
config({ path: path.join(rootDir, '.env') })

/**
 * Validate required environment variables for deployment
 * @param {string[]} requiredVars - Array of required variable names
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateEnv(requiredVars = []) {
  const missing = requiredVars.filter(v => !process.env[v])

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Get environment variable with default value
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @returns {*}
 */
export function getEnv(key, defaultValue = undefined) {
  return process.env[key] ?? defaultValue
}

// Validate on import (warn but don't fail)
const { valid, missing } = validateEnv(['PRIVATE_KEY'])
if (!valid) {
  console.warn(`[env-setup] Warning: Missing env vars: ${missing.join(', ')}`)
  console.warn('[env-setup] Copy .env.example to .env and fill in your values')
}

export default { validateEnv, getEnv }
