import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f2f2f2",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "32px 28px",
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#1a1a1a" }}>
            Une erreur s'est produite
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#666", lineHeight: 1.5 }}>
            L'application a rencontré un problème inattendu. Tes données sont sauvegardées — recharge simplement la page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#CC2936",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Recharger l'app
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details style={{ marginTop: 20, textAlign: "left" }}>
              <summary style={{ fontSize: 12, color: "#999", cursor: "pointer" }}>
                Détails de l'erreur
              </summary>
              <pre style={{
                marginTop: 8,
                padding: 12,
                background: "#fef2f2",
                borderRadius: 8,
                fontSize: 11,
                color: "#CC2936",
                overflow: "auto",
                maxHeight: 200,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
