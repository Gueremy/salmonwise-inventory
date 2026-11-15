import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Qué mostrar si el 3D falla (por ejemplo, la vista 2D). */
  fallback: ReactNode;
  /** Qué mostrar mientras se descarga el motor 3D. */
  loading?: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  failed: boolean;
}

/**
 * Aísla la vista 3D: si el motor no se puede descargar, no hay WebGL o la escena
 * lanza un error, la pantalla sigue operativa con la vista de respaldo.
 */
export class SceneBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("La vista 3D no está disponible; se usa la vista de respaldo.", error, info.componentStack);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return <Suspense fallback={this.props.loading ?? null}>{this.props.children}</Suspense>;
  }
}

export const SceneLoading = ({ className = "" }: { className?: string }) => (
  <div
    role="status"
    className={`w-full rounded-lg border border-border flex items-center justify-center text-sm text-muted-foreground ${className}`}
  >
    Cargando vista 3D...
  </div>
);
