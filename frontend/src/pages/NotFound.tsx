import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <p style={{ color: 'var(--color-primary)', fontWeight: 700, letterSpacing: '0.04em' }}>404</p>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 600 }}>Nothing scheduled here.</h1>
      <p style={{ color: 'var(--color-muted)', maxWidth: '40ch' }}>
        That page doesn't exist. It might have been renamed, or never made it past the gate.
      </p>
      <Link
        to="/"
        style={{
          marginTop: 8,
          padding: '11px 22px',
          borderRadius: 999,
          background: 'var(--color-primary)',
          color: 'var(--color-primary-contrast)',
          fontWeight: 600,
        }}
      >
        Back to CreatorFlow
      </Link>
    </div>
  );
}
