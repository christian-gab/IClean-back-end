# IClean Back-End (EcoSocial API)

API RESTful robusta desenvolvida em **Node.js**, **Express** e **TypeScript** para fornecer suporte completo ao front-end do projeto **IClean (EcoSocial)**.

---

## 🏛️ Arquitetura do Projeto

O projeto adota os princípios de **Clean Architecture** e camadas desacopladas (**Layered Architecture**):

```
IClean-back/
├── src/
│   ├── config/             # Configurações globais e variáveis de ambiente (dotenv)
│   ├── controllers/        # Controladores que lidam com requisições HTTP e respostas
│   ├── services/           # Regras de negócio, cálculos de gamificação e conquistas
│   ├── repositories/       # Abstração de persistência com interfaces desacopladas
│   │   ├── interfaces.ts   # Contratos de repositório (IUserRepository, IPostRepository, etc.)
│   │   └── inMemory/       # Implementação em memória (pronta para migração futura p/ Prisma/ORM)
│   ├── routes/             # Definição e agrupamento de rotas por domínio
│   ├── middlewares/        # Middlewares de validação com Zod, CORS e tratamento central de erros
│   ├── validations/        # Schemas de validação de payload com Zod
│   ├── errors/             # Classe personalizada AppError para erros operacionais
│   ├── types/              # Definições de tipos e interfaces de domínio
│   ├── data/               # Carga inicial de dados (seeds) fiéis aos mocks do front-end
│   ├── app.ts              # Configuração da aplicação Express, CORS e middlewares
│   ├── index.ts            # Ponto de entrada do servidor HTTP
│   └── test-api.ts         # Script automatizado de testes de ponta a ponta
├── .env.example            # Exemplo de variáveis de ambiente
├── package.json            # Dependências e scripts
└── tsconfig.json           # Configuração do TypeScript
```

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js versão 20+ ou 22+ instalado.
- npm ou yarn instalado.

### 1. Instalar as dependências
```bash
cd c:\Projeto-Uninter\Iclean-back
npm install
```

### 2. Configurar variáveis de ambiente
Copie o arquivo `.env.example` para `.env` (ou use os padrões pré-configurados):
```bash
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
API_PREFIX=/api/v1
```

### 3. Iniciar o servidor em modo de desenvolvimento (hot-reload)
```bash
npm run dev
```
O servidor estará rodando em: `http://localhost:3000`

### 4. Executar os testes automatizados da API
```bash
npm test
```

### 5. Compilar para produção e iniciar
```bash
npm run build
npm start
```

---

## 📡 Mapeamento Completo de Endpoints

Todos os endpoints principais utilizam o prefixo configurável `/api/v1`.

### 1. Autenticação & Usuários

| Método | Endpoint | Cabeçalhos / Parâmetros | Corpo da Requisição (Payload) | Resposta de Sucesso | Descrição |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Nenhum | `{ "name": "Ana", "username": "ana.eco" }` | `200 OK` + `{ status, data: { user, token } }` | Realiza login ou cadastra novo usuário |
| `GET` | `/api/v1/auth/me` | `x-user-id` (opcional) | Nenhum | `200 OK` + `{ status, data: { user } }` | Retorna o usuário logado |
| `GET` | `/api/v1/users/:id` | `id` (parâmetro de rota) | Nenhum | `200 OK` + `{ status, data: { user } }` | Retorna perfil do usuário |
| `PUT` | `/api/v1/users/:id` | `id` (parâmetro de rota) | `{ "name": "Novo Nome", "bio": "...", "avatarUrl": "..." }` | `200 OK` + `{ status, data: { user } }` | Atualiza o perfil e sincroniza posts |

---

### 2. Feed & Publicações

| Método | Endpoint | Cabeçalhos / Parâmetros | Corpo da Requisição (Payload) | Resposta de Sucesso | Descrição |
|---|---|---|---|---|---|
| `GET` | `/api/v1/posts` | `?category=recycling` (query opcional) | Nenhum | `200 OK` + `{ status, results, data: { posts } }` | Lista postagens com filtro por categoria |
| `GET` | `/api/v1/posts/:id` | `id` (parâmetro de rota) | Nenhum | `200 OK` + `{ status, data: { post } }` | Retorna uma postagem específica |
| `POST` | `/api/v1/posts` | `x-user-id` (opcional) | `{ "text": "...", "category": "recycling", "imageUrl": "..." }` | `201 Created` + `{ data: { post, unlockedAchievements } }` | Cria nova postagem e valida conquistas |
| `POST` | `/api/v1/posts/:id/like` | `id` (rota), `x-user-id` | Nenhum | `200 OK` + `{ data: { postId, likes, likedByMe } }` | Alterna curtida (like/unlike) |
| `POST` | `/api/v1/posts/:id/comments` | `id` (rota), `x-user-id` | `{ "text": "Meu comentário..." }` | `201 Created` + `{ data: { comment } }` | Adiciona comentário em uma publicação |

---

### 3. Ações Sustentáveis & Validação com Prova

| Método | Endpoint | Cabeçalhos / Parâmetros | Corpo da Requisição (Payload) | Resposta de Sucesso | Descrição |
|---|---|---|---|---|---|
| `GET` | `/api/v1/actions` | `?category=water` (query opcional) | Nenhum | `200 OK` + `{ status, results, data: { actions } }` | Lista catálogo de ações sustentáveis |
| `GET` | `/api/v1/actions/:id` | `id` (parâmetro de rota) | Nenhum | `200 OK` + `{ status, data: { action } }` | Detalhes de uma ação específica |
| `POST` | `/api/v1/actions/:id/complete` | `id` (rota), `x-user-id` | `{ "photoUrl": "...", "description": "..." }` | `200 OK` + `{ message, data: { pointsEarned, progress, levelUp } }` | Envia comprovante, credita pontos e atualiza nível |

---

### 4. Progresso, Gamificação, Níveis e Conquistas

| Método | Endpoint | Cabeçalhos / Parâmetros | Corpo da Requisição (Payload) | Resposta de Sucesso | Descrição |
|---|---|---|---|---|---|
| `GET` | `/api/v1/progress` | `x-user-id` (opcional) | Nenhum | `200 OK` + `{ data: { progress } }` | Progresso do usuário atual (pontos, nível, histórico) |
| `GET` | `/api/v1/levels` | Nenhum | Nenhum | `200 OK` + `{ results, data: { levels } }` | Tabela de níveis do sistema |
| `GET` | `/api/v1/achievements` | `?userId=...` (query opcional) | Nenhum | `200 OK` + `{ results, data: { achievements } }` | Lista de conquistas com status de desbloqueio |
| `POST` | `/api/v1/progress/reset` | `x-user-id` | Nenhum | `200 OK` + `{ message, data: { progress } }` | Reinicia o progresso (para demonstrações) |

---

## 🔒 Validação de Dados e Tratamento de Erros

- Todas as entradas são validadas de forma estrita através de esquemas do **Zod**.
- Respostas de erro retornam formato JSON uniforme:
```json
{
  "status": "error",
  "message": "Erro de validação dos dados fornecidos",
  "errors": [
    {
      "field": "text",
      "message": "A publicação deve ter no mínimo 10 caracteres"
    }
  ]
}
```

---

## 🔄 Conectando com o Front-End (IClean)

No front-end `IClean`, a API base padrão é `http://localhost:3000/api/v1`. O CORS já vem configurado com suporte para origens locais (`localhost:5173`, etc.) e suporte a uploads em base64 com limite de 10 MB.
