import assert from 'node:assert/strict'
import test from 'node:test'
import { getEnvironmentFilePath } from './environment.js'

test('selects separate environment files for development and production', () => {
  assert.equal(getEnvironmentFilePath('development'), '.env.development')
  assert.equal(getEnvironmentFilePath('production'), '.env.production')
})
