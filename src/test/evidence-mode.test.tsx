import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { EvidenceModeControl, SensitiveText } from "@/privacy/EvidenceMode";
import { evidenceValue, setEvidenceEnabled } from "@/privacy/evidence";
import { Input } from "@/components/ui/input";

afterEach(() => setEvidenceEnabled(false));

describe("evidencia sin modificar datos", () => {
  it("sustituye nombres y RUT de forma consistente y reversible", () => {
    expect(evidenceValue("Empresa real", "Empresa")).toBe("Empresa real");
    setEvidenceEnabled(true);
    expect(evidenceValue("Empresa real", "Empresa")).toBe("Empresa 01");
    expect(evidenceValue("Empresa real", "Empresa")).toBe("Empresa 01");
    expect(evidenceValue("76.123.456-7")).toBe("RUT protegido");
    setEvidenceEnabled(false);
    expect(evidenceValue("Empresa real", "Empresa")).toBe("Empresa real");
  });

  it("oculta el formulario y conserva el payload real sin solicitudes al alternar", () => {
    const submit = vi.fn();
    function Form() {
      const [name, setName] = useState("Proveedor real");
      return <><EvidenceModeControl /><SensitiveText value={name} category="Empresa" />
        <Input aria-label="Proveedor" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={() => submit({ nombre: name })}>Guardar</button></>;
    }
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Proteger datos para capturas" }));
    expect(screen.queryByText("Proveedor real")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Proveedor")).toHaveAttribute("type", "password");
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Guardar"));
    expect(submit).toHaveBeenLastCalledWith({ nombre: "Proveedor real" });
    fireEvent.change(screen.getByLabelText("Proveedor"), { target: { value: "Nuevo proveedor" } });
    fireEvent.click(screen.getByText("Guardar"));
    expect(submit).toHaveBeenLastCalledWith({ nombre: "Nuevo proveedor" });
    fireEvent.click(screen.getByRole("button", { name: /Mostrar datos/ }));
    expect(screen.getByText("Nuevo proveedor")).toBeInTheDocument();
  });
});
