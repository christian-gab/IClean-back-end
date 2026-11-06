import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import type { AddressInfo } from 'node:net'
import { createApp } from './app.js'
import { inMemoryUserRepository } from './repositories/inMemory/InMemoryUserRepository.js'
import { inMemoryProgressRepository } from './repositories/inMemory/InMemoryProgressRepository.js'
import { createAuthToken } from './utils/auth.js'

test('registration, authentication, and user-scoped routes reject duplicate identities and forged credentials', async () => {
  const server = createApp().listen(0)
  await once(server, 'listening')

  const address = server.address() as AddressInfo
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`
  const email = `auth-${Date.now()}@example.test`

  try {
    const weakPasswordResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Teste Seguro',
        email: `weak-${email}`,
        password: '1234567',
      }),
    })

    assert.equal(weakPasswordResponse.status, 400)

    const registrations = await Promise.all([
      fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Teste Seguro', email, password: 'senha-forte-123' }),
      }),
      fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Teste Seguro', email: email.toUpperCase(), password: 'senha-forte-123' }),
      }),
    ])

    assert.deepEqual(
      registrations.map(response => response.status).sort(),
      [201, 409]
    )

    const createdResponse = registrations.find(response => response.status === 201)
    assert.ok(createdResponse)
    const createdBody = await createdResponse.json() as {
      data: { user: { id: string; password?: string; passwordHash?: string }; token: string }
    }

    assert.equal(createdBody.data.user.password, undefined)
    assert.equal(createdBody.data.user.passwordHash, undefined)

    const storedUser = await inMemoryUserRepository.findByEmail(email)
    assert.ok(storedUser)
    const storedPasswordHash = Reflect.get(storedUser, 'passwordHash')
    assert.equal(typeof storedPasswordHash, 'string')
    assert.notEqual(storedPasswordHash, 'senha-forte-123')
    assert.equal(Reflect.get(storedUser, 'password'), undefined)

    const bearerHeaders = { Authorization: `Bearer ${createdBody.data.token}` }
    const meResponse = await fetch(`${baseUrl}/auth/me`, { headers: bearerHeaders })
    assert.equal(meResponse.status, 200)

    const [header, payload, signature] = createdBody.data.token.split('.')
    const changedPayload = `${payload[0] === 'a' ? 'b' : 'a'}${payload.slice(1)}`
    const tamperedToken = `${header}.${changedPayload}.${signature}`
    const tamperedTokenResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    })
    assert.equal(tamperedTokenResponse.status, 401)

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toUpperCase(), password: 'senha-forte-123' }),
    })
    assert.equal(loginResponse.status, 200)

    const wrongPasswordResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'senha-errada-123' }),
    })
    assert.equal(wrongPasswordResponse.status, 401)

    const forgedIdentityResponses = await Promise.all([
      fetch(`${baseUrl}/auth/me`, { headers: { 'x-user-id': 'user-1' } }),
      fetch(`${baseUrl}/auth/me?userId=user-1`),
      fetch(`${baseUrl}/auth/me`, { headers: { Authorization: 'Bearer token-dXNlci0x-12345' } }),
    ])
    assert.deepEqual(forgedIdentityResponses.map(response => response.status), [401, 401, 401])

    const unauthedProgress = await fetch(`${baseUrl}/progress`)
    assert.equal(unauthedProgress.status, 401)

    const forgedAchievements = await fetch(`${baseUrl}/achievements?userId=user-1`)
    assert.equal(forgedAchievements.status, 403)

    const otherUserProgress = await fetch(`${baseUrl}/progress/user/user-1`, {
      headers: bearerHeaders,
    })
    assert.equal(otherUserProgress.status, 403)

    const otherUserProfile = await fetch(`${baseUrl}/users/user-1`, {
      method: 'PATCH',
      headers: { ...bearerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: 'Não deve ser permitido' }),
    })
    assert.equal(otherUserProfile.status, 403)
  } finally {
    server.close()
    await once(server, 'close')
  }
})

test('authenticated leaderboard ranks users by total points without exposing private data', async () => {
  const server = createApp().listen(0)
  await once(server, 'listening')

  const address = server.address() as AddressInfo
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`
  const userIds = ['user-1', 'user-2', 'user-3']

  try {
    await Promise.all(userIds.map(userId => inMemoryProgressRepository.resetProgress(userId)))
    await inMemoryProgressRepository.recordCompletedAction('user-1', {
      id: 'rank-action-1',
      actionId: 'rank-action-1',
      actionTitle: 'Ação de teste',
      points: 40,
      completedAt: new Date().toISOString(),
    })
    await inMemoryProgressRepository.recordCompletedAction('user-2', {
      id: 'rank-action-2',
      actionId: 'rank-action-2',
      actionTitle: 'Ação de teste',
      points: 100,
      completedAt: new Date().toISOString(),
    })
    await inMemoryProgressRepository.recordCompletedAction('user-3', {
      id: 'rank-action-3',
      actionId: 'rank-action-3',
      actionTitle: 'Ação de teste',
      points: 70,
      completedAt: new Date().toISOString(),
    })

    const unauthenticatedResponse = await fetch(`${baseUrl}/progress/leaderboard`)
    assert.equal(unauthenticatedResponse.status, 401)

    const response = await fetch(`${baseUrl}/progress/leaderboard`, {
      headers: { Authorization: `Bearer ${createAuthToken('user-1')}` },
    })
    assert.equal(response.status, 200)

    const body = await response.json() as {
      data: { leaderboard: Array<{ name: string; totalPoints: number; rank: number; email?: string }> }
    }
    assert.deepEqual(
      body.data.leaderboard.slice(0, 3).map(({ name, totalPoints, rank }) => ({ name, totalPoints, rank })),
      [
        { name: 'Carlos Mendes', totalPoints: 100, rank: 1 },
        { name: 'Beatriz Santos', totalPoints: 70, rank: 2 },
        { name: 'Ana Oliveira', totalPoints: 40, rank: 3 },
      ]
    )
    assert.equal(body.data.leaderboard.some(user => 'email' in user), false)
  } finally {
    await Promise.all(userIds.map(userId => inMemoryProgressRepository.resetProgress(userId)))
    server.close()
    await once(server, 'close')
  }
})
