const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Database setup
const dbPath = process.env.DATABASE_PATH || './blackjack.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err.message);
  else console.log('Conectado ao banco de dados SQLite');
});

// Criar tabelas
db.serialize(() => {
  // Tabela de usuários
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    saldo REAL DEFAULT 1000,
    isAdmin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabela de histórico de jogos
  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    bet REAL NOT NULL,
    result TEXT,
    player_hand TEXT,
    dealer_hand TEXT,
    player_total INTEGER,
    dealer_total INTEGER,
    winnings REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_2024';

// Middleware de autenticação
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// Middleware de admin
const adminOnly = (req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Acesso negado' });
  next();
};

// AUTENTICAÇÃO

// Registro
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hashedPassword],
    function(err) {
      if (err) return res.status(400).json({ error: 'Usuário já existe' });
      const token = jwt.sign({ id: this.lastID, username, isAdmin: false }, JWT_SECRET);
      res.json({ message: 'Usuário criado', token, saldo: 1000 });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Usuário não encontrado' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
    res.json({ token, saldo: user.saldo, isAdmin: user.isAdmin });
  });
});

// JOGO - Blackjack

// Função para calcular valor da mão
function calcularMao(cartas) {
  let total = 0;
  let ases = 0;
  const valores = { 'A': 11, 'K': 10, 'Q': 10, 'J': 10 };

  cartas.forEach(carta => {
    if (carta === 'A') {
      ases++;
      total += 11;
    } else if (valores[carta]) {
      total += valores[carta];
    } else {
      total += parseInt(carta);
    }
  });

  while (total > 21 && ases > 0) {
    total -= 10;
    ases--;
  }

  return total;
}

// Iniciar jogo
app.post('/api/game/start', authenticate, (req, res) => {
  const { aposta } = req.body;
  const userId = req.user.id;

  db.get('SELECT saldo FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user || user.saldo < aposta) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    const baralho = [];
    const naipes = ['♠', '♥', '♦', '♣'];
    const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    naipes.forEach(naipe => {
      valores.forEach(valor => {
        baralho.push(valor);
      });
    });

    // Embaralhar
    for (let i = baralho.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
    }

    const maoJogador = [baralho.pop(), baralho.pop()];
    const maoDealer = [baralho.pop(), baralho.pop()];

    res.json({
      gameId: Math.random().toString(36).substr(2, 9),
      jogador: maoJogador,
      dealer: [maoDealer[0], '?'],
      totalJogador: calcularMao(maoJogador),
      aposta: aposta,
      baralho: baralho,
      maoDealer: maoDealer
    });
  });
});

// Hit - Pedir carta
app.post('/api/game/hit', authenticate, (req, res) => {
  const { baralho, maoJogador } = req.body;
  maoJogador.push(baralho.pop());
  const total = calcularMao(maoJogador);

  res.json({
    jogador: maoJogador,
    totalJogador: total,
    bust: total > 21
  });
});

// Stand - Ficar
app.post('/api/game/stand', authenticate, (req, res) => {
  const { baralho, maoJogador, maoDealer, aposta } = req.body;
  const userId = req.user.id;

  let totalDealer = calcularMao(maoDealer);
  while (totalDealer < 17) {
    maoDealer.push(baralho.pop());
    totalDealer = calcularMao(maoDealer);
  }

  const totalJogador = calcularMao(maoJogador);
  let resultado = '';
  let ganho = 0;

  if (totalJogador > 21) {
    resultado = 'DERROTA';
    ganho = -aposta;
  } else if (totalDealer > 21) {
    resultado = 'VITÓRIA';
    ganho = aposta;
  } else if (totalJogador > totalDealer) {
    resultado = 'VITÓRIA';
    ganho = aposta;
  } else if (totalJogador < totalDealer) {
    resultado = 'DERROTA';
    ganho = -aposta;
  } else {
    resultado = 'EMPATE';
    ganho = 0;
  }

  // Atualizar saldo
  db.run('UPDATE users SET saldo = saldo + ? WHERE id = ?', [ganho, userId]);

  // Salvar jogo no histórico
  db.run(
    'INSERT INTO games (user_id, bet, result, player_hand, dealer_hand, player_total, dealer_total, winnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, aposta, resultado, JSON.stringify(maoJogador), JSON.stringify(maoDealer), totalJogador, totalDealer, ganho]
  );

  db.get('SELECT saldo FROM users WHERE id = ?', [userId], (err, user) => {
    res.json({
      resultado,
      totalJogador,
      totalDealer,
      dealer: maoDealer,
      ganho,
      novoSaldo: user.saldo + ganho
    });
  });
});

// PAINEL ADMIN

// Listar usuários
app.get('/api/admin/users', authenticate, adminOnly, (req, res) => {
  db.all('SELECT id, username, saldo, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users);
  });
});

// Adicionar saldo a um usuário
app.post('/api/admin/add-saldo', authenticate, adminOnly, (req, res) => {
  const { userId, amount } = req.body;

  db.run('UPDATE users SET saldo = saldo + ? WHERE id = ?', [amount, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT saldo FROM users WHERE id = ?', [userId], (err, user) => {
      res.json({ message: 'Saldo adicionado', novoSaldo: user.saldo });
    });
  });
});

// Estatísticas do jogo
app.get('/api/admin/stats', authenticate, adminOnly, (req, res) => {
  db.all(`
    SELECT 
      u.id,
      u.username,
      COUNT(g.id) as total_jogos,
      SUM(CASE WHEN g.result = 'VITÓRIA' THEN 1 ELSE 0 END) as vitorias,
      SUM(CASE WHEN g.result = 'DERROTA' THEN 1 ELSE 0 END) as derrotas,
      SUM(CASE WHEN g.result = 'EMPATE' THEN 1 ELSE 0 END) as empates,
      SUM(g.winnings) as lucro_total
    FROM users u
    LEFT JOIN games g ON u.id = g.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `, (err, stats) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(stats);
  });
});

// Perfil do usuário
app.get('/api/user/profile', authenticate, (req, res) => {
  db.get('SELECT id, username, saldo FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(user);
  });
});

// Histórico de jogos
app.get('/api/user/history', authenticate, (req, res) => {
  db.all('SELECT * FROM games WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id], (err, games) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(games);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
