# Deploy na Oracle Always Free VM com Docker Compose

Este guia descreve **uma unica forma** de subir o projeto na Oracle Always Free:

**VM + Docker Compose + PostgreSQL + backend Node + frontend Nginx**

Essa e a abordagem mais pratica para uma VM pequena, porque:

- isola banco, backend e frontend em containers
- facilita restart e upgrades
- nao depende de instalar Node e Postgres direto no host
- funciona bem nas VMs ARM da Oracle Always Free

---

## Arquitetura final

```
Internet -> Nginx (container do frontend)
             |-> / -> SPA React estatico
             |-> /api -> backend Node/Express
             |-> /health -> health check do backend

backend -> PostgreSQL (container db)
```

### O que fica em cada servico

- **db**: PostgreSQL com volume persistente
- **backend**: API Express em Node
- **frontend**: build do React servido por Nginx, com proxy para `/api`

### Ponto importante

O frontend deste projeto depende dos tipos em `backend/src/types`.
Por isso, o **build do frontend precisa enxergar a pasta `backend/` junto do
contexto de build**. Este detalhe e essencial no Docker Compose.

---

## Recomendacao de VM

Na Oracle Always Free, prefira:

- **Ubuntu 22.04 LTS** ou **Oracle Linux 8/9**
- shape **Ampere A1 Flex** se estiver disponivel
- pelo menos **2 OCPU** e **8 GB de RAM** para nao sofrer com build e banco

### Portas

Abra no firewall/VCN:

- `22` SSH
- `80` HTTP
- `443` HTTPS, se voce for adicionar TLS depois

Nao exponha `5432` para a internet.

---

## Arquivos que voce vai criar

Sugestao de estrutura:

```text
.
├── docker-compose.yml
├── .env
├── backend/
│   └── Dockerfile
└── frontend/
    ├── Dockerfile
    └── nginx.conf
```

---

## 1) Preparar a VM

### Ubuntu

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Depois, saia e entre de novo na sessao SSH.

### Oracle Linux

```bash
sudo dnf install -y docker docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

---

## 2) Clonar o repositorio

```bash
git clone <url-do-repositorio>
cd White-Label-planning-site-
```

---

## 3) Criar o arquivo `.env` da infraestrutura

Na raiz do projeto, crie um `.env` para o Compose:

```env
POSTGRES_PASSWORD=uma-senha-forte-do-postgres
APP_DB_PASSWORD=uma-senha-forte-da-app
JWT_SECRET=um-segredo-longo-e-aleatorio
CORS_ORIGINS=https://seu-dominio.com
```

### O que cada valor faz

- `POSTGRES_PASSWORD`: senha do usuario admin do container Postgres
- `APP_DB_PASSWORD`: senha da role `whitelabel_app`
- `JWT_SECRET`: segredo de assinatura dos tokens
- `CORS_ORIGINS`: origem publica do frontend

---

## 4) Criar o Dockerfile do backend

Crie [backend/Dockerfile](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/backend/Dockerfile):

```dockerfile
FROM node:20-alpine AS build
WORKDIR /repo/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /repo/backend/dist ./dist

CMD ["node", "dist/index.js"]
```

---

## 5) Criar o Dockerfile do frontend

Crie [frontend/Dockerfile](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/frontend/Dockerfile):

```dockerfile
FROM node:20-alpine AS build
WORKDIR /repo

# O frontend depende de backend/src/types no build.
COPY backend/src/types ./backend/src/types
COPY frontend/package*.json ./frontend/

WORKDIR /repo/frontend
RUN npm ci

