import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  Plus,
  Save,
  Trash2,
  Move,
  Layers,
  Building2,
  CheckCircle2,
  Grid3X3,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useRole } from "@/context/RoleContext";
import { useSitesQuery, useZonesQuery, useLocationsQuery } from "@/hooks/use-spatial-inventory";
import { createZone } from "@/api/zones";
import { updateLocationLayout, batchCreateLocations } from "@/api/layout";
import { toast } from "sonner";

export default function LayoutEditor() {
  const { accessToken } = useRole();
  const queryClient = useQueryClient();

  const sitesQuery = useSitesQuery();
  const sites = useMemo(() => sitesQuery.data ?? [], [sitesQuery.data]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  useEffect(() => {
    if (!selectedSiteId && sites.length > 0) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  const zonesQuery = useZonesQuery(selectedSiteId);
  const zones = useMemo(() => zonesQuery.data ?? [], [zonesQuery.data]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");

  useEffect(() => {
    if (zones.length > 0 && !zones.some((z) => z.id === selectedZoneId)) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones, selectedZoneId]);

  const locationsQuery = useLocationsQuery(selectedZoneId);
  const locations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [editingLayout, setEditingLayout] = useState<{
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    depth: number;
  }>({ x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1 });

  // Modal para nueva zona
  const [showNewZone, setShowNewZone] = useState(false);
  const [newZoneCode, setNewZoneCode] = useState("");
  const [newZoneName, setNewZoneName] = useState("");

  const selectedLocation = locations.find((l) => l.id === selectedLocationId) ?? null;

  useEffect(() => {
    if (selectedLocation) {
      setEditingLayout({
        x: Number(selectedLocation.layout?.x ?? 0),
        y: Number(selectedLocation.layout?.y ?? 0),
        z: Number(selectedLocation.layout?.z ?? 0),
        width: Number(selectedLocation.layout?.width ?? 1),
        height: Number(selectedLocation.layout?.height ?? 1),
        depth: Number(selectedLocation.layout?.depth ?? 1),
      });
    }
  }, [selectedLocationId, selectedLocation]);

  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLocationId || !accessToken) return;
      await updateLocationLayout(accessToken, selectedLocationId, editingLayout);
    },
    onSuccess: () => {
      toast.success("Coordenadas espaciales guardadas exitosamente");
      queryClient.invalidateQueries({ queryKey: ["locations", selectedZoneId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al guardar layout");
    },
  });

  const createZoneMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken || !selectedSiteId) return;
      await createZone(accessToken, {
        id_sitio: selectedSiteId,
        codigo: newZoneCode.trim(),
        nombre: newZoneName.trim(),
        tipo: "zona",
      });
    },
    onSuccess: () => {
      toast.success("Zona creada correctamente");
      setShowNewZone(false);
      setNewZoneCode("");
      setNewZoneName("");
      queryClient.invalidateQueries({ queryKey: ["zones", selectedSiteId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al crear zona");
    },
  });

  const batchCreateMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken || !selectedZoneId) return;
      const newItems = Array.from({ length: 4 }).map((_, i) => ({
        codigo: `U-${Date.now().toString().slice(-4)}-${i + 1}`,
        capacidad_maxima: 500,
        unidad_capacidad: "kg",
        layout: { x: (i % 2) * 2, y: 0, z: Math.floor(i / 2) * 2, width: 1, height: 1, depth: 1 },
      }));
      await batchCreateLocations(accessToken, selectedZoneId, newItems);
    },
    onSuccess: () => {
      toast.success("Ubicaciones generadas en lote");
      queryClient.invalidateQueries({ queryKey: ["locations", selectedZoneId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al generar lote");
    },
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <Breadcrumbs items={[{ label: "Editor de Layout 2D/3D" }]} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editor Espacial de Layout</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configuración de coordenadas espaciales ($x, y, z$) y dimensiones para el renderizador 2D y gemelo digital 3D.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => batchCreateMutation.mutate()}
            disabled={!selectedZoneId || batchCreateMutation.isPending}
          >
            <Grid3X3 className="h-4 w-4 mr-1.5" />
            Generar lote (+4)
          </Button>
          <Button
            size="sm"
            onClick={() => saveLayoutMutation.mutate()}
            disabled={!selectedLocationId || saveLayoutMutation.isPending}
            className="bg-primary hover:bg-secondary"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Guardar layout
          </Button>
        </div>
      </div>

      {/* Selectores de Sitio y Zona */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-card border border-border p-4 rounded-lg shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs">Sitio activo</Label>
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecciona un sitio" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre} ({s.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Zona activa</Label>
          <div className="flex gap-2">
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecciona una zona" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.nombre} ({z.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-2.5"
              onClick={() => setShowNewZone(true)}
              title="Crear nueva zona"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal para crear zona */}
      {showNewZone && (
        <div className="bg-card border border-primary/30 rounded-lg p-4 space-y-3 shadow-md animate-fade-in max-w-md">
          <h3 className="font-semibold text-sm">Nueva Zona en {sites.find((s) => s.id === selectedSiteId)?.nombre}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Código *</Label>
              <Input
                value={newZoneCode}
                onChange={(e) => setNewZoneCode(e.target.value)}
                placeholder="Z-01"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nombre *</Label>
              <Input
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="Bodega General"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setShowNewZone(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => createZoneMutation.mutate()}
              disabled={!newZoneCode.trim() || !newZoneName.trim() || createZoneMutation.isPending}
            >
              Crear zona
            </Button>
          </div>
        </div>
      )}

      {/* Grid espacial interactiva y panel de propiedades */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              Plano espacial de ubicaciones ({locations.length})
            </h2>
            <span className="text-xs text-muted-foreground">Haz clic en una casilla para editar sus coordenadas</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 min-h-[350px] p-4 bg-muted/20 border border-dashed border-border rounded-lg overflow-y-auto max-h-[550px]">
            {locations.map((loc) => {
              const isSelected = selectedLocationId === loc.id;
              const x = loc.layout?.x ?? 0;
              const z = loc.layout?.z ?? 0;

              return (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocationId(loc.id)}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between h-24 transition ${
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/10 shadow-md"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <span className="font-bold text-xs truncate">{loc.codigo}</span>
                  <div className="text-[10px] text-muted-foreground">
                    Pos: ({x}, {z})
                  </div>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded w-fit text-muted-foreground">
                    {loc.capacidad_maxima} {loc.unidad_capacidad}
                  </span>
                </button>
              );
            })}

            {locations.length === 0 && (
              <div className="col-span-full h-48 flex items-center justify-center text-sm text-muted-foreground">
                Esta zona no tiene ubicaciones configuradas. Haz clic en "Generar lote" para añadir casillas.
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral de edición de coordenadas */}
        <aside className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4 h-fit sticky top-20">
          <div className="flex items-center gap-2 font-semibold text-sm pb-2 border-b border-border">
            <Sliders className="h-4 w-4 text-primary" />
            Propiedades Espaciales
          </div>

          {selectedLocation ? (
            <div className="space-y-4 text-xs">
              <div>
                <Label className="text-xs text-muted-foreground">Ubicación seleccionada</Label>
                <div className="text-base font-bold text-foreground mt-0.5">{selectedLocation.codigo}</div>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <div className="font-medium text-muted-foreground uppercase tracking-wider text-[11px]">
                  Coordenadas ($x, y, z$)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">X (Eje horiz.)</Label>
                    <Input
                      type="number"
                      value={editingLayout.x}
                      onChange={(e) => setEditingLayout((l) => ({ ...l, x: Number(e.target.value) }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Y (Altura)</Label>
                    <Input
                      type="number"
                      value={editingLayout.y}
                      onChange={(e) => setEditingLayout((l) => ({ ...l, y: Number(e.target.value) }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Z (Profund.)</Label>
                    <Input
                      type="number"
                      value={editingLayout.z}
                      onChange={(e) => setEditingLayout((l) => ({ ...l, z: Number(e.target.value) }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <div className="font-medium text-muted-foreground uppercase tracking-wider text-[11px]">
                  Dimensiones ($ancho, alto, fondo$)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Ancho</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingLayout.width}
                      onChange={(e) => setEditingLayout((l) => ({ ...l, width: Number(e.target.value) }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Alto</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingLayout.height}
                      onChange={(e) => setEditingLayout((l) => ({ ...l, height: Number(e.target.value) }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Fondo</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingLayout.depth}
                      onChange={(e) => setEditingLayout((l) => ({ ...l, depth: Number(e.target.value) }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => saveLayoutMutation.mutate()}
                disabled={saveLayoutMutation.isPending}
                className="w-full bg-primary hover:bg-secondary mt-2"
                size="sm"
              >
                {saveLayoutMutation.isPending ? "Guardando..." : "Aplicar coordenadas"}
              </Button>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-xs">
              Selecciona una ubicación en la cuadrícula para ajustar sus coordenadas espaciales.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
