import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { notificationTypeLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn, formatDateTime } from "@/lib/utils";
import { deleteNotification, markAllNotificationsRead, markNotificationRead } from "@/server/notification-actions";

export const metadata = {
  title: "Benachrichtigungen"
};

export default async function NotificationsPage() {
  const user = await requireAuth();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Benachrichtigungen"
        title="Benachrichtigungs-Center"
        description="Alle Hinweise zu Ihren Buchungen, Schäden, Fristen und mehr an einem Ort."
        actions={
          unreadCount > 0 ? (
            <form action={markAllNotificationsRead}>
              <Button variant="outline" size="sm">
                Alle als gelesen markieren
              </Button>
            </form>
          ) : undefined
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>
            Posteingang
            {unreadCount > 0 ? (
              <span className="ml-2 align-middle">
                <Badge tone="warning">{unreadCount} ungelesen</Badge>
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <EmptyState
              title="Keine Benachrichtigungen"
              description="Sobald es Neuigkeiten zu Ihren Fahrzeugen oder Buchungen gibt, erscheinen sie hier."
            />
          ) : (
            <ul className="grid gap-3">
              {notifications.map((notification) => {
                const unread = !notification.readAt;
                return (
                  <li
                    key={notification.id}
                    className={cn(
                      "rounded-md border p-4 text-sm",
                      unread ? "border-l-4 border-l-primary bg-primary/5" : "bg-background"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{notificationTypeLabels[notification.type]}</Badge>
                          {unread ? <Badge tone="warning">Neu</Badge> : null}
                        </div>
                        <p className="mt-2 font-semibold">
                          {notification.url ? (
                            <a href={notification.url} className="hover:underline">
                              {notification.title}
                            </a>
                          ) : (
                            notification.title
                          )}
                        </p>
                        {notification.body ? (
                          <p className="mt-1 text-muted-foreground">{notification.body}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        {unread ? (
                          <form action={markNotificationRead}>
                            <input type="hidden" name="notificationId" value={notification.id} />
                            <Button variant="outline" size="sm">
                              Als gelesen
                            </Button>
                          </form>
                        ) : null}
                        <form action={deleteNotification}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <Button variant="ghost" size="sm">
                            Löschen
                          </Button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