COPY frontend/ ./

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
```

---

## 6) Criar o Nginx do frontend

Crie [frontend/nginx.conf](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/frontend/nginx.conf):

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location = /health {
        proxy_pass http://backend:4000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

---

## 7) Criar o `docker-compose.yml`

Crie [docker-compose.yml](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/docker-compose.yml):

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: whitelabel-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/db/migrations:/migrations:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: whitelabel-backend
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgres://whitelabel_app:${APP_DB_PASSWORD}@db:5432/whitelabel
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGINS: ${CORS_ORIGINS}
      TRUST_PROXY: "1"
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      args:
        VITE_API_URL: /api
    container_name: whitelabel-frontend
    depends_on:
      - backend
    ports:
      - "80:80"
    restart: unless-stopped

volumes:
  pgdata:
```

### Por que o build usa `context: .`

Porque o frontend precisa copiar `backend/src/types` durante o build.
Se o contexto fosse `./frontend`, o alias `@contracts` quebraria.

---

## 8) Subir o banco e aplicar as migrations

### 8.1 Subir somente o Postgres

```bash
docker compose up -d db
```

### 8.2 Criar o banco

```bash
docker compose exec -T db psql -U postgres -d postgres -c "CREATE DATABASE whitelabel;"
```

Se o banco ja existir, pule este passo.

### 8.3 Aplicar as migrations na ordem

```bash
for f in backend/db/migrations/*.sql; do
  docker compose exec -T db psql -U postgres -d whitelabel -f "/migrations/$(basename "$f")"
done
```

### 8.4 Trocar a senha da role da aplicacao

Depois da `0002_security.sql`, ajuste a senha da role:

```bash
docker compose exec -T db psql -U postgres -d whitelabel -c "ALTER ROLE whitelabel_app WITH PASSWORD '${APP_DB_PASSWORD}';"
```

Essa senha precisa ser a mesma usada no `DATABASE_URL` do backend.

---

## 9) Subir backend e frontend

```bash
docker compose up -d --build backend frontend
```

### Verificar status

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

---

## 10) Validar a instalacao

### Health check

```bash
curl http://seu-dominio.com/health
```

Deve responder:

```json
{ "status": "ok" }
```

### Abrir a aplicacao

```text
http://seu-dominio.com
```

### Se o login falhar

Cheque nesta ordem:

1. `docker compose logs -f backend`
2. `CORS_ORIGINS`
3. `APP_DB_PASSWORD` igual ao password da role `whitelabel_app`
4. migrations ate `0019_verify_credentials.sql`
5. `VITE_API_URL=/api` no build do frontend

---

## 11) Atualizacoes futuras

### Alterou codigo do backend

```bash
docker compose up -d --build backend
```

### Alterou codigo do frontend

```bash
docker compose up -d --build frontend
```

### Criou nova migration

1. adicione o novo arquivo em `backend/db/migrations/`
2. rode a nova migration no container `db`
3. se o backend depender dela, rebuild e reinicie o backend

### Mudou a URL publica da API

Como o frontend usa `VITE_API_URL` no build, precisa rebuildar:

```bash
docker compose up -d --build frontend
```

---

## 12) Problemas comuns

### O frontend nao encontra `@contracts`

O build esta errado. Use `context: .` no Compose e copie `backend/src/types`
no Dockerfile do frontend.

### O backend nao conecta no banco

Confirme:

- o container `db` esta no ar
- a senha da role `whitelabel_app` foi alterada
- o `DATABASE_URL` aponta para `db:5432`, nao `localhost`

### O SPA da 404 ao recarregar uma rota interna

Falta o `try_files $uri /index.html;` no Nginx do frontend.

### O login retorna 500

Quase sempre e migration faltando, especialmente a `0019_verify_credentials.sql`.

---

## 13) Referencias do projeto

- [Guia geral de deploy](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/DEPLOY.md)
- [Guia do backend](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/backend/GUIA.md)
- [README do backend](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/backend/README.md)
- [README do banco](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/backend/db/README.md)
- [Exemplo de env do frontend](C:/Users/silva/Desktop/Projetos/White-Label-planning-site-.worktrees/oracle-always-free-vm-setup-guide/frontend/.env.example)

