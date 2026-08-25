import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Admin.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Admin({ token }) {
  const [usuarios, setUsuarios] = useState([]);
  const [stats, setStats] = useState([]);
  const [saldoToAdd, setSaldoToAdd] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarUsuarios();
    carregarStats();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsuarios(response.data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const carregarStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Erro ao carregar stats:', err);
    }
  };

  const adicionarSaldo = async (userId) => {
    const amount = saldoToAdd[userId];
    if (!amount || amount <= 0) {
      alert('Digite um valor válido');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/add-saldo`,
        { userId, amount: parseFloat(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaldoToAdd({ ...saldoToAdd, [userId]: '' });
      carregarUsuarios();
      alert('Saldo adicionado com sucesso!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao adicionar saldo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <h1>📊 Painel Administrativo</h1>

      <div className="admin-content">
        <div className="users-section">
          <h2>Usuários</h2>
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuário</th>
                <th>Saldo</th>
                <th>Data de Registro</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>R$ {user.saldo.toFixed(2)}</td>
                  <td>{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div className="saldo-input">
                      <input
                        type="number"
                        placeholder="Valor"
                        value={saldoToAdd[user.id] || ''}
                        onChange={(e) => setSaldoToAdd({ ...saldoToAdd, [user.id]: e.target.value })}
                      />
                      <button 
                        onClick={() => adicionarSaldo(user.id)} 
                        disabled={loading}
                        className="btn-add"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stats-section">
          <h2>Estatísticas dos Jogadores</h2>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Total de Jogos</th>
                <th>Vitórias</th>
                <th>Derrotas</th>
                <th>Empates</th>
                <th>Lucro Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(stat => (
                <tr key={stat.id}>
                  <td>{stat.username}</td>
                  <td>{stat.total_jogos || 0}</td>
                  <td className="positive">{stat.vitorias || 0}</td>
                  <td className="negative">{stat.derrotas || 0}</td>
                  <td>{stat.empates || 0}</td>
                  <td className={stat.lucro_total >= 0 ? 'positive' : 'negative'}>
                    R$ {(stat.lucro_total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Admin;
