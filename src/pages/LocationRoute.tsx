import { Navigate, useParams } from "react-router-dom";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";

export default function LocationRoute() {
  const { id } = useParams();
  const snapshot = useInventorySnapshot();
  if (snapshot.isLoading) return <p className="p-6">Buscando ubicación...</p>;
  const location = snapshot.data?.containers.find((item) => item.id === id);
  if (!location) return <p role="alert" className="p-6">Ubicación no disponible. Comprueba tus permisos o prepara el dispositivo con conexión.</p>;
  return <Navigate replace to={`/zones/${location.galponId}?focus=${location.id}`} />;
}
