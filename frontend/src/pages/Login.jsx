import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Login.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        username,
        password
      });

      onLogin(response.data.token, response.data.isAdmin || false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🎰 BLACKJACK</h1>
        <h2>{isRegister ? 'Criar Conta' : 'Login'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Processando...' : isRegister ? 'Registrar' : 'Entrar'}
          </button>
        </form>

        <p className="toggle-auth">
          {isRegister ? 'Já tem conta? ' : 'Não tem conta? '}
          <button 
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="link-button"
          >
            {isRegister ? 'Faça login' : 'Registre-se'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
