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
│   │   ├── inMemory/       # Implementação em memória para desenvolvimento e testes
│   │   └── mysql/          # Implementação persistente para produção
│   ├── routes/             # Definição e agrupamento de rotas por domínio
│   ├── database/           # Pool de conexões MySQL
│   ├── middlewares/        # Middlewares de validação com Zod, CORS e tratamento central de erros
│   ├── validations/        # Schemas de validação de payload com Zod
│   ├── errors/             # Classe personalizada AppError para erros operacionais
│   ├── types/              # Definições de tipos e interfaces de domínio
│   ├── data/               # Migrations versionadas e carga inicial idempotente
│   ├── app.ts              # Configuração da aplicação Express, CORS e middlewares
│   ├── index.ts            # Ponto de entrada do servidor HTTP
│   └── test-api.ts         # Script automatizado de testes de ponta a ponta
├── .env.development.example
├── .env.production.example
├── package.json            # Dependências e scripts
└── tsconfig.json           # Configuração do TypeScript
```

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js versão 20+ ou 22+ instalado.
- npm ou yarn instalado.
- Para instalar e compilar o front-end, use Node.js `22.18+` ou `24.12+`.

### 1. Instalar as dependências
```bash
cd c:\Projeto-Uninter\Iclean-back
npm install
```

### 2. Configurar variáveis de ambiente
O backend carrega um arquivo por ambiente: `.env.development` em
desenvolvimento e `.env.production` em produção. Crie o arquivo local a partir
do exemplo correspondente:

```powershell
Copy-Item .env.development.example .env.development
```

No servidor de produção, crie `.env.production` a partir de
`.env.production.example` ou configure as mesmas variáveis no ambiente do
processo. `NODE_ENV=production` deve estar definido antes de iniciar a API para
selecionar o arquivo de produção. Os arquivos `.env` reais são ignorados pelo
Git; nunca envie credenciais ao repositório.

Ambos os ambientes usam MySQL. Preencha `DB_*`, `GEMINI_API_KEY` e `AUTH_SECRET`
em cada arquivo com os valores próprios daquele ambiente. Em produção,
`AUTH_SECRET` deve ter pelo menos 32 bytes; tokens atuais deixam de ser válidos
se a chave mudar. Em produção, MySQL é obrigatório e a API não inicia se o
banco ou as migrations estiverem indisponíveis.
Nunca use o prefixo `VITE_` para chaves secretas; variáveis com esse prefixo
são incorporadas ao JavaScript enviado ao navegador.

### E-mails de verificação com EmailJS

O backend envia os códigos usando a API HTTPS do EmailJS. No painel do EmailJS:

1. Conecte o serviço de e-mail que enviará as mensagens.
2. Crie um template com `To Email` igual a `{{to_email}}`, assunto
   `Seu código de verificação — IClean` e corpo contendo `{{verification_code}}`.
   Informe no corpo que o código expira em 10 minutos.
3. Copie o Service ID e o Template ID; em **Account**, obtenha a Public Key e
   crie/consulte a Private Key.

Configure estas variáveis no ambiente do backend (por exemplo, em
**Environment** no serviço da Render):

```text
EMAILJS_SERVICE_ID
EMAILJS_TEMPLATE_ID
EMAILJS_PUBLIC_KEY
EMAILJS_PRIVATE_KEY
```

Mantenha a Private Key somente no backend e não use o prefixo `VITE_`. Em
desenvolvimento, se todas as variáveis estiverem ausentes, o código aparece no
console local; em produção, a API retorna erro explícito se alguma variável
estiver faltando. A conta gratuita do EmailJS tem limite de 200 solicitações
mensais e é recomendada pelo provedor apenas para uso pessoal/baixo volume;
revise os limites e a adequação antes de depender dela para produção.

### Persistência MySQL

Crie um banco e um usuário MySQL dedicado à API; não use `root` na aplicação.
Configure `PERSISTENCE=mysql` e as credenciais `DB_*` no arquivo do ambiente
que será iniciado, então compile e aplique as migrations:

```bash
npm run build
npm run db:migrate
npm start
```

`db:migrate` cria ou atualiza tabelas sem apagar registros, grava as versões
aplicadas em `schema_migrations` e insere os dados iniciais sem duplicá-los.
As migrations criam uma chave única sobre o e-mail normalizado; se a base
existente tiver e-mails duplicados, a migration falha sem apagar dados e será
necessário resolver a duplicidade depois de fazer backup. Nunca exponha a porta
3306 à internet. No VPS, mantenha o MySQL acessível apenas localmente e use uma
conta com privilégios limitados.

O comando `npm test` executa testes MySQL quando as variáveis `DB_*` estão
configuradas. Os testes criam e removem somente bancos temporários chamados
`iclean_test_<id>`; não rode a suíte em produção.

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
npm run db:migrate
npm start
```

