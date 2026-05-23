import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "@/pages/Login";
import { RoleProvider } from "@/context/RoleContext";

const fetchHealthMock = vi.fn();
const loginMock = vi.fn();
const fetchMeMock = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchHealth: (...args: unknown[]) => fetchHealthMock(...args),
  login: (...args: unknown[]) => loginMock(...args),
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <RoleProvider>
        <Login />
      </RoleProvider>
    </MemoryRouter>,
  );
}

describe("Login", () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("does not expose seeded credentials in the form or helper copy", async () => {
    fetchHealthMock.mockResolvedValue({ status: "ok", environment: "test", version: "1.0.0" });

    renderLogin();

    await waitFor(() => expect(fetchHealthMock).toHaveBeenCalledTimes(1));

    expect(screen.queryByText(/Usuario demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Skretting2026!/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electronico/i)).toHaveValue("");
    expect(screen.getByLabelText(/Contrasena/i)).toHaveValue("");
  });

  it("keeps submit disabled until the user enters credentials", async () => {
    fetchHealthMock.mockResolvedValue({ status: "ok", environment: "test", version: "1.0.0" });

    renderLogin();

    const submit = screen.getByRole("button", { name: /Ingresar/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Correo electronico/i), {
      target: { value: "usuario@empresa.cl" },
    });
    fireEvent.change(screen.getByLabelText(/Contrasena/i), {
      target: { value: "secreto" },
    });

    await waitFor(() => expect(submit).toBeEnabled());
  });
});
