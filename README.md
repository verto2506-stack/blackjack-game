# 🎰 Blackjack Game - Jogo com Painel Admin

Um jogo de Blackjack completo com backend Node.js/Express e frontend React, incluindo um painel administrativo para gerenciar usuários e saldos.

## 🎯 Funcionalidades

### 🎮 Jogo
- ✅ Blackjack com regras reais
- ✅ Sistema de apostas
- ✅ Histórico de jogos
- ✅ Cálculo automático de mãos
- ✅ Dealer automático
- ✅ Animações e interface intuitiva

### 👤 Usuários
- ✅ Registro e login com segurança (JWT)
- ✅ Saldo de créditos
- ✅ Histórico de jogadas
- ✅ Estatísticas pessoais

### 🔐 Painel Admin
- ✅ Visualizar todos os usuários
- ✅ Adicionar saldo aos usuários
- ✅ Estatísticas de jogadores (vitórias, derrotas, lucro)
- ✅ Acesso restrito com autenticação

## 🛠️ Instalação

### Backend

```bash
# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env

# Iniciar servidor (porta 5000)
npm start

# Ou em modo desenvolvimento com hot reload
npm run dev
```

### Frontend

```bash
# Entrar no diretório frontend
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (porta 3000)
npm run dev

# Build para produção
npm run build
```

## 📊 Estrutura do Banco de Dados

### Tabela: users
```sql
- id (PRIMARY KEY)
- username (UNIQUE)
- password (hash bcrypt)
- saldo (default: 1000)
- isAdmin (default: 0)
- created_at
```

### Tabela: games
```sql
- id (PRIMARY KEY)
- user_id (FK)
- bet (aposta)
- result (VITÓRIA/DERROTA/EMPATE)
- player_hand (JSON)
- dealer_hand (JSON)
- player_total
- dealer_total
- winnings (lucro/prejuízo)
- created_at
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login

### Jogo
- `POST /api/game/start` - Iniciar novo jogo
- `POST /api/game/hit` - Pedir uma carta
- `POST /api/game/stand` - Finalizar jogo

### Perfil do Usuário
- `GET /api/user/profile` - Dados do usuário
- `GET /api/user/history` - Histórico de jogos

### Admin (requer isAdmin = true)
- `GET /api/admin/users` - Listar todos os usuários
- `POST /api/admin/add-saldo` - Adicionar saldo a um usuário
- `GET /api/admin/stats` - Estatísticas de todos os jogadores

## 🎲 Regras do Blackjack

1. **Objetivo**: Ter uma mão com valor total mais próximo de 21 do que a do dealer, sem ultrapassá-lo
2. **Cartas**: 
   - Ás = 11 (ou 1 se necessário para não estourar)
   - 10, J, Q, K = 10
   - 2-9 = valor nominal
3. **Dealer**: Compra cartas até atingir 17 ou mais
4. **Ganhar**: 
   - Sua mão > mão do dealer = ganho = aposta
   - Dealer estoura = ganho = aposta
   - Empate = saldo volta
   - Sua mão > 21 = derrota = perda da aposta

## 💰 Sistema de Apostas

- Créditos iniciais: R$ 1.000
- Admin pode adicionar mais créditos
- Ganhos e perdas são atualizados em tempo real
- Histórico completo de todas as jogadas

## 🔒 Segurança

- Senhas com hash bcrypt
- Autenticação JWT
- Acesso Admin protegido
- Validação de saldo antes de apostas

## 📁 Estrutura de Pastas

```
blackjack-game/
├── server.js              # Backend principal
├── blackjack.db          # Banco de dados SQLite
├── package.json
├── .env
├── .gitignore
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── index.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Game.jsx
    │   │   └── Admin.jsx
    │   ├── components/
    │   │   └── Navbar.jsx
    │   ├── services/
    │   │   └── api.js
    │   └── styles/
    │       ├── App.css
    │       ├── Navbar.css
    │       ├── Login.css
    │       ├── Game.css
    │       └── Admin.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
```

## 🚀 Como Usar

### Primeiro Acesso
1. Abra `http://localhost:3000`
2. Clique em "Registre-se"
3. Crie uma conta com username e senha
4. Receba R$ 1.000 de créditos iniciais

### Jogar
1. Faça login
2. Defina o valor da aposta
3. Clique em "Iniciar Jogo"
4. Use "Pedir Carta" ou "Ficar"
5. Veja o resultado e saldo atualizado

### Painel Admin
1. Login com conta admin
2. Clique em "🔐 Admin" na barra de navegação
3. Visualize usuários e estatísticas
4. Adicione saldo digitando o valor e clicando "+"

## 📝 Exemplo de Requisição

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"seu_user","password":"sua_senha"}'
```

Resposta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "saldo": 1000,
  "isAdmin": false
}
```

## 🐛 Troubleshooting

**Erro: "Conectado ao banco de dados SQLite"**
- Backend conectado com sucesso ✅

**Erro de CORS**
- Certifique-se que o backend está rodando na porta 5000
- Frontend na porta 3000

**Token expirado**
- Faça login novamente

## 📄 Licença
MIT

---

💡 **Desenvolvido com ❤️ para diversão e aprendizado**