### Deploy: Hostinger VPS + Vercel

1. Na VPS, instale uma versão LTS do Node.js e MySQL. Crie o banco e um usuário
   exclusivo para a API; mantenha o MySQL ligado somente a `localhost`.
2. Configure firewall para expor somente SSH, HTTP e HTTPS. Use Caddy ou Nginx
   como proxy reverso com certificado TLS para o domínio da API, por exemplo
   `https://api.seudominio.com`. Configure o proxy para aceitar corpos JSON de
   até 10 MB e manter a conexão da validação Gemini por pelo menos 90 segundos.
3. Configure na VPS `NODE_ENV=production`, `PERSISTENCE=mysql`, `DB_HOST`,
   `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `AUTH_SECRET`,
   `GEMINI_API_KEY` e `CORS_ORIGIN=https://<dominio-publicado-na-vercel>` em
   `.env.production` ou nas variáveis do serviço. Não envie arquivos `.env` ao Git.
4. Compile (`npm run build`), aplique as migrations (`npm run db:migrate`) e
   mantenha `npm start` supervisionado por systemd ou outro gerenciador de
   processos. A API verifica conexão e migrations antes de iniciar.
5. Na Vercel, use Node.js `22.18+` ou `24.12+`, configure
   `VITE_API_URL=https://api.seudominio.com/api/v1` e faça um novo deploy do
   front-end.
6. Configure backups do MySQL fora da própria VPS e teste a restauração. Os
   backups da VPS ajudam, mas não substituem uma cópia independente do banco.

---

## 📡 Mapeamento Completo de Endpoints

Todos os endpoints principais utilizam o prefixo configurável `/api/v1`.

### 1. Autenticação & Usuários

| Método | Endpoint | Cabeçalhos / Parâmetros | Corpo da Requisição (Payload) | Resposta de Sucesso | Descrição |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Nenhum | `{ "name": "Ana", "email": "ana@example.com", "password": "senha-segura" }` | `201 Created` + `{ status, data: { user, token } }` | Cria uma conta; e-mail é normalizado e deve ser único |
| `POST` | `/api/v1/auth/login` | Nenhum | `{ "email": "ana@example.com", "password": "senha-segura" }` | `200 OK` + `{ status, data: { user, token } }` | Autentica uma conta existente |
| `GET` | `/api/v1/auth/me` | `Authorization: Bearer <token>` | Nenhum | `200 OK` + `{ status, data: { user } }` | Retorna o usuário autenticado |
| `GET` | `/api/v1/users/:id` | `id` (parâmetro de rota) | Nenhum | `200 OK` + `{ status, data: { user } }` | Retorna perfil público sem e-mail |
| `PUT` | `/api/v1/users/:id` | `Authorization: Bearer <token>` | `{ "name": "Novo Nome", "bio": "...", "avatarUrl": "..." }` | `200 OK` + `{ status, data: { user } }` | Atualiza somente o próprio perfil |

---

### 2. Feed & Publicações

| Método | Endpoint | Cabeçalhos / Parâmetros | Corpo da Requisição (Payload) | Resposta de Sucesso | Descrição |
|---|---|---|---|---|---|
| `GET` | `/api/v1/posts` | `?category=recycling` (query opcional) | Nenhum | `200 OK` + `{ status, results, data: { posts } }` | Lista postagens com filtro por categoria |
| `GET` | `/api/v1/posts/:id` | `id` (parâmetro de rota) | Nenhum | `200 OK` + `{ status, data: { post } }` | Retorna uma postagem específica |
| `POST` | `/api/v1/posts` | `Authorization: Bearer <token>` | `{ "text": "...", "category": "recycling", "imageUrl": "..." }` | `201 Created` + `{ data: { post, unlockedAchievements } }` | Cria nova postagem e valida conquistas |
| `POST` | `/api/v1/posts/:id/like` | `Authorization: Bearer <token>` | Nenhum | `200 OK` + `{ data: { postId, likes, likedByMe } }` | Alterna curtida (like/unlike) |
| `POST` | `/api/v1/posts/:id/comments` | `Authorization: Bearer <token>` | `{ "text": "Meu comentário..." }` | `201 Created` + `{ data: { comment } }` | Adiciona comentário em uma publicação |

