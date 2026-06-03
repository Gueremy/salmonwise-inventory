import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/context/RoleContext";
import {
  fetchAlertasActivas,
  fetchContainers,
  fetchGalpones,
  fetchSedes,
} from "@/lib/api";
import { buildInventorySnapshot } from "@/lib/inventory";

export function useInventorySnapshot() {
  const { accessToken, setOnline } = useRole();

  const query = useQuery({
    queryKey: ["inventory-snapshot", accessToken],
    enabled: Boolean(accessToken),
    retry: false,
    queryFn: async () => {
      const [sedes, galpones, containers, alertas] = await Promise.all([
        fetchSedes(accessToken!),
        fetchGalpones(accessToken!),
        fetchContainers(accessToken!),
        fetchAlertasActivas(accessToken!),
      ]);

      return buildInventorySnapshot({
        sedes: sedes.items,
        galpones: galpones.items,
        containers: containers.items,
        alertas,
      });
    },
  });

  useEffect(() => {
    if (query.isSuccess) {
      setOnline(true);
      return;
    }

    if (query.isError) {
      setOnline(false);
    }
  }, [query.isError, query.isSuccess, setOnline]);

  return query;
}
