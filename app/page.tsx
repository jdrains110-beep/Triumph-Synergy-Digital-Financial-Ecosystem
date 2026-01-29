'use client';

export default function HomePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#2563eb' }}>🎉 Triumph Synergy</h1>
      <h2 style={{ color: '#64748b' }}>Pi Network Payment Platform</h2>

      <div style={{
        backgroundColor: '#f1f5f9',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px',
        border: '1px solid #cbd5e1'
      }}>
        <h3>✅ System Status</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>✅ <strong>Server</strong>: Running on Vercel (Mainnet)</li>
          <li>✅ <strong>App URL</strong>: https://triumph-synergy.vercel.app</li>
          <li>✅ <strong>Pi Network</strong>: Connected & Ready</li>
          <li>✅ <strong>Main Pinet Domain</strong>: triumphsynergy0576.pinet.com (Primary)</li>
          <li>✅ <strong>Mainnet Pinet Domain</strong>: triumphsynergy7386.pinet.com</li>
          <li>✅ <strong>Testnet Pinet Domain</strong>: triumphsynergy1991.pinet.com</li>
          <li>✅ <strong>API Routes</strong>: Active</li>
          <li>✅ <strong>Payment Processing</strong>: Ready</li>
          <li>✅ <strong>Pi SDK</strong>: Initialized</li>
        </ul>
      </div>

      <div style={{
        backgroundColor: '#ecfdf5',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px',
        border: '1px solid #a7f3d0'
      }}>
        <h3>🔗 Access Points</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Main Domain (0576):</strong> https://triumphsynergy0576.pinet.com</li>
          <li><strong>Mainnet Domain (7386):</strong> https://triumphsynergy7386.pinet.com</li>
          <li><strong>Testnet Domain (1991):</strong> https://triumphsynergy1991.pinet.com</li>
          <li><strong>Mainnet Vercel:</strong> https://triumph-synergy.vercel.app</li>
          <li><strong>Testnet Vercel:</strong> https://triumph-synergy-testnet.vercel.app</li>
          <li><strong>Validation Key:</strong> /validation-key.txt</li>
        </ul>
      </div>

      <div style={{
        backgroundColor: '#fef3c7',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px',
        border: '1px solid #fcd34d'
      }}>
        <h3>ℹ️ Information</h3>
        <p>App is successfully deployed and ready for Pi Network payments. Access through either the direct Vercel URL or the Pi Network pinet domain.</p>
      </div>
    </div>
  );
}

