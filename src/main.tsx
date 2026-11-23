import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#243d1d] flex items-center justify-center p-6 text-[#2b2118]">
          <div className="max-w-md w-full bg-[#faf6ee] border-4 border-[#4a321f] rounded-2xl p-6 shadow-2xl space-y-4">
            <h1 className="font-display font-bold text-xl text-rose-800">
              Anzeigefehler aufgetreten
            </h1>
            <p className="text-sm text-[#4a321f]">
              Beim Laden der Ansicht ist ein Fehler passiert:
            </p>
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-mono text-rose-900 break-words">
              {this.state.message || 'Unbekannter Fehler'}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
              >
                Seite neu laden
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('sonnental_hof_save_v1');
                  } catch {
                    // ignore
                  }
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-[#efe6d5] hover:bg-[#e2d3ba] text-[#4a321f] text-xs font-bold"
              >
                Spielstand zurücksetzen &amp; neu starten
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootContainer = document.getElementById('root');
if (rootContainer) {
  createRoot(rootContainer).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
