/**
 * In-memory store for email verification codes.
 * Codes expire after TTL_MS (10 minutes by default).
 * Each entry is keyed by normalized email.
 */

interface VerificationEntry {
  code: string
  expiresAt: number
  attempts: number
}

const TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

export class VerificationStore {
  private readonly store = new Map<string, VerificationEntry>()

  /** Save a code for an email, overwriting any existing entry. */
  set(email: string, code: string): void {
    this.store.set(email.toLowerCase(), {
      code,
      expiresAt: Date.now() + TTL_MS,
      attempts: 0,
    })
  }

  /**
   * Verify a code for an email.
   * Returns 'ok' | 'invalid' | 'expired' | 'too_many_attempts'
   */
  verify(email: string, code: string): 'ok' | 'invalid' | 'expired' | 'too_many_attempts' {
    const key = email.toLowerCase()
    const entry = this.store.get(key)

    if (!entry) return 'expired'

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return 'expired'
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      this.store.delete(key)
      return 'too_many_attempts'
    }

    entry.attempts += 1

    if (entry.code !== code) {
      return 'invalid'
    }

    this.store.delete(key)
    return 'ok'
  }

  /** Check if a pending (non-expired) entry exists for the email. */
  has(email: string): boolean {
    const key = email.toLowerCase()
    const entry = this.store.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return false
    }
    return true
  }

  /** Remove an entry (e.g. on successful registration). */
  delete(email: string): void {
    this.store.delete(email.toLowerCase())
  }
}

export const verificationStore = new VerificationStore()

