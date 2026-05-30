import fs from 'fs'
import path from 'path'

/**
 * Regenerate data/hero_tags/_schema.json from lib/types.ts
 * Run after adding new tags:  ts-node scripts/refresh-tag-schema.ts
 */

const TYPES_PATH = path.join(process.cwd(), 'lib', 'types.ts')
const SCHEMA_PATH = path.join(process.cwd(), 'data', 'hero_tags', '_schema.json')

function extractTags(sourcePath: string): string[] {
  const raw = fs.readFileSync(sourcePath, 'utf-8')
  const tags: string[] = []

  // Isolate only the AbilityTag union section (stops before next export)
  const abilityTagMatch = raw.match(/export type AbilityTag =([\s\S]*?)\nexport /)
  const section = abilityTagMatch ? abilityTagMatch[1] : raw

  const regex = /\|\s*'([a-z_]+)'/g
  let m
  while ((m = regex.exec(section)) !== null) {
    tags.push(m[1])
  }

  return tags
}

function buildSchema(tags: string[]) {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'HeroTags',
    description:
      'Auto-generated from lib/types.ts. ' +
      `Latest update: ${new Date().toISOString()}. ` +
      'All array items must match the AbilityTag union exactly.',
    type: 'object',
    patternProperties: {
      '.+': {
        type: 'array',
        items: {
          type: 'string',
          enum: tags,
        },
      },
    },
    additionalProperties: false,
  }
}

const tags = extractTags(TYPES_PATH)
if (tags.length === 0) {
  console.error('No tags found in', TYPES_PATH)
  process.exit(1)
}

fs.writeFileSync(SCHEMA_PATH, JSON.stringify(buildSchema(tags), null, 2) + '\n')
console.log(`Generated schema with ${tags.length} tags → ${SCHEMA_PATH}`)
