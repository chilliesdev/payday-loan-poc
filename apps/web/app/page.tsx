export default function HomePage() {
  return (
    <div className="card">
      <h1>Payday Loan POC</h1>
      <p>Phase 1: Company onboarding + user signup with email verification.</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <a href="/admin/onboarding">Company onboarding</a>
        <a href="/signup">User signup</a>
      </div>
    </div>
  );
}
