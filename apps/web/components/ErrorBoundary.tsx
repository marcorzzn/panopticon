'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Panopticon] Fatal render error caught by boundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            background: '#040b07',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            color: '#00f0ff',
            gap: '16px',
            padding: '32px',
          }}
        >
          <div style={{ fontSize: '32px' }}>⚠</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            PANOPTICON — SYSTEM FAULT DETECTED
          </div>
          <div style={{ fontSize: '10px', color: '#7a9e8e', letterSpacing: '0.1em', maxWidth: '480px', textAlign: 'center' }}>
            {this.state.error?.message ?? 'An unexpected error occurred during rendering.'}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px',
              padding: '8px 24px',
              background: 'transparent',
              border: '1px solid #00f0ff',
              color: '#00f0ff',
              fontFamily: 'monospace',
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Reinitialize System
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
