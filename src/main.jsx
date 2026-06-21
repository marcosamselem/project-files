import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="notice notice--error" style={{ margin: 40 }}>
          Something went wrong loading the demo. Please refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
