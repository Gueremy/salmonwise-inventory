import { SiteScene, type SceneZone } from "./SiteScene";
import { InventoryGalpon, TipoSede } from "@/lib/inventory";

interface Props {
  galpones: (InventoryGalpon | SceneZone)[];
  tipo: TipoSede | string;
  sedeNombre: string;
  sedeId?: string;
  onUnavailable?: () => void;
}

export const SedeScene = ({ galpones, tipo, sedeNombre, sedeId, onUnavailable }: Props) => {
  return (
    <SiteScene
      zones={galpones}
      tipo={tipo}
      siteName={sedeNombre}
      siteId={sedeId}
      onUnavailable={onUnavailable}
    />
  );
};
