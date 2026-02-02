export default function TestPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>Triumph Synergy - Test Page</h1>
      <p>If you can see this, the server is working.</p>
      <p>Current time: {new Date().toISOString()}</p>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Debug Info</h2>
        <p>This is a server-rendered page with no client-side JavaScript dependencies.</p>
      </div>
    </div>
  );
}
