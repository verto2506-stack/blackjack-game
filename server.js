const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, process.env.DATA_FILE || 'db.json');

function ensureDatabase() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], games: [] }, null, 2));
  }
}

function readDatabase() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeDatabase(data) {
  ensureDatabase();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function nextId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map(item => Number(item.id) || 0)) + 1;
}

function createDefaultAdmin() {
  const data = readDatabase();
  const alreadyExists = data.users.some(user => user.username.toLowerCase() === 'admin');
  if (!alreadyExists) {
    data.users.push({
      id: nextId(data.users),
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      saldo: 1000,
      isAdmin: 1,
      created_at: new Date().toISOString()
    });
    writeDatabase(data);
  }
}

ensureDatabase();
createDefaultAdmin();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_2024';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

const adminOnly = (req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Acesso negado' });
  next();
};

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

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username e senha são obrigatórios' });
  }

  const data = readDatabase();
  const userExists = data.users.some(user => user.username.toLowerCase() === username.toLowerCase());

  if (userExists) {
    return res.status(400).json({ error: 'Usuário já existe' });
  }

  const novoUsuario = {
    id: nextId(data.users),
    username,
    password: bcrypt.hashSync(password, 10),
    saldo: 1000,
    isAdmin: 0,
    created_at: new Date().toISOString()
  };

  data.users.push(novoUsuario);
  writeDatabase(data);

  const token = jwt.sign({ id: novoUsuario.id, username, isAdmin: false }, JWT_SECRET);
  res.json({ message: 'Usuário criado', token, saldo: 1000, isAdmin: false });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e senha são obrigatórios' });
  }

  const data = readDatabase();
  const user = data.users.find(item => item.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return res.status(400).json({ error: 'Usuário não encontrado' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: 'Senha incorreta' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
  res.json({ token, saldo: user.saldo, isAdmin: user.isAdmin });
});

app.post('/api/game/start', authenticate, (req, res) => {
  const { aposta } = req.body;
  const userId = req.user.id;

  const data = readDatabase();
  const user = data.users.find(item => item.id === userId);

  if (!user || Number(user.saldo) < Number(aposta)) {
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
    aposta,
    baralho,
    maoDealer
  });
});

app.post('/api/game/hit', authenticate, (req, res) => {
  const { baralho, maoJogador } = req.body;
  if (!Array.isArray(baralho) || !Array.isArray(maoJogador)) {
    return res.status(400).json({ error: 'Dados do jogo inválidos' });
  }

  const novaMao = [...maoJogador];
  novaMao.push(baralho.pop());
  const total = calcularMao(novaMao);

  res.json({
    jogador: novaMao,
    totalJogador: total,
    bust: total > 21
  });
});

app.post('/api/game/stand', authenticate, (req, res) => {
  const { baralho, maoJogador, maoDealer, aposta } = req.body;
  const userId = req.user.id;

  let dealer = [...maoDealer];
  let totalDealer = calcularMao(dealer);

  while (totalDealer < 17) {
    dealer.push(baralho.pop());
    totalDealer = calcularMao(dealer);
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

  const data = readDatabase();
  const userIndex = data.users.findIndex(user => user.id === userId);

  if (userIndex !== -1) {
    data.users[userIndex].saldo = Number((Number(data.users[userIndex].saldo) + Number(ganho)).toFixed(2));
  }

  data.games.push({
    id: nextId(data.games),
    user_id: userId,
    bet: Number(aposta),
    result: resultado,
    player_hand: JSON.stringify(maoJogador),
    dealer_hand: JSON.stringify(dealer),
    player_total: totalJogador,
    dealer_total: totalDealer,
    winnings: Number(ganho),
    created_at: new Date().toISOString()
  });

  writeDatabase(data);

  res.json({
    resultado,
    totalJogador,
    totalDealer,
    dealer,
    ganho,
    novoSaldo: data.users[userIndex]?.saldo ?? 0
  });
});

app.get('/api/admin/users', authenticate, adminOnly, (req, res) => {
  const data = readDatabase();
  const users = data.users
    .map(({ password, ...rest }) => rest)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(users);
});

app.post('/api/admin/add-saldo', authenticate, adminOnly, (req, res) => {
  const { userId, amount } = req.body;
  const data = readDatabase();
  const userIndex = data.users.findIndex(user => user.id === Number(userId));

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  data.users[userIndex].saldo = Number((Number(data.users[userIndex].saldo) + Number(amount)).toFixed(2));
  writeDatabase(data);

  res.json({ message: 'Saldo adicionado', novoSaldo: data.users[userIndex].saldo });
});

app.get('/api/admin/stats', authenticate, adminOnly, (req, res) => {
  const data = readDatabase();

  const stats = data.users.map(user => {
    const userGames = data.games.filter(game => game.user_id === user.id);
    const vitorias = userGames.filter(game => game.result === 'VITÓRIA').length;
    const derrotas = userGames.filter(game => game.result === 'DERROTA').length;
    const empates = userGames.filter(game => game.result === 'EMPATE').length;
    const lucro_total = userGames.reduce((sum, game) => sum + Number(game.winnings || 0), 0);

    return {
      id: user.id,
      username: user.username,
      total_jogos: userGames.length,
      vitorias,
      derrotas,
      empates,
      lucro_total
    };
  }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  res.json(stats);
});

app.get('/api/user/profile', authenticate, (req, res) => {
  const data = readDatabase();
  const user = data.users.find(item => item.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  res.json({ id: user.id, username: user.username, saldo: user.saldo });
});

app.get('/api/user/history', authenticate, (req, res) => {
  const data = readDatabase();
  const games = data.games
    .filter(game => game.user_id === req.user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50);

  res.json(games);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Login admin padrão: admin / admin123');
});

module.exports = app;
