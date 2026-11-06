import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createConnection } from 'mysql2/promise'
import test from 'node:test'
import 'dotenv/config'
import { loadDatabaseConfig } from '../../config/database.js'
import { runMigrations } from '../../data/migrate.js'
import { createDatabasePool } from '../../database/pool.js'
import { AppError } from '../../errors/AppError.js'
import { MySqlActionRepository } from './MySqlActionRepository.js'
import { MySqlPostRepository } from './MySqlPostRepository.js'
import { MySqlProgressRepository } from './MySqlProgressRepository.js'
import { MySqlUserRepository } from './MySqlUserRepository.js'

const hasTestDatabaseConfig = [
  process.env.DB_HOST,
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
].every(Boolean)
const mysqlConfig = hasTestDatabaseConfig
  ? loadDatabaseConfig({ ...process.env, PERSISTENCE: 'mysql' }).mysql
  : null

test('posts, likes, comments, actions, and progress persist across repository instances', {
  skip: !mysqlConfig,
}, async () => {
  if (!mysqlConfig) return

  const database = `iclean_test_${randomUUID().replace(/-/g, '')}`
  const adminConnection = await createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
  })

  let pool: ReturnType<typeof createDatabasePool> | undefined
  try {
    await adminConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    pool = createDatabasePool({ ...mysqlConfig, database })
    await runMigrations(pool)

    const userRepository = new MySqlUserRepository(pool)
    const user = await userRepository.create({
      name: 'Persistent User',
      username: '@persistent-user',
      email: 'persistent@example.test',
      passwordHash: 'scrypt-hash',
      bio: '',
      avatarUrl: '',
    })

    const postRepository = new MySqlPostRepository(pool)
    const createdPost = await postRepository.create({
      authorId: user.id,
      authorName: user.name,
      authorAvatarUrl: user.avatarUrl,
      text: 'Persistent post',
      category: 'recycling',
      imageUrl: undefined,
    })
    assert.equal(createdPost.likes, 0)

    const like = await postRepository.toggleLike(createdPost.id, user.id)
    assert.equal(like.liked, true)
    assert.equal(like.post.likes, 1)

    await postRepository.addComment(createdPost.id, {
      authorId: user.id,
      authorName: user.name,
      authorAvatarUrl: user.avatarUrl,
      text: 'Persistent comment',
    })

    const reloadedPost = await new MySqlPostRepository(pool).findById(createdPost.id)
    assert.equal(reloadedPost?.likes, 1)
    assert.deepEqual(reloadedPost?.likedByUsers, [user.id])
    assert.equal(reloadedPost?.comments[0].text, 'Persistent comment')

    const action = await new MySqlActionRepository(pool).findById('action-1')
    assert.equal(action?.title, 'Separar materiais reciclaveis')

    const progressRepository = new MySqlProgressRepository(pool)
    const photoUrl = `data:image/png;base64,${'A'.repeat(1000)}`
    const completedAction = {
      id: randomUUID(),
      actionId: 'action-1',
      actionTitle: 'Separar materiais reciclaveis',
      points: 20,
      completedAt: new Date().toISOString(),
      photoUrl,
      description: 'Separated paper and plastic',
    }
    const completions = await Promise.allSettled([
      progressRepository.recordCompletedAction(user.id, completedAction),
      progressRepository.recordCompletedAction(user.id, {
        ...completedAction,
        id: randomUUID(),
      }),
    ])
    assert.equal(completions.filter(result => result.status === 'fulfilled').length, 1)
    const rejectedCompletion = completions.find(result => result.status === 'rejected')
    assert.ok(rejectedCompletion?.status === 'rejected')
    assert.ok(rejectedCompletion?.status === 'rejected' && rejectedCompletion.reason instanceof AppError)
    assert.equal(
      rejectedCompletion?.status === 'rejected' ? rejectedCompletion.reason.statusCode : null,
      400
    )
    await progressRepository.incrementPostsCreated(user.id)
    await progressRepository.unlockAchievements(user.id, ['ach-first-action'])

    const progress = await new MySqlProgressRepository(pool).getProgress(user.id)
    assert.equal(progress.totalPoints, 20)
    assert.equal(progress.actionsCompleted, 1)
    assert.equal(progress.postsCreated, 1)
    assert.deepEqual(progress.unlockedAchievements, ['ach-first-action'])
    assert.equal(progress.history[0].actionTitle, 'Separar materiais reciclaveis')
    assert.equal(progress.history[0].photoUrl, photoUrl)
    assert.deepEqual(await progressRepository.getAllProgressTotals(), [
      { userId: user.id, totalPoints: 20 },
    ])

    const reset = await new MySqlProgressRepository(pool).resetProgress(user.id)
    assert.equal(reset.totalPoints, 0)
    assert.equal(reset.actionsCompleted, 0)
    assert.equal(reset.history.length, 0)
    assert.deepEqual(reset.unlockedAchievements, [])
  } finally {
    await pool?.end()
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await adminConnection.end()
  }
})
