CREATE DATABASE IF NOT EXISTS `Iclean` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `Iclean`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `user_achievements`;
DROP TABLE IF EXISTS `post_likes`;
DROP TABLE IF EXISTS `post_comments`;
DROP TABLE IF EXISTS `user_completed_actions`;
DROP TABLE IF EXISTS `posts`;
DROP TABLE IF EXISTS `sustainable_actions`;
DROP TABLE IF EXISTS `achievements`;
DROP TABLE IF EXISTS `levels`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `bio` TEXT NULL,
  `avatar_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `levels` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `min_points` INT NOT NULL,
  `max_points` INT NOT NULL,
  `icon` VARCHAR(50) NOT NULL,
  `color` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_levels_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `achievements` (
  `id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `icon` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sustainable_actions` (
  `id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('recycling', 'water', 'plastic', 'consumption', 'preservation', 'other') NOT NULL,
  `points` INT NOT NULL DEFAULT 10,
  `icon` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `posts` (
  `id` VARCHAR(36) NOT NULL,
  `author_id` VARCHAR(36) NOT NULL,
  `text` TEXT NOT NULL,
  `image_url` VARCHAR(500) NULL,
  `category` ENUM('recycling', 'water', 'plastic', 'consumption', 'preservation', 'other') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_posts_author` (`author_id`),
  KEY `idx_posts_category` (`category`),
  KEY `idx_posts_created_at` (`created_at` DESC),
  CONSTRAINT `fk_posts_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `post_likes` (
  `post_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `user_id`),
  KEY `idx_post_likes_user` (`user_id`),
  CONSTRAINT `fk_likes_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `post_comments` (
  `id` VARCHAR(36) NOT NULL,
  `post_id` VARCHAR(36) NOT NULL,
  `author_id` VARCHAR(36) NOT NULL,
  `text` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comments_post` (`post_id`),
  KEY `idx_comments_author` (`author_id`),
  CONSTRAINT `fk_comments_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_completed_actions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `action_id` VARCHAR(50) NOT NULL,
  `points_earned` INT NOT NULL,
  `photo_url` VARCHAR(500) NULL,
  `description` TEXT NULL,
  `completed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_completed_user` (`user_id`),
  KEY `idx_completed_action` (`action_id`),
  CONSTRAINT `fk_completed_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_completed_action` FOREIGN KEY (`action_id`) REFERENCES `sustainable_actions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_achievements` (
  `user_id` VARCHAR(36) NOT NULL,
  `achievement_id` VARCHAR(50) NOT NULL,
  `unlocked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `achievement_id`),
  KEY `idx_user_achievements_ach` (`achievement_id`),
  CONSTRAINT `fk_ach_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ach_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `levels` (`name`, `min_points`, `max_points`, `icon`, `color`) VALUES
('Semente', 0, 99, 'Sprout', '#a8a29e'),
('Broto', 100, 299, 'Leaf', '#22c55e'),
('Arvore', 300, 699, 'Trees', '#16a34a'),
('Guardiao Ambiental', 700, 99999, 'Globe', '#15803d');

INSERT INTO `achievements` (`id`, `title`, `description`, `icon`) VALUES
('ach-first-action', 'Primeira Acao', 'Registrou sua primeira acao sustentavel.', 'Star'),
('ach-5-actions', 'Agente Verde', 'Concluiu 5 acoes sustentaveis.', 'Award'),
('ach-10-actions', 'Guardiao da Terra', 'Concluiu 10 acoes sustentaveis.', 'Shield'),
('ach-first-post', 'Voz da Natureza', 'Realizou sua primeira publicacao.', 'MessageSquare'),
('ach-5-posts', 'Influenciador Ecologico', 'Realizou 5 publicacoes.', 'Megaphone');

INSERT INTO `sustainable_actions` (`id`, `title`, `description`, `category`, `points`, `icon`) VALUES
('action-1', 'Separar materiais reciclaveis', 'Separe plastico, papel, vidro e metal do lixo organico para facilitar a reciclagem.', 'recycling', 20, 'Recycle'),
('action-2', 'Usar garrafa reutilizavel', 'Utilize uma garrafa de agua reutilizavel no lugar de garrafa PET descartavel.', 'plastic', 15, 'GlassWater'),
('action-3', 'Recusar sacolas plasticas', 'Leve sua propria sacola reutilizavel para as compras e recuse sacolas plasticas.', 'plastic', 10, 'ShoppingBag'),
('action-4', 'Reduzir tempo no banho', 'Reduza o tempo do banho para menos de 5 minutos e economize agua.', 'water', 25, 'Droplets'),
('action-5', 'Fechar a torneira ao escovar dentes', 'Feche a torneira enquanto escova os dentes, economizando ate 12 litros de agua.', 'water', 10, 'Droplet'),
('action-6', 'Reutilizar materiais', 'Reutilize embalagens, papeis e outros materiais antes de descarta-los.', 'recycling', 15, 'RefreshCcw'),
('action-7', 'Comprar produtos locais', 'Prefira produtos de produtores locais para reduzir o impacto do transporte.', 'consumption', 20, 'MapPin'),
('action-8', 'Plantar uma muda ou arbusto', 'Contribua para o verde urbano plantando uma muda ou arbusto na sua regiao.', 'preservation', 50, 'Sprout'),
('action-9', 'Usar transporte coletivo ou bicicleta', 'Substitua o carro por onibus, metro ou bicicleta em um de seus trajetos do dia.', 'consumption', 30, 'Bike'),
('action-10', 'Compostar residuos organicos', 'Inicie uma composteira em casa para transformar residuos organicos em adubo.', 'recycling', 40, 'Leaf');

INSERT INTO `users` (`id`, `name`, `username`, `bio`, `avatar_url`, `created_at`) VALUES
('user-1', 'Ana Oliveira', '@ana.eco', 'Apaixonada por natureza e sustentabilidade. Acredito que pequenas acoes fazem grande diferenca.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ana&backgroundColor=b6e3f4', '2024-03-15 10:00:00'),
('user-2', 'Carlos Mendes', '@carlos.verde', 'Praticante de compostagem e reciclador apaixonado.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=Carlos&backgroundColor=c0aede', '2024-02-10 08:00:00'),
('user-3', 'Beatriz Santos', '@bia.sustentavel', 'Defensora do consumo consciente e estilo de vida lixo zero.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=Beatriz&backgroundColor=ffd5dc', '2024-01-20 14:00:00'),
('user-4', 'Ricardo Alves', '@ricardo.alves', 'Ciclista urbano e entusiasta de consumo consciente.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ricardo&backgroundColor=d1d4f9', '2024-01-10 09:00:00'),
('user-5', 'Mariana Costa', '@mari.costa', 'Educadora ambiental e defensora dos recursos hidricos.', 'https://api.dicebear.com/9.x/avataaars/svg?seed=Mariana&backgroundColor=b6e3f4', '2024-02-01 11:00:00');

INSERT INTO `posts` (`id`, `author_id`, `text`, `image_url`, `category`, `created_at`) VALUES
('post-1', 'user-2', 'Acabei de montar minha composteira em casa! Leva uns 30 dias pra funcionar direito, mas ja estou animado. Quem mais faz compostagem por aqui?', NULL, 'recycling', '2024-08-10 09:00:00'),
('post-2', 'user-3', 'Dica rapida: ao invez de sacola plastica, use uma ecobag. Uma sacola reutilizavel dura anos e evita centenas de sacolas plasticas. Ja adotei ha 3 anos e nao me arrependo!', NULL, 'plastic', '2024-08-09 14:30:00'),
('post-3', 'user-4', 'Comecei a usar a bicicleta para ir ao trabalho 3 vezes por semana. Alem de ajudar o planeta, estou economizando combustivel e melhorando minha saude. Recomendo muito!', NULL, 'consumption', '2024-08-08 08:00:00'),
('post-4', 'user-1', 'Plantei um jabuticabeiro no quintal! Pequeno gesto, grande impacto ao longo do tempo. Preservar areas verdes, mesmo que pequenas, faz toda a diferenca para a fauna local.', NULL, 'preservation', '2024-08-07 10:00:00'),
('post-5', 'user-5', 'Sabia que fechar a torneira enquanto escova os dentes economiza ate 12 litros de agua por vez? Habito simples, impacto enorme. Compartilhe essa dica!', NULL, 'water', '2024-08-06 15:00:00');

INSERT INTO `post_comments` (`id`, `post_id`, `author_id`, `text`, `created_at`) VALUES
('c-1', 'post-1', 'user-3', 'Faco ha 2 anos! O adubo fica incrivel para as plantas.', '2024-08-10 12:00:00'),
('c-2', 'post-3', 'user-2', 'Excelente iniciativa! A cidade fica mais agradavel com mais ciclistas.', '2024-08-08 11:00:00'),
('c-3', 'post-3', 'user-1', 'Estou tentando fazer o mesmo. Qual bicicleta voce usa?', '2024-08-08 13:00:00');
