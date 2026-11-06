import { Pool, RowDataPacket } from 'mysql2/promise'
import { seedDatabase } from './seedDatabase.js'

interface MigrationRow extends RowDataPacket {
  version: string
}

interface SchemaCountRow extends RowDataPacket {
  total: number
}

interface SchemaTypeRow extends RowDataPacket {
  data_type: string
}

const coreTables = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    username VARCHAR(60) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NULL,
    bio TEXT NULL,
    avatar_url LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS levels (
    id INT AUTO_INCREMENT NOT NULL,
    name VARCHAR(100) NOT NULL,
    min_points INT NOT NULL,
    max_points INT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_levels_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(255) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sustainable_actions (
    id VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('recycling', 'water', 'plastic', 'consumption', 'preservation', 'other') NOT NULL,
    points INT NOT NULL DEFAULT 10,
    icon VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS posts (
    id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    text TEXT NOT NULL,
    image_url LONGTEXT NULL,
    category ENUM('recycling', 'water', 'plastic', 'consumption', 'preservation', 'other') NOT NULL,
    likes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_posts_author (author_id),
    KEY idx_posts_category (category),
    KEY idx_posts_created_at (created_at),
    CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS post_likes (
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id),
    KEY idx_post_likes_user (user_id),
    CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS post_comments (
    id VARCHAR(36) NOT NULL,
    post_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_comments_post (post_id),
    KEY idx_comments_author (author_id),
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_completed_actions (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    action_id VARCHAR(50) NOT NULL,
    action_title VARCHAR(150) NULL,
    points_earned INT NOT NULL,
    photo_url LONGTEXT NULL,
    description TEXT NULL,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_completed_user (user_id),
    KEY idx_completed_action (action_id),
    CONSTRAINT fk_completed_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_completed_action FOREIGN KEY (action_id) REFERENCES sustainable_actions (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_achievements (
    user_id VARCHAR(36) NOT NULL,
    achievement_id VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    KEY idx_user_achievements_ach (achievement_id),
    CONSTRAINT fk_ach_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ach_achievement FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_progress (
    user_id VARCHAR(36) NOT NULL,
    total_points INT NOT NULL DEFAULT 0,
    actions_completed INT NOT NULL DEFAULT 0,
    posts_created INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
]

async function ensureColumn(
  pool: Pool,
  tableName: string,
  columnName: string,
  definition: string
): Promise<void> {
  const [rows] = await pool.query<SchemaCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )

  if (rows[0].total === 0) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`)
  }
}

async function ensureIndex(
  pool: Pool,
  tableName: string,
  indexName: string,
  definition: string
): Promise<void> {
  const [rows] = await pool.query<SchemaCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  )

  if (rows[0].total === 0) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD ${definition}`)
  }
}

async function ensureLongTextColumn(
  pool: Pool,
  tableName: string,
  columnName: string
): Promise<void> {
  const [rows] = await pool.query<SchemaTypeRow[]>(
    `SELECT DATA_TYPE AS data_type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )

  if (rows[0] && rows[0].data_type.toLowerCase() !== 'longtext') {
    await pool.query(
      `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\` LONGTEXT NULL`
    )
  }
}

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

  const [appliedRows] = await pool.query<MigrationRow[]>(
    'SELECT version FROM schema_migrations'
  )
  const applied = new Set(appliedRows.map(row => row.version))

  if (!applied.has('001_core_tables')) {
    for (const statement of coreTables) {
      await pool.query(statement)
    }
    await pool.query(
      'INSERT INTO schema_migrations (version) VALUES (?)',
      ['001_core_tables']
    )
  }

  if (!applied.has('002_persistent_progress_and_normalized_email')) {
    await ensureColumn(
      pool,
      'users',
      'email_normalized',
      'VARCHAR(254) GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED'
    )
    await ensureIndex(
      pool,
      'users',
      'uk_users_email_normalized',
      'UNIQUE KEY uk_users_email_normalized (email_normalized)'
    )
    await ensureColumn(pool, 'posts', 'likes_count', 'INT NOT NULL DEFAULT 0')
    await ensureColumn(pool, 'user_completed_actions', 'action_title', 'VARCHAR(150) NULL')
    await ensureLongTextColumn(pool, 'users', 'avatar_url')
    await ensureLongTextColumn(pool, 'posts', 'image_url')
    await ensureLongTextColumn(pool, 'user_completed_actions', 'photo_url')
    await pool.query(coreTables[9])
    await pool.query(
      'INSERT INTO schema_migrations (version) VALUES (?)',
      ['002_persistent_progress_and_normalized_email']
    )
  }

  await seedDatabase(pool)
}
