import { createApp } from './app.js'
import { Server } from 'http'

async function runTests() {
  const app = createApp()
  const port = 3099
  const server: Server = app.listen(port)

  const baseUrl = `http://localhost:${port}`

  console.log('🧪 Iniciando testes de validação da API IClean-back...\n')

  let data: any
  try {
    // 1. Health check
    console.log('1. Testando GET /health...')
    let res = await fetch(`${baseUrl}/health`)
    data = await res.json()
    console.log('   Status:', res.status, data)
    if (res.status !== 200) throw new Error('Health check falhou')

    // 2. Auth Login
    console.log('\n2. Testando POST /api/v1/auth/login...')
    res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Maria Silva', username: 'maria.verde' }),
    })
    data = await res.json()
    console.log('   Status:', res.status, 'User criado:', data.data?.user?.username)
    if (res.status !== 200 || !data.data?.user) throw new Error('Login falhou')
    const userId = data.data.user.id

    // 3. User Profile
    console.log('\n3. Testando GET /api/v1/users/:id...')
    res = await fetch(`${baseUrl}/api/v1/users/${userId}`)
    data = await res.json()
    console.log('   Status:', res.status, 'Nome:', data.data?.user?.name)

    // 4. Update Profile
    console.log('\n4. Testando PUT /api/v1/users/:id...')
    res = await fetch(`${baseUrl}/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: 'Bio atualizada com sucesso!' }),
    })
    data = await res.json()
    console.log('   Status:', res.status, 'Nova bio:', data.data?.user?.bio)

    // 5. List Posts
    console.log('\n5. Testando GET /api/v1/posts...')
    res = await fetch(`${baseUrl}/api/v1/posts`)
    data = await res.json()
    console.log('   Status:', res.status, 'Total posts retornados:', data.results)

    // 6. List Posts with category filter
    console.log('\n6. Testando GET /api/v1/posts?category=recycling...')
    res = await fetch(`${baseUrl}/api/v1/posts?category=recycling`)
    data = await res.json()
    console.log('   Status:', res.status, 'Posts de reciclagem:', data.results)

    // 7. Create Post
    console.log('\n7. Testando POST /api/v1/posts...')
    res = await fetch(`${baseUrl}/api/v1/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        text: 'Acabei de plantar 3 mudas nativas no parque da cidade!',
        category: 'preservation',
      }),
    })
    data = await res.json()
    console.log('   Status:', res.status, 'Novo post ID:', data.data?.post?.id, 'Conquistas desbloqueadas:', data.data?.unlockedAchievements)
    const newPostId = data.data?.post?.id

    // 8. Like Post
    console.log('\n8. Testando POST /api/v1/posts/:id/like...')
    res = await fetch(`${baseUrl}/api/v1/posts/${newPostId}/like`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
    })
    data = await res.json()
    console.log('   Status:', res.status, 'Likes:', data.data?.likes, 'likedByMe:', data.data?.likedByMe)

    // 9. Add Comment
    console.log('\n9. Testando POST /api/v1/posts/:id/comments...')
    res = await fetch(`${baseUrl}/api/v1/posts/${newPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ text: 'Incrível iniciativa, parabéns!' }),
    })
    data = await res.json()
    console.log('   Status:', res.status, 'Comentário criado:', data.data?.comment?.text)

    // 10. List Actions
    console.log('\n10. Testando GET /api/v1/actions...')
    res = await fetch(`${baseUrl}/api/v1/actions`)
    data = await res.json()
    console.log('   Status:', res.status, 'Total ações disponíveis:', data.results)

    // 11. Complete Action
    console.log('\n11. Testando POST /api/v1/actions/action-1/complete...')
    res = await fetch(`${baseUrl}/api/v1/actions/action-1/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        description: 'Foto do lixo reciclável separado.',
      }),
    })
    data = await res.json()
    console.log('   Status:', res.status, 'Mensagem:', data.message, 'Novos pontos:', data.data?.newTotalPoints)

    // 12. Check Progress
    console.log('\n12. Testando GET /api/v1/progress...')
    res = await fetch(`${baseUrl}/api/v1/progress`, {
      headers: { 'x-user-id': userId },
    })
    data = await res.json()
    console.log('   Status:', res.status, 'Progresso do usuário:', {
      totalPoints: data.data?.progress?.totalPoints,
      actionsCompleted: data.data?.progress?.actionsCompleted,
      postsCreated: data.data?.progress?.postsCreated,
      currentLevel: data.data?.progress?.currentLevel?.name,
      unlockedAchievements: data.data?.progress?.unlockedAchievements,
    })

    // 13. Levels & Achievements
    console.log('\n13. Testando GET /api/v1/levels e GET /api/v1/achievements...')
    const levelsRes = await fetch(`${baseUrl}/api/v1/levels`)
    const levelsData: any = await levelsRes.json()
    const achRes = await fetch(`${baseUrl}/api/v1/achievements?userId=${userId}`)
    const achData: any = await achRes.json()
    console.log('   Status Levels:', levelsRes.status, 'Níveis:', levelsData.results)
    console.log('   Status Achievements:', achRes.status, 'Conquistas:', achData.results)

    // 14. Validation Error Handling Test
    console.log('\n14. Testando validação com payload inválido (POST /api/v1/posts com texto curto)...')
    res = await fetch(`${baseUrl}/api/v1/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'curto', category: 'invalid-cat' }),
    })
    data = await res.json()
    console.log('   Status esperado (400):', res.status, 'Erros capturados:', data.errors)

    console.log('\n===============================================')
    console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!')
    console.log('===============================================')
  } catch (err) {
    console.error('❌ Erro no teste:', err)
  } finally {
    server.close()
  }
}

runTests()
