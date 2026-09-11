import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrivateRoute } from "@/components/PrivateRoute";

const auth = {
  authenticated: true,
  authReady: true,
  usuario: { rol: "operario" },
};

vi.mock("@/context/RoleContext", () => ({
  useRole: () => auth,
}));

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/usuarios"]}>
      <Routes>
        <Route element={<PrivateRoute roles={["super_admin", "admin_sede"]} />}>
          <Route path="/usuarios" element={<div>Usuarios permitidos</div>} />
        </Route>
        <Route path="/operario" element={<div>Inicio operario</div>} />
        <Route path="/" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PrivateRoute", () => {
  beforeEach(() => {
    auth.authenticated = true;
    auth.authReady = true;
    auth.usuario.rol = "operario";
  });

  it("redirects a role without permission to its home", () => {
    renderProtected();
    expect(screen.getByText("Inicio operario")).toBeInTheDocument();
    expect(screen.queryByText("Usuarios permitidos")).not.toBeInTheDocument();
  });

  it("allows an authorized role", () => {
    auth.usuario.rol = "admin_sede";
    renderProtected();
    expect(screen.getByText("Usuarios permitidos")).toBeInTheDocument();
  });
});