---

### 3. Ações Sustentáveis & Validação com Prova

| Método | Endpoint | Cabeçalhos / Parâmetros | Corpo da Requisição (Payload) | Resposta de Sucesso | Descrição |
|---|---|---|---|---|---|
| `GET` | `/api/v1/actions` | `?category=water` (query opcional) | Nenhum | `200 OK` + `{ status, results, data: { actions } }` | Lista catálogo de ações sustentáveis |
| `GET` | `/api/v1/actions/:id` | `id` (parâmetro de rota) | Nenhum | `200 OK` + `{ status, data: { action } }` | Detalhes de uma ação específica |
| `POST` | `/api/v1/actions/:id/validate-photo` | `Authorization: Bearer <token>` | `{ "photoUrl": "data:image/jpeg;base64,...", "description": "..." }` | `200 OK` + `{ status, data: { approved, confidence, reasoning, ... } }` | Valida imagem base64 no servidor, sem expor chave Gemini |
| `POST` | `/api/v1/actions/:id/complete` | `Authorization: Bearer <token>` | `{ "photoUrl": "...", "description": "..." }` | `200 OK` + `{ message, data: { pointsEarned, progress, levelUp } }` | Envia comprovante, credita pontos e atualiza nível |

---

### 4. Progresso, Gamificação, Níveis e Conquistas

| Método | Endpoint | Cabeçalhos / Parâmetros | Corpo da Requisição (Payload) | Resposta de Sucesso | Descrição |
|---|---|---|---|---|---|
| `GET` | `/api/v1/progress` | `Authorization: Bearer <token>` | Nenhum | `200 OK` + `{ data: { progress } }` | Progresso do usuário atual (pontos, nível, histórico) |
| `GET` | `/api/v1/levels` | Nenhum | Nenhum | `200 OK` + `{ results, data: { levels } }` | Tabela de níveis do sistema |
| `GET` | `/api/v1/achievements` | `Authorization: Bearer <token>` (opcional) | Nenhum | `200 OK` + `{ results, data: { achievements } }` | Lista conquistas; sem token, todas aparecem bloqueadas |
| `POST` | `/api/v1/progress/reset` | `Authorization: Bearer <token>` | Nenhum | `200 OK` + `{ message, data: { progress } }` | Reinicia o progresso do usuário autenticado |

---

## 🔒 Validação de Dados e Tratamento de Erros

- Todas as entradas são validadas de forma estrita através de esquemas do **Zod**.
- Senhas novas são armazenadas com scrypt e nunca retornadas pela API.
- Tokens Bearer são assinados com HMAC-SHA256 e expiram após sete dias.
- A chave Gemini fica exclusivamente no ambiente do servidor; URLs remotas não são buscadas pela API de validação de fotos.
- `x-user-id` e `?userId=` não autenticam usuários nem permitem acessar dados de outra conta.
- Usuários de seed são apenas perfis demonstrativos, sem credenciais de login; registre uma conta para autenticar.
- `PERSISTENCE=memory` é destinado somente a desenvolvimento e testes; os dados são apagados ao reiniciar. Em produção, use `PERSISTENCE=mysql`: contas, publicações, curtidas, comentários e progresso ficam persistidos no MySQL.
- O e-mail é normalizado na API e a unicidade é imposta no MySQL por índice, incluindo cadastros concorrentes.
- Fotos de comprovantes e imagens podem ser data URLs; as migrations aumentam as colunas correspondentes para `LONGTEXT`.
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

No front-end `IClean`, a API base padrão é `http://localhost:3000/api/v1`.
Em produção, configure `VITE_API_URL` na Vercel e `CORS_ORIGIN` no backend com
a origem exata do front-end publicado. As rotas de foto aceitam imagens em
base64 de até 10 MB.
