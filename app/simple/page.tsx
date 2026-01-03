export default function SimplePage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#000',
      color: '#fff'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Triumph Synergy</h1>
      <p style={{ fontSize: '20px', color: '#888' }}>Advanced Payment Routing & Compliance Platform</p>
      <p style={{ fontSize: '16px', marginTop: '40px', color: '#666' }}>
        Platform Status: Operational ✓
      </p>
      <div style={{ marginTop: '40px' }}>
        <a href="/chat" style={{ 
          padding: '12px 24px', 
          backgroundColor: '#0070f3', 
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '6px',
          fontSize: '16px'
        }}>
          Launch Chat
        </a>
      </div>
    </div>
  );
}
