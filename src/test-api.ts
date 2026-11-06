import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { Server } from 'node:http'
import { createApp } from './app.js'

interface ApiResponse {
  status?: string
  message?: string
  results?: number
  errors?: unknown[]
  data?: {
    user?: { id: string; email?: string; password?: string; passwordHash?: string }
    token?: string
    post?: { id: string }
    comment?: { text: string }
    progress?: { totalPoints: number }
    posts?: unknown[]
    actions?: unknown[]
    levels?: unknown[]
    achievements?: unknown[]
  }
}

async function runTests(): Promise<void> {
  const server: Server = createApp().listen(0)
  await once(server, 'listening')

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('O servidor de teste não abriu uma porta TCP')
  }

  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`
  const email = `smoke-${Date.now()}@example.test`

  async function request(
    path: string,
    init: RequestInit,
    expectedStatus: number
  ): Promise<ApiResponse> {
    const response = await fetch(`${baseUrl}${path}`, init)
    const body = await response.json() as ApiResponse
    assert.equal(
      response.status,
      expectedStatus,
      `${init.method ?? 'GET'} ${path}: ${JSON.stringify(body)}`
    )
    return body
  }

  try {
    const registerBody = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Maria Silva', email, password: 'senha-forte-123' }),
    }, 201)
    assert.ok(registerBody.data?.user?.id)
    assert.ok(registerBody.data?.token)
    assert.equal(registerBody.data.user.password, undefined)
    assert.equal(registerBody.data.user.passwordHash, undefined)

    await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Maria Silva', email: email.toUpperCase(), password: 'senha-forte-123' }),
    }, 409)

    const userId = registerBody.data.user.id
    const token = registerBody.data.token
    const authHeaders = { Authorization: `Bearer ${token}` }
    const jsonAuthHeaders = { ...authHeaders, 'Content-Type': 'application/json' }

    await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'senha-forte-123' }),
    }, 200)

    await request('/auth/me', { headers: authHeaders }, 200)
    const publicUser = await request(`/users/${userId}`, { headers: authHeaders }, 200)
    assert.equal(publicUser.data?.user?.email, undefined)
    await request(`/users/${userId}`, {
      method: 'PUT',
      headers: jsonAuthHeaders,
      body: JSON.stringify({ bio: 'Bio atualizada com sucesso!' }),
    }, 200)

    const postBody = await request('/posts', {}, 200)
    assert.ok(postBody.data?.posts)
    await request('/posts?category=recycling', {}, 200)

    const createdPost = await request('/posts', {
      method: 'POST',
      headers: jsonAuthHeaders,
      body: JSON.stringify({
        text: 'Acabei de plantar mudas nativas no parque da cidade!',
        category: 'preservation',
      }),
    }, 201)
    assert.ok(createdPost.data?.post?.id)

    const postId = createdPost.data.post.id
    await request(`/posts/${postId}/like`, {
      method: 'POST',
      headers: authHeaders,
    }, 200)

    const commentBody = await request(`/posts/${postId}/comments`, {
      method: 'POST',
      headers: jsonAuthHeaders,
      body: JSON.stringify({ text: 'Incrível iniciativa, parabéns!' }),
    }, 201)
    assert.equal(commentBody.data?.comment?.text, 'Incrível iniciativa, parabéns!')

    const actionsBody = await request('/actions', {}, 200)
    assert.ok(actionsBody.data?.actions)
    await request('/actions/action-1/complete', {
      method: 'POST',
      headers: jsonAuthHeaders,
      body: JSON.stringify({ description: 'Materiais recicláveis separados.' }),
    }, 200)

    const progressBody = await request('/progress', { headers: authHeaders }, 200)
    assert.ok(progressBody.data?.progress)
    await request('/levels', {}, 200)
    await request('/achievements', { headers: authHeaders }, 200)

    const invalidPost = await request('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'curto', category: 'invalid-cat' }),
    }, 400)
    assert.ok(invalidPost.errors?.length)

    console.log('Todos os testes de integração da API passaram.')
  } finally {
    server.close()
    await once(server, 'close')
  }
}

runTests().catch(error => {
  console.error('Falha nos testes de integração da API:', error)
  process.exitCode = 1
})
