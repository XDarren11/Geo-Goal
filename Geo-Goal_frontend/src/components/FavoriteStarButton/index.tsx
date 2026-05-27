/**
 * FavoriteStarButton — toggle "estrella" para marcar como favorito.
 *
 * Funciona para cualquier entidad: team | player | coach | league.
 * Cuando el usuario lo marca, se añade al menú lateral en la sección "Favoritos".
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addFavorite,
  removeFavoriteByEntity,
  getFavoriteIds,
  type FavoriteEntityType,
} from "@/api/favoritesAPI";
import { useAuth } from "@/hooks/useAuth";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { toast } from "react-toastify";

interface FavoriteStarButtonProps {
  entityType: FavoriteEntityType;
  entityId: number;
  /** Etiqueta a mostrar en notificaciones y en el menú lateral. */
  label?: string;
  /** Tamaño visual */
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Si true, muestra texto al lado del icono */
  showLabel?: boolean;
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg", { icon: string; pad: string; text: string }> = {
  sm: { icon: "h-4 w-4", pad: "p-1.5", text: "text-xs" },
  md: { icon: "h-5 w-5", pad: "p-2", text: "text-sm" },
  lg: { icon: "h-6 w-6", pad: "p-2.5", text: "text-base" },
};

export default function FavoriteStarButton({
  entityType,
  entityId,
  label,
  size = "md",
  className,
  showLabel = false,
}: FavoriteStarButtonProps) {
  const queryClient = useQueryClient();
  const { data: user } = useAuth();

  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ["account", "favorites", "ids"],
    queryFn: getFavoriteIds,
    staleTime: 5 * 60_000,
    enabled: !!user,
  });

  const isFavorite = favoriteIds.some(
    (f) => f.entityType === entityType && f.entityId === entityId
  );

  const toggle = useMutation({
    mutationFn: async (): Promise<"added" | "removed"> => {
      if (isFavorite) {
        await removeFavoriteByEntity({ entityType, entityId });
        return "removed";
      }
      await addFavorite({ entityType, entityId, label: label ?? null });
      return "added";
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["account", "favorites", "ids"] });
      queryClient.invalidateQueries({ queryKey: ["account", "favorites"] });
      toast.success(
        action === "added"
          ? `Añadido a favoritos${label ? `: ${label}` : ""}`
          : `Eliminado de favoritos${label ? `: ${label}` : ""}`,
        { autoClose: 1500 }
      );
    },
    onError: () => toast.error("No se pudo actualizar favoritos"),
  });

  if (!user) return null;

  const sizes = SIZE_CLASSES[size];
  const Star = isFavorite ? StarSolidIcon : StarOutlineIcon;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate();
      }}
      disabled={toggle.isPending || isLoading}
      title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
      aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
      className={
        className ??
        `inline-flex items-center gap-2 rounded-full border-2 ${sizes.pad} ${sizes.text} font-semibold transition-all duration-200 ${
          isFavorite
            ? "border-yellow-400 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20"
            : "border-geo-green/40 text-[var(--geo-text)] hover:border-geo-green hover:bg-geo-green/10 hover:text-geo-green"
        } disabled:cursor-not-allowed disabled:opacity-50`
      }
    >
      <Star className={sizes.icon} />
      {showLabel && (
        <span>{isFavorite ? "En favoritos" : "Añadir a favoritos"}</span>
      )}
    </button>
  );
}
