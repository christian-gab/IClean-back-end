import { randomUUID } from 'node:crypto'
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { AppError } from '../../errors/AppError.js'
import { Comment, Post, PostCategory } from '../../types/index.js'
import { IPostRepository } from '../interfaces.js'

interface PostRow extends RowDataPacket {
  id: string
  author_id: string
  author_name: string
  author_avatar_url: string | null
  text: string
  image_url: string | null
  category: PostCategory
  likes_count: number
  created_at: Date | string
}

interface CommentRow extends RowDataPacket {
  id: string
  post_id: string
  author_id: string
  author_name: string
  author_avatar_url: string | null
  text: string
  created_at: Date | string
}

interface LikeRow extends RowDataPacket {
  post_id: string
  user_id: string
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url ?? '',
    text: row.text,
    createdAt: toIso(row.created_at),
  }
}

export class MySqlPostRepository implements IPostRepository {
  constructor(private readonly pool: Pool) {}

  private async loadPosts(rows: PostRow[]): Promise<Post[]> {
    if (rows.length === 0) return []

    const ids = rows.map(row => row.id)
    const placeholders = ids.map(() => '?').join(', ')
    const [commentRows] = await this.pool.query<CommentRow[]>(
      `SELECT c.id, c.post_id, c.author_id, u.name AS author_name,
              u.avatar_url AS author_avatar_url, c.text, c.created_at
       FROM post_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id IN (${placeholders})
       ORDER BY c.created_at ASC`,
      ids
    )
    const [likeRows] = await this.pool.query<LikeRow[]>(
      `SELECT post_id, user_id FROM post_likes
       WHERE post_id IN (${placeholders})
       ORDER BY user_id ASC`,
      ids
    )

    const commentsByPost = new Map<string, Comment[]>()
    for (const row of commentRows) {
      const comments = commentsByPost.get(row.post_id) ?? []
      comments.push(toComment(row))
      commentsByPost.set(row.post_id, comments)
    }

    const likesByPost = new Map<string, string[]>()
    for (const row of likeRows) {
      const users = likesByPost.get(row.post_id) ?? []
      users.push(row.user_id)
      likesByPost.set(row.post_id, users)
    }

    return rows.map(row => ({
      id: row.id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorAvatarUrl: row.author_avatar_url ?? '',
      text: row.text,
      imageUrl: row.image_url ?? undefined,
      category: row.category,
      likes: row.likes_count,
      likedByMe: false,
      likedByUsers: likesByPost.get(row.id) ?? [],
      comments: commentsByPost.get(row.id) ?? [],
      createdAt: toIso(row.created_at),
    }))
  }

  async findAll(category?: string): Promise<Post[]> {
    const query = `SELECT p.id, p.author_id, u.name AS author_name,
                          u.avatar_url AS author_avatar_url, p.text, p.image_url,
                          p.category, p.likes_count, p.created_at
                   FROM posts p
                   JOIN users u ON u.id = p.author_id`
    const [rows] = category && category !== 'all'
      ? await this.pool.query<PostRow[]>(`${query} WHERE p.category = ? ORDER BY p.created_at DESC`, [category])
      : await this.pool.query<PostRow[]>(`${query} ORDER BY p.created_at DESC`)
    return this.loadPosts(rows)
  }

  async findById(id: string): Promise<Post | null> {
    const [rows] = await this.pool.query<PostRow[]>(
      `SELECT p.id, p.author_id, u.name AS author_name,
              u.avatar_url AS author_avatar_url, p.text, p.image_url,
              p.category, p.likes_count, p.created_at
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.id = ? LIMIT 1`,
      [id]
    )
    return (await this.loadPosts(rows))[0] ?? null
  }

  async findByAuthor(authorId: string): Promise<Post[]> {
    const [rows] = await this.pool.query<PostRow[]>(
      `SELECT p.id, p.author_id, u.name AS author_name,
              u.avatar_url AS author_avatar_url, p.text, p.image_url,
              p.category, p.likes_count, p.created_at
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE p.author_id = ?
       ORDER BY p.created_at DESC`,
      [authorId]
    )
    return this.loadPosts(rows)
  }

  async create(
    data: Omit<Post, 'id' | 'createdAt' | 'likes' | 'likedByMe' | 'likedByUsers' | 'comments'>
  ): Promise<Post> {
    const id = randomUUID()
    await this.pool.execute(
      `INSERT INTO posts (id, author_id, text, image_url, category, likes_count)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [id, data.authorId, data.text, data.imageUrl ?? null, data.category]
    )
    const post = await this.findById(id)
    if (!post) throw new Error('Publicação criada no MySQL não pôde ser carregada')
    return post
  }

  async update(id: string, updates: Partial<Post>): Promise<Post | null> {
    const columns: Partial<Record<'text' | 'imageUrl' | 'category', string>> = {
      text: 'text',
      imageUrl: 'image_url',
      category: 'category',
    }
    const assignments: string[] = []
    const values: Array<string | null> = []
    for (const field of Object.keys(columns) as Array<keyof typeof columns>) {
      const value = updates[field]
      if (value !== undefined) {
        assignments.push(`\`${columns[field]}\` = ?`)
        values.push(field === 'imageUrl' ? value ?? null : value)
      }
    }
    if (assignments.length > 0) {
      await this.pool.execute(
        `UPDATE posts SET ${assignments.join(', ')} WHERE id = ?`,
        [...values, id]
      )
    }
    return this.findById(id)
  }

  async toggleLike(postId: string, userId: string): Promise<{ post: Post; liked: boolean }> {
    const connection = await this.pool.getConnection()
    let liked = false
    try {
      await connection.beginTransaction()
      const [posts] = await connection.query<Array<RowDataPacket & { id: string }>>(
        'SELECT id FROM posts WHERE id = ? FOR UPDATE',
        [postId]
      )
      if (!posts[0]) throw new AppError('Publicação não encontrada', 404)

      const [deleted] = await connection.execute<ResultSetHeader>(
        'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      )
      if (deleted.affectedRows > 0) {
        await connection.execute(
          'UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?',
          [postId]
        )
      } else {
        await connection.execute(
          'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
          [postId, userId]
        )
        await connection.execute(
          'UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?',
          [postId]
        )
        liked = true
      }
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    const post = await this.findById(postId)
    if (!post) throw new AppError('Publicação não encontrada', 404)
    return { post, liked }
  }

  async addComment(
    postId: string,
    commentData: Omit<Comment, 'id' | 'createdAt'>
  ): Promise<Comment | null> {
    const id = randomUUID()
    await this.pool.execute(
      `INSERT INTO post_comments (id, post_id, author_id, text)
       VALUES (?, ?, ?, ?)`,
      [id, postId, commentData.authorId, commentData.text]
    )
    const [rows] = await this.pool.query<CommentRow[]>(
      `SELECT c.id, c.post_id, c.author_id, u.name AS author_name,
              u.avatar_url AS author_avatar_url, c.text, c.created_at
       FROM post_comments c JOIN users u ON u.id = c.author_id
       WHERE c.id = ? LIMIT 1`,
      [id]
    )
    if (!rows[0]) return null
    return toComment(rows[0])
  }

  async syncAuthor(_authorId: string, _authorName: string, _authorAvatarUrl: string): Promise<void> {
    // Post reads join the current user profile, so no denormalized snapshot needs updating.
  }
}
