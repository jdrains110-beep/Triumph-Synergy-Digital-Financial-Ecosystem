'use client';

/**
 * Allodial Deed Certificate Display Component
 * 
 * Renders sovereign title deeds with legal proclamation narrative,
 * dual witness attestation signatures, and exportable PDF generation.
 */

import React from 'react';
import { AllodialDeedCertificate } from '@/lib/saib/allodial-deed-factory';

export interface DeedCertificateProps {
  deedData: AllodialDeedCertificate | null;
  witnessAStatus?: 'VALID' | 'INVALID';
  witnessBStatus?: 'VALID' | 'INVALID';
  consensusAchieved?: boolean;
}

/**
 * DeedCertificate Component
 * 
 * Displays Allodial Deed with official legal formatting,
 * cryptographic witness signatures, and print/export capabilities.
 */
export default function DeedCertificate({
  deedData,
  witnessAStatus = 'VALID',
  witnessBStatus = 'VALID',
  consensusAchieved = true,
}: DeedCertificateProps) {
  if (!deedData) {
    return (
      <div
        style={{
          color: '#666',
          fontFamily: 'monospace',
          padding: '1rem',
          textAlign: 'center',
        }}
      >
        📋 No Active Deed Certificate Found in Buffer.
      </div>
    );
  }

  // Handle standard cross-platform browser print operations
  const triggerPrintCapture = () => {
    window.print();
  };

  // Export deed as JSON
  const exportDeedJSON = () => {
    const dataStr = JSON.stringify(deedData, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${deedData.deedCertificateId}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '2rem auto',
        padding: '3rem',
        backgroundColor: '#0a0a0a',
        border: '4px double #d4af37', // Golden border visual anchor for absolute titles
        color: '#fff',
        fontFamily: 'serif',
        boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)',
        lineHeight: '1.8',
      }}
    >
      {/* Sovereign Emblem & Header Layout */}
      <div
        style={{
          textAlign: 'center',
          borderBottom: '2px solid #d4af37',
          paddingBottom: '2rem',
          marginBottom: '2rem',
        }}
      >
        <h1
          style={{
            fontSize: '2.5rem',
            color: '#d4af37',
            letterSpacing: '3px',
            margin: '0 0 1rem',
            fontWeight: 'bold',
          }}
        >
          ⚜️ ALLODIAL TITLE DEED ⚜️
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#aaa',
            fontStyle: 'italic',
            letterSpacing: '2px',
            margin: 0,
            fontFamily: 'monospace',
          }}
        >
          SOVEREIGN REGISTRY — ISSUED FREE AND CLEAR OF ALL EXTERNAL LIENS
        </p>
      </div>

      {/* Main Legal Proclamation Narrative */}
      <div
        style={{
          fontSize: '1.15rem',
          lineHeight: '1.9',
          textAlign: 'justify',
          marginBottom: '2.5rem',
          color: '#e0e0e0',
          padding: '1.5rem',
          backgroundColor: '#111',
          border: '1px solid #333',
          borderRadius: '4px',
        }}
      >
        <p style={{ margin: '0 0 1rem', fontStyle: 'italic', color: '#d4af37' }}>
          Know all entities by these presents:
        </p>
        <p style={{ margin: 0 }}>
          The absolute sovereign property rights and unencumbered title holding
          status for the Web3 Digital Real Estate platform identified herein as{' '}
          <strong style={{ color: '#fff', fontFamily: 'monospace' }}>
            {deedData.domainPlatform}
          </strong>{' '}
          are hereby completely and permanently transferred to the rightful
          holder of the cryptographic wallet address listed below. This tenure
          is confirmed under absolute{' '}
          <span
            style={{
              color: '#d4af37',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            Allodial Freehold
          </span>{' '}
          status, immune to external taxation, superior lord mandates, or
          municipal registry foreclosures.
        </p>
      </div>

      {/* Structured Telemetry Data Fields */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          border: '1px solid #444',
          padding: '1.5rem',
          backgroundColor: '#0f0f0f',
          marginBottom: '2.5rem',
          borderRadius: '4px',
        }}
      >
        <div>
          <div style={{ color: '#d4af37', display: 'block', marginBottom: '0.5rem' }}>
            🎖️ CERTIFICATE IDENTIFIER
          </div>
          <div style={{ color: '#fff', fontWeight: 'bold', wordBreak: 'break-all' }}>
            {deedData.deedCertificateId}
          </div>
        </div>

        <div>
          <div style={{ color: '#d4af37', display: 'block', marginBottom: '0.5rem' }}>
            💰 GCV ASSET VALUATION
          </div>
          <div style={{ color: '#ffb700', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {deedData.gcvEquityValuation}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ color: '#d4af37', display: 'block', marginBottom: '0.5rem' }}>
            👤 RIGHTFUL OWNER WALLET ADDRESS
          </div>
          <div
            style={{
              color: '#aaa',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              padding: '0.75rem',
              backgroundColor: '#111',
              border: '1px solid #333',
              borderRadius: '3px',
            }}
          >
            {deedData.rightfulOwnerKey}
          </div>
        </div>

        <div>
          <div style={{ color: '#d4af37', display: 'block', marginBottom: '0.5rem' }}>
            📅 ISSUANCE DATE
          </div>
          <div style={{ color: '#fff' }}>
            {new Date(deedData.issuanceTimestamp).toUTCString()}
          </div>
        </div>

        <div>
          <div style={{ color: '#d4af37', display: 'block', marginBottom: '0.5rem' }}>
            ⚖️ TENURE CLASS
          </div>
          <div
            style={{
              color: '#00ff00',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            {deedData.tenureStatus}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ color: '#d4af37', display: 'block', marginBottom: '0.5rem' }}>
            📜 GOVERNING PROTOCOL
          </div>
          <div
            style={{
              color: '#00ff00',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          >
            {deedData.governingProtocol}
          </div>
        </div>

        {deedData.deedHash && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ color: '#d4af37', display: 'block', marginBottom: '0.5rem' }}>
              🔐 DEED HASH (SHA-256)
            </div>
            <div
              style={{
                color: '#888',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
              }}
            >
              {deedData.deedHash}
            </div>
          </div>
        )}
      </div>

      {/* Witness Attestation Signatures */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            fontSize: '0.95rem',
            color: '#d4af37',
            marginBottom: '1rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}
        >
          ✅ CRYPTOGRAPHIC WITNESS ATTESTATION
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
          }}
        >
          <div
            style={{
              border: '1px solid #333',
              padding: '1.5rem',
              backgroundColor: '#111',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                color: #d4af37,
                fontSize: '0.9rem',
                marginBottom: '0.5rem',
              }}
            >
              WITNESS A SIGNATURE
            </div>
            <div
              style={{
                borderBottom: '1px dashed #444',
                height: '40px',
                color: witnessAStatus === 'VALID' ? '#00ff00' : '#ff0000',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                lineHeight: '50px',
                marginBottom: '0.5rem',
              }}
            >
              [{witnessAStatus === 'VALID' ? 'VALIDATED_OK' : 'VALIDATION_FAILED'}]
            </div>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#666',
                margin: 0,
                fontFamily: 'monospace',
              }}
            >
              SAIB Edge Server Witness 01
            </p>
          </div>

          <div
            style={{
              border: '1px solid #333',
              padding: '1.5rem',
              backgroundColor: '#111',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                color: '#d4af37',
                fontSize: '0.9rem',
                marginBottom: '0.5rem',
              }}
            >
              WITNESS B SIGNATURE
            </div>
            <div
              style={{
                borderBottom: '1px dashed #444',
                height: '40px',
                color: witnessBStatus === 'VALID' ? '#00ff00' : '#ff0000',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                lineHeight: '50px',
                marginBottom: '0.5rem',
              }}
            >
              [{witnessBStatus === 'VALID' ? 'VALIDATED_OK' : 'VALIDATION_FAILED'}]
            </div>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#666',
                margin: 0,
                fontFamily: 'monospace',
              }}
            >
              SAIB Edge Server Witness 02
            </p>
          </div>
        </div>
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: consensusAchieved ? '#001a00' : '#1a0000',
            border: `1px solid ${consensusAchieved ? '#00ff00' : '#ff0000'}`,
            borderRadius: '4px',
            textAlign: 'center',
            color: consensusAchieved ? '#00ff00' : '#ff0000',
            fontWeight: 'bold',
            fontSize: '0.9rem',
          }}
        >
          {consensusAchieved
            ? '✓ DUAL WITNESS CONSENSUS ACHIEVED - DEED FINALIZED'
            : '✗ WITNESS CONSENSUS FAILED - DEED NOT FINALIZED'}
        </div>
      </div>

      {/* Export Controls Container */}
      <div
        className="no-print"
        style={{
          marginTop: '3rem',
          textAlign: 'center',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={triggerPrintCapture}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'transparent',
            border: '1px solid #d4af37',
            color: '#d4af37',
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderRadius: '3px',
          }}
          onMouseOver={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = '#d4af37';
            target.style.color = '#000';
          }}
          onMouseOut={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = 'transparent';
            target.style.color = '#d4af37';
          }}
        >
          🖨️ Print Allodial Title Document
        </button>

        <button
          onClick={exportDeedJSON}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'transparent',
            border: '1px solid #ffb700',
            color: '#ffb700',
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderRadius: '3px',
          }}
          onMouseOver={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = '#ffb700';
            target.style.color = '#000';
          }}
          onMouseOut={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = 'transparent';
            target.style.color = '#ffb700';
          }}
        >
          💾 Export as JSON
        </button>
      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background-color: #fff;
            color: #000;
          }

          .no-print {
            display: none;
          }

          div {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
