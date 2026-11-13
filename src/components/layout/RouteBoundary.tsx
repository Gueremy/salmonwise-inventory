import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Al cambiar (por ejemplo, la ruta) se descarta el error anterior. */
  resetKey?: string;
}

interface State {
  failed: boolean;
}

/**
 * Contiene los fallos de una pantalla (incluida la descarga de su código diferido)
 * para que el menú y la sesión sigan disponibles.
 */
class RouteErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("No se pudo mostrar la pantalla", error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="p-6 max-w-lg">
        <h2 className="font-semibold text-lg">No se pudo abrir esta pantalla</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Puede faltar conexión o haberse actualizado la aplicación. Tu sesión y los movimientos pendientes se conservan.
        </p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => this.setState({ failed: false })}>Reintentar</Button>
          <Button onClick={() => window.location.reload()}>Recargar</Button>
        </div>
      </div>
    );
  }
}

export const RouteFallback = () => (
  <div className="p-6 text-sm text-muted-foreground" role="status">Cargando pantalla...</div>
);

export const RouteBoundary = ({ children, resetKey }: Props) => (
  <RouteErrorBoundary resetKey={resetKey}>
    <Suspense fallback={<RouteFallback />}>{children}</Suspense>
  </RouteErrorBoundary>
);
