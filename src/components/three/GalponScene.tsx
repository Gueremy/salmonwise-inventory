import { ZoneScene } from "./ZoneScene";
import { InventoryContainerView } from "@/lib/inventory";

interface Props {
  containers: InventoryContainerView[] | any[];
  selectedId: string | null;
  onSelect: (c: any) => void;
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
