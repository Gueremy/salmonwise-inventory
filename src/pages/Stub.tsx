import { Construction } from "lucide-react";

export default function Stub({ title }: { title: string }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
      <Construction className="h-12 w-12 mb-4 opacity-40" />
      <h2 className="font-semibold text-lg text-foreground">{title}</h2>
      <p className="text-sm mt-1">Pantalla en construcción · prototipo focalizado en flujo principal.</p>
    </div>
  );
}
