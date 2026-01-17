'use client';

import { useState } from 'react';
import { apiBase } from '../lib/api';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setToken('');

    try {
      const response = await fetch(`${apiBase()}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? 'Failed to sign up.');
        return;
      }

      setMessage('Signup successful. Check your email to verify.');
      setToken(data?.verificationToken ?? '');
      setEmail('');
    } catch {
      setError('Network error.');
    }
  }

  return (
    <div className="card">
      <h2>User signup</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Company email</label>
        <input
          id="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="user@acme.com"
          required
        />
        <button type="submit">Create account</button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {token ? (
        <p>
          <small>Verification token (dev only): {token}</small>
        </p>
      ) : null}
      <small>API base: {apiBase()}</small>
    </div>
  );
}
