import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { validateJsonSchemaValue } = require('C:/Users/78374/AppData/Local/Programs/DSH Desktop/resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-tools/lib/types/json-schema.js')

// Replicate the FINAL PATCHED cordis_define parameters schema exactly
const schema = {
  type: 'object',
  properties: {
    plugin: {
      required: true,
      oneOf: [
        { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', const: 'new' }, idPrefix: { type: 'string' } } },
        { type: 'object', additionalProperties: false, properties: { kind: { type: 'string', const: 'existing' }, pluginId: { type: 'string' } } },
        { type: 'string' },
      ],
    },
    name: { type: 'string', required: true },
    purpose: { type: 'string', required: true },
    code: {
      required: true,
      oneOf: [
        { type: 'object', additionalProperties: false, properties: { host: { type: 'string' }, client: { type: 'string' } } },
        { type: 'string' },
      ],
    },
  },
}

const cases = [
  ['normal object form', {
    plugin: { kind: 'new', idPrefix: 'remd' },
    name: 'Remote Dev SSH',
    purpose: 'SSH',
    code: { host: 'return {}', client: 'return {}' },
  }],
  ['model attempt 3/4: plugin as JSON string', {
    plugin: '{"kind": "new", "idPrefix": "remd"}',
    name: 'Remote Dev SSH',
    purpose: 'SSH',
    code: { host: 'return {}', client: 'return {}' },
  }],
  ['model attempt 9: whole code as JSON string', {
    plugin: '{"kind": "new", "idPrefix": "remd"}',
    name: 'Remote Dev SSH',
    purpose: 'SSH',
    code: '{"host":"return {}","client":"return {}"}',
  }],
  ['existing kind form', {
    plugin: { kind: 'existing', pluginId: 'remd1234' },
    name: 'X', purpose: 'Y',
    code: { host: 'return {}' },
  }],
  ['missing plugin (should FAIL)', {
    code: { client: 'return {}' },
  }],
]

let allPass = true
for (const [label, value] of cases) {
  const res = validateJsonSchemaValue(schema, value)
  const pass = res.length === 0
  if (!pass) allPass = false
  console.log(label, '=>', pass ? 'PASS' : 'FAIL: ' + res.join('; '))
}
process.exit(allPass ? 0 : 1)
