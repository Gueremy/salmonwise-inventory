import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoleProvider, useRole } from "@/context/RoleContext";
import { DEFAULT_THEME } from "@/domain/organization";

function SessionControls() {
  const { organizacion, setOrganizacion, logout } = useRole();
  return <>
    <span>{organizacion.nombre}</span>
    <button onClick={() => setOrganizacion({
      ...organizacion,
      id: "org-a",
      nombre: "Cuenta A",
      configuracion: { ...organizacion.configuracion, colores: { ...DEFAULT_THEME, color_disponible: "#FF0000" } },
    })}>Cuenta A</button>
    <button onClick={logout}>Salir</button>
  </>;
}

afterEach(() => localStorage.clear());

describe("aislamiento de sesión", () => {
  it("borra la caché y restaura la paleta al salir de una cuenta", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["items", "org-a"], [{ nombre: "Dato privado" }]);
    render(<QueryClientProvider client={queryClient}>
      <RoleProvider><SessionControls /></RoleProvider>
    </QueryClientProvider>);

    fireEvent.click(screen.getByText("Cuenta A", { selector: "button" }));
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--status-disponible")).toBe("0 100% 50%"));
    fireEvent.click(screen.getByText("Salir"));
    expect(queryClient.getQueryData(["items", "org-a"])).toBeUndefined();
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--status-disponible")).toBe("142 71% 45%"));
    expect(screen.getByText("Axious Los Lagos")).toBeInTheDocument();
  });

  it("descarta una organización local que no pertenece al usuario guardado", async () => {
    localStorage.setItem("axious.user", JSON.stringify({ id: "user-a", id_organizacion: "org-a" }));
    localStorage.setItem("axious.accessToken", "token-a");
    localStorage.setItem("axious.org", JSON.stringify({ id: "org-b", nombre: "Cuenta B" }));
    render(<QueryClientProvider client={new QueryClient()}>
      <RoleProvider><SessionControls /></RoleProvider>
    </QueryClientProvider>);
    await waitFor(() => expect(screen.getByText("Axious Los Lagos")).toBeInTheDocument());
    expect(localStorage.getItem("axious.accessToken")).toBeNull();
  });
});
