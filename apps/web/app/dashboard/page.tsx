'use client';

import { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import { apiBase } from '../lib/api';

type DashboardState = 'idle' | 'connecting' | 'loading' | 'success' | 'error';

interface LoanLimitData {
  maxLoanAmount: number | null;
  hasLinkedAccount: boolean;
}

interface FinancialResult {
  accountId: string;
  maxLoanAmount: number;
  averageSalary: number;
  paydayDetected: boolean;
  expenseRatio: number;
}

// Extend window for Mono Connect widget
declare global {
  interface Window {
    Connect?: new (config: MonoConnectConfig) => MonoConnectInstance;
  }
}

interface MonoConnectConfig {
  key: string;
  onSuccess: (data: { code: string }) => void;
  onClose: () => void;
  onLoad?: () => void;
}

interface MonoConnectInstance {
  open: () => void;
}

export default function DashboardPage() {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [state, setState] = useState<DashboardState>('idle');
  const [loanData, setLoanData] = useState<LoanLimitData | null>(null);
  const [financialResult, setFinancialResult] = useState<FinancialResult | null>(null);
  const [error, setError] = useState('');
  const [monoLoaded, setMonoLoaded] = useState(false);

  // Check existing loan limit when email is provided
  const checkExistingLimit = useCallback(async () => {
    if (!email) return;

    try {
      const response = await fetch(
        `${apiBase()}/api/users/me/limit?email=${encodeURIComponent(email)}`
      );

      if (response.ok) {
        const result = await response.json();
        setLoanData(result.data);
        if (result.data.hasLinkedAccount) {
          setState('success');
        }
      }
    } catch {
      // Silent fail - user may not exist yet
    }
  }, [email]);

  useEffect(() => {
    checkExistingLimit();
  }, [checkExistingLimit]);

  // Handle Mono Connect success - exchange code for account
  const handleMonoSuccess = async (data: { code: string }) => {
    setState('loading');
    setError('');

    try {
      const response = await fetch(
        `${apiBase()}/api/financial/mono/exchange?userId=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: data.code })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to link bank account');
      }

      setFinancialResult(result.data);
      setLoanData({
        maxLoanAmount: result.data.maxLoanAmount,
        hasLinkedAccount: true
      });
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process bank data');
      setState('error');
    }
  };

  // Open Mono Connect widget
  const openMonoWidget = () => {
    if (!window.Connect) {
      setError('Mono Connect is not loaded. Please refresh the page.');
      return;
    }

    if (!userId) {
      setError('Please enter your User ID first.');
      return;
    }

    setState('connecting');

    const monoConnect = new window.Connect({
      key: process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY || 'test_pk_demo',
      onSuccess: handleMonoSuccess,
      onClose: () => {
        if (state === 'connecting') {
          setState('idle');
        }
      },
      onLoad: () => {
        // Widget loaded
      }
    });

    monoConnect.open();
  };

  // Format currency display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Render Zero State - Bank not connected
  const renderZeroState = () => (
    <div className="card">
      <h2>Connect Your Bank</h2>
      <p>Link your bank account to check your loan eligibility and get an instant limit.</p>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@company.com"
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="userId">User ID</label>
        <input
          id="userId"
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter your user ID"
        />
        <small>You can find your User ID in the signup confirmation</small>
      </div>

      <button
        onClick={openMonoWidget}
        disabled={!monoLoaded || !userId}
        style={{
          opacity: !monoLoaded || !userId ? 0.5 : 1,
          cursor: !monoLoaded || !userId ? 'not-allowed' : 'pointer'
        }}
      >
        {monoLoaded ? 'Connect Bank Account' : 'Loading Mono...'}
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  );

  // Render Loading State - Processing bank data
  const renderLoadingState = () => (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2>Analyzing Your Finances</h2>
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #0f172a',
          borderRadius: '50%',
          margin: '24px auto',
          animation: 'spin 1s linear infinite'
        }}
      />
      <p>Please wait while we securely analyze your bank statement...</p>
      <small>This usually takes a few seconds</small>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  // Render Success State - Show loan limit
  const renderSuccessState = () => (
    <div className="card">
      <h2>Your Loan Limit</h2>

      <div
        style={{
          background: '#f0fdf4',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '24px'
        }}
      >
        <p style={{ margin: 0, color: '#16a34a', fontSize: '14px', fontWeight: 600 }}>
          Maximum Eligible Amount
        </p>
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: '36px',
            fontWeight: 700,
            color: '#15803d'
          }}
        >
          {loanData?.maxLoanAmount ? formatCurrency(loanData.maxLoanAmount) : 'N/A'}
        </p>
      </div>

      {financialResult && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Financial Summary</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}
          >
            <div
              style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px'
              }}
            >
              <small>Average Salary</small>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>
                {formatCurrency(financialResult.averageSalary)}
              </p>
            </div>
            <div
              style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px'
              }}
            >
              <small>Payday Detected</small>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>
                {financialResult.paydayDetected ? 'Yes ✓' : 'No'}
              </p>
            </div>
            <div
              style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px'
              }}
            >
              <small>Expense Ratio</small>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>
                {(financialResult.expenseRatio * 100).toFixed(1)}%
              </p>
            </div>
            <div
              style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px'
              }}
            >
              <small>Account Linked</small>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>Yes ✓</p>
            </div>
          </div>
        </div>
      )}

      <p className="success">
        ✓ Your bank account has been securely linked. You can now apply for loans up to your limit.
      </p>

      <button
        onClick={() => {
          setState('idle');
          setFinancialResult(null);
          setLoanData(null);
        }}
        style={{ background: '#64748b' }}
      >
        Link Another Account
      </button>
    </div>
  );

  // Render Error State
  const renderErrorState = () => (
    <div className="card">
      <h2>Something Went Wrong</h2>
      <p className="error">{error || 'An unexpected error occurred'}</p>
      <button onClick={() => setState('idle')}>Try Again</button>
    </div>
  );

  return (
    <>
      {/* Load Mono Connect Script */}
      <Script
        src="https://connect.mono.co/connect.js"
        onLoad={() => setMonoLoaded(true)}
        onError={() => setError('Failed to load Mono Connect')}
      />

      <h1>Financial Dashboard</h1>

      {state === 'idle' && renderZeroState()}
      {state === 'connecting' && renderZeroState()}
      {state === 'loading' && renderLoadingState()}
      {state === 'success' && renderSuccessState()}
      {state === 'error' && renderErrorState()}

      <div className="card">
        <small>
          API base: {apiBase()}
          <br />
          Mono Script: {monoLoaded ? 'Loaded ✓' : 'Loading...'}
        </small>
      </div>
    </>
  );
}
