import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { BellIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyNotifications, markAllNotificationsAsRead } from "@/api/notificationAPI";

export default function NotificationBell() {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", "header"],
    queryFn: () => getMyNotifications(false),
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <Popover className="relative">
      <Popover.Button
        className="relative rounded-full border-2 border-geo-green p-2 text-geo-black transition-all duration-200 hover:scale-105 hover:bg-geo-green hover:text-white dark:text-geo-green dark:hover:bg-geo-green dark:hover:text-geo-black"
        aria-label="Notificaciones"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-geo-green px-1 text-[10px] font-black text-geo-black">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-2 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0 scale-100"
        leaveTo="opacity-0 translate-y-2 scale-95"
      >
        <Popover.Panel className="absolute right-0 z-30 mt-3 w-80 rounded-2xl border-2 border-geo-green/30 bg-[var(--geo-bg-card)] p-3 shadow-xl">
          <div className="flex items-center justify-between border-b-2 border-geo-green/20 pb-2">
            <p className="font-geo text-lg tracking-wide text-[var(--geo-text)]">Notificaciones</p>
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending || notifications.length === 0}
              className="rounded-md border border-geo-green px-2 py-1 text-xs font-bold text-geo-green disabled:opacity-60"
            >
              Marcar todas
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="py-4 text-sm text-[var(--geo-text-muted)]">No tienes notificaciones.</p>
          ) : (
            <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
              {notifications.slice(0, 8).map((n) => (
                <li key={n.id} className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--geo-text)]">{n.title}</p>
                    {!n.readAt ? (
                      <span className="text-[10px] font-bold uppercase text-geo-green">Nueva</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--geo-text-muted)]">{n.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
