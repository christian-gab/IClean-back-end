import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validatePhotoSchema } from './validations/schemas.js'

test('photo validation accepts JPEG data and rejects other formats and remote URLs', () => {
  assert.equal(
    validatePhotoSchema.safeParse({
      photoUrl: 'data:image/jpeg;base64,aGVsbG8=',
    }).success,
    true
  )

  assert.equal(
    validatePhotoSchema.safeParse({
      photoUrl: 'data:image/webp;base64,aGVsbG8=',
    }).success,
    false
  )

  assert.equal(
    validatePhotoSchema.safeParse({
      photoUrl: 'data:image/png;base64,aGVsbG8=',
    }).success,
    false
  )

  assert.equal(
    validatePhotoSchema.safeParse({
      photoUrl: 'http://127.0.0.1/private',
    }).success,
    false
  )
})
