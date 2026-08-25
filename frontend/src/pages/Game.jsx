import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Game.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Game({ token }) {
  const [saldo, setSaldo] = useState(0);
  const [aposta, setAposta] = useState(10);
  const [gameState, setGameState] = useState('betting'); // betting, playing, finished
  const [jogador, setJogador] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [totalJogador, setTotalJogador] = useState(0);
  const [totalDealer, setTotalDealer] = useState(0);
  const [resultado, setResultado] = useState('');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    carregarPerfil();
    carregarHistorico();
  }, []);

  const carregarPerfil = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSaldo(response.data.saldo);
    } catch (err) {
      console.error(err);
    }
  };

  const carregarHistorico = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const iniciarJogo = async () => {
    if (aposta > saldo) {
      alert('Saldo insuficiente!');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/game/start`,
        { aposta },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGameData(response.data);
      setJogador(response.data.jogador);
      setDealer(response.data.dealer);
      setTotalJogador(response.data.totalJogador);
      setGameState('playing');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao iniciar jogo');
    } finally {
      setLoading(false);
    }
  };

  const pedir = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/game/hit`,
        {
          baralho: gameData.baralho,
          maoJogador: jogador
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setJogador(response.data.jogador);
      setTotalJogador(response.data.totalJogador);

      if (response.data.bust) {
        finalizarJogo();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const ficar = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/game/stand`,
        {
          baralho: gameData.baralho,
          maoJogador: jogador,
          maoDealer: gameData.maoDealer,
          aposta: gameData.aposta
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDealer(response.data.dealer);
      setTotalDealer(response.data.dealer_total || calcularTotal(response.data.dealer));
      setResultado(response.data.resultado);
      setSaldo(response.data.novoSaldo);
      setGameState('finished');
      carregarHistorico();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotal = (cartas) => {
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
  };

  const finalizarJogo = () => {
    setGameState('finished');
  };

  const novoJogo = () => {
    setGameState('betting');
    setJogador([]);
    setDealer([]);
    setTotalJogador(0);
    setTotalDealer(0);
    setResultado('');
    setGameData(null);
  };

  return (
    <div className="game-container">
      <div className="game-main">
        <div className="info-box">
          <h2>💰 Saldo: R$ {saldo.toFixed(2)}</h2>
        </div>

        {gameState === 'betting' && (
          <div className="betting-box">
            <h2>Faça sua Aposta</h2>
            <input
              type="number"
              min="1"
              max={saldo}
              value={aposta}
              onChange={(e) => setAposta(parseFloat(e.target.value))}
            />
            <button onClick={iniciarJogo} disabled={loading} className="btn-primary">
              Iniciar Jogo
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="game-board">
            <div className="dealer-section">
              <h3>Dealer</h3>
              <div className="cards">
                {dealer.map((carta, idx) => (
                  <div key={idx} className="card">{carta}</div>
                ))}
              </div>
            </div>

            <div className="player-section">
              <h3>Seu Total: {totalJogador}</h3>
              <div className="cards">
                {jogador.map((carta, idx) => (
                  <div key={idx} className="card">{carta}</div>
                ))}
              </div>
            </div>

            <div className="actions">
              <button onClick={pedir} disabled={loading} className="btn-secondary">
                Pedir Carta
              </button>
              <button onClick={ficar} disabled={loading} className="btn-primary">
                Ficar
              </button>
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="result-box">
            <h2 className={resultado === 'VITÓRIA' ? 'win' : resultado === 'DERROTA' ? 'loss' : 'draw'}>
              {resultado === 'VITÓRIA' ? '🎉 VOCÊ VENCEU!' : resultado === 'DERROTA' ? '❌ VOCÊ PERDEU' : '🤝 EMPATE'}
            </h2>
            <p>Seu total: {totalJogador}</p>
            <p>Dealer: {totalDealer}</p>
            <button onClick={novoJogo} className="btn-primary">Novo Jogo</button>
          </div>
        )}
      </div>

      <div className="history-box">
        <h3>Últimos Jogos</h3>
        <div className="history-list">
          {history.slice(0, 10).map((game, idx) => (
            <div key={idx} className="history-item">
              <span>{game.result}</span>
              <span>R$ {game.bet}</span>
              <span className={game.winnings >= 0 ? 'positive' : 'negative'}>
                {game.winnings >= 0 ? '+' : ''} R$ {game.winnings.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Game;
