import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { followTeam, unfollowTeam, getFollowedTeamIds } from "@/api/teamFollowerAPI";
import { useAuth } from "@/hooks/useAuth";

interface FollowTeamButtonProps {
  teamId: number;
  className?: string;
}

export default function FollowTeamButton({ teamId, className }: FollowTeamButtonProps) {
  const queryClient = useQueryClient();
  const { data: user } = useAuth();

  const { data: followedIds = [], isLoading } = useQuery({
    queryKey: ["followed-team-ids"],
    queryFn: getFollowedTeamIds,
    staleTime: 5 * 60_000,
    enabled: !!user,
  });

  const isFollowing = followedIds.includes(teamId);

  const toggle = useMutation({
    mutationFn: async (): Promise<void> => {
      if (isFollowing) await unfollowTeam(teamId);
      else await followTeam(teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followed-team-ids"] });
      queryClient.invalidateQueries({ queryKey: ["followed-teams"] });
    },
  });

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending || isLoading}
      title={isFollowing ? "Dejar de seguir" : "Seguir equipo"}
      className={
        className ??
        `rounded-lg px-3 py-1.5 text-sm font-bold transition-all duration-200 ${
          isFollowing
            ? "border border-geo-green/50 bg-geo-green/10 text-geo-green hover:bg-geo-green/20"
            : "bg-geo-green text-geo-black hover:opacity-90"
        } disabled:opacity-50`
      }
    >
      {toggle.isPending ? "..." : isFollowing ? "✓ Siguiendo" : "+ Seguir"}
    </button>
  );
}

