'use client';

import { useState } from 'react';
import { apiBase } from '../../lib/api';

export default function AdminOnboardingPage() {
  const [name, setName] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [paydayDay, setPaydayDay] = useState(25);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${apiBase()}/api/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emailDomain, paydayDay })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? 'Failed to create company.');
        return;
      }

      setMessage(`Company created: ${data.name} (${data.emailDomain})`);
      setName('');
      setEmailDomain('');
      setPaydayDay(25);
    } catch {
      setError('Network error.');
    }
  }

  return (
    <div className="card">
      <h2>Company onboarding</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Company name</label>
        <input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acme Ltd"
          required
        />

        <label htmlFor="emailDomain">Company email domain</label>
        <input
          id="emailDomain"
          value={emailDomain}
          onChange={(event) => setEmailDomain(event.target.value)}
          placeholder="acme.com"
          required
        />

        <label htmlFor="paydayDay">Payday day-of-month</label>
        <input
          id="paydayDay"
          type="number"
          min={1}
          max={28}
          value={paydayDay}
          onChange={(event) => setPaydayDay(Number(event.target.value))}
          required
        />

        <button type="submit">Create company</button>
      </form>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <small>API base: {apiBase()}</small>
    </div>
  );
}
