import { ZoneScene, type SceneLocation } from "./ZoneScene";
import { InventoryContainerView } from "@/lib/inventory";

interface Props {
  containers: (InventoryContainerView | SceneLocation)[];
  selectedId: string | null;
  onSelect: (c: SceneLocation) => void;
  highlightedId?: string | null;
}

export const GalponScene = ({ containers, selectedId, onSelect, highlightedId }: Props) => {
  return (
    <ZoneScene
      locations={containers}
      selectedId={selectedId}
      onSelect={onSelect}
      highlightedId={highlightedId}
    />
  );
};
