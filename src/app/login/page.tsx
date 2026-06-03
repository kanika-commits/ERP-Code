'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace('/dashboard');
  }

  async function sendMagicLink() {
    setError('');
    setMessage('');

    if (!email) {
      setError('Enter your email first.');
      return;
    }

    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setMessage('Login link sent. Check your email.');
  }

  return (
    <main className="login-wrap">
      <section className="login-panel">
        <h1>MRC ERP</h1>
        <p>Sign in to the development workspace for work orders, vendors, billing, approvals, and ledgers.</p>

        <form className="form" onSubmit={signInWithPassword}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              type="email"
              value={email}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
          </div>

          {message ? <div className="notice">{message}</div> : null}
          {error ? <div className="error">{error}</div> : null}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <button className="ghost-button" disabled={loading} onClick={sendMagicLink} type="button">
            Send magic link
          </button>
        </form>
      </section>
    </main>
  );
}

