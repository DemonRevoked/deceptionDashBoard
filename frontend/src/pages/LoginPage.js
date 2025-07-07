import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { login as apiLogin } from '../api';
import styles from '../styles/LoginPage.module.css';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiLogin(username, password);
      login(data.token); // Pass token to auth context to finalize login
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Invalid username or password.');
      } else {
        // Handle network errors or other unexpected server issues
        setError('Login failed. Could not connect to the server.');
        console.error('An unexpected login error occurred:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h2>Admin Login</h2>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.inputGroup}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;