import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const DUMMY_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(KEY_LENGTH * 2)}`

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }
      resolve(derivedKey)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await deriveKey(password, salt)
  return `scrypt$${salt}$${derivedKey.toString('hex')}`
}

export async function verifyPassword(
  password: string,
  storedHash?: string | null
): Promise<boolean> {
  const encodedHash = storedHash ?? DUMMY_HASH
  const [algorithm, salt, digest] = encodedHash.split('$')
  if (
    algorithm !== 'scrypt' ||
    !salt ||
    !/^[a-f0-9]{128}$/i.test(digest ?? '')
  ) {
    return false
  }

  const derivedKey = await deriveKey(password, salt)
  const expectedKey = Buffer.from(digest, 'hex')
  const matches = timingSafeEqual(derivedKey, expectedKey)
  return Boolean(storedHash) && matches
}
