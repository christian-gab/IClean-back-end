import { Pool } from 'mysql2/promise'
import { Achievement, Level, StoredUser } from '../types/index.js'
import { allAchievements, initialPosts, initialUsers, levels, sustainableActions } from './seed.js'

const additionalSeedUsers: StoredUser[] = [
  {
    id: 'user-4',
    name: 'Ricardo Alves',
    username: '@ricardo.alves',
    email: 'ricardo@seed.iclean.invalid',
    passwordHash: null,
    bio: 'Ciclista urbano e entusiasta de consumo consciente.',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ricardo&backgroundColor=d1d4f9',
    joinedAt: '2024-01-10T09:00:00.000Z',
  },
  {
    id: 'user-5',
    name: 'Mariana Costa',
    username: '@mari.costa',
    email: 'mariana@seed.iclean.invalid',
    passwordHash: null,
    bio: 'Educadora ambiental e defensora dos recursos hidricos.',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Mariana&backgroundColor=b6e3f4',
    joinedAt: '2024-02-01T11:00:00.000Z',
  },
]

function toMysqlDate(value: string): string {
  return new Date(value).toISOString().slice(0, 19).replace('T', ' ')
}

export async function seedDatabase(pool: Pool): Promise<void> {
  const users = [...initialUsers, ...additionalSeedUsers]
  for (const user of users) {
    await pool.execute(
      `INSERT IGNORE INTO users
       (id, name, username, email, password_hash, bio, avatar_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.username,
        user.email,
        user.passwordHash,
        user.bio,
        user.avatarUrl,
        toMysqlDate(user.joinedAt),
      ]
    )
  }

  for (const level of levels satisfies Level[]) {
    await pool.execute(
      `INSERT IGNORE INTO levels (name, min_points, max_points, icon, color)
       VALUES (?, ?, ?, ?, ?)`,
      [level.name, level.minPoints, level.maxPoints, level.icon, level.color]
    )
  }

  for (const achievement of allAchievements satisfies Achievement[]) {
    await pool.execute(
      `INSERT IGNORE INTO achievements (id, title, description, icon)
       VALUES (?, ?, ?, ?)`,
      [
        achievement.id,
        achievement.title,
        achievement.description,
        achievement.icon,
      ]
    )
  }

  for (const action of sustainableActions) {
    await pool.execute(
      `INSERT IGNORE INTO sustainable_actions
       (id, title, description, category, points, icon)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [action.id, action.title, action.description, action.category, action.points, action.icon]
    )
  }

  for (const post of initialPosts) {
    await pool.execute(
      `INSERT IGNORE INTO posts
       (id, author_id, text, image_url, category, likes_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        post.id,
        post.authorId,
        post.text,
        post.imageUrl ?? null,
        post.category,
        post.likes,
        toMysqlDate(post.createdAt),
      ]
    )

    for (const comment of post.comments) {
      await pool.execute(
        `INSERT IGNORE INTO post_comments
         (id, post_id, author_id, text, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          comment.id,
          post.id,
          comment.authorId,
          comment.text,
          toMysqlDate(comment.createdAt),
        ]
      )
    }
  }
}
