import { DashboardLayout } from "@/components/dashboard/layout";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/upload/upload-dialog";
import { SessionCard } from "@/components/learning/session-card";
import {
  Plus,
  Clock,
  BookOpen,
  ArrowRight,
  MoreVertical,
  Archive,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

interface LearningSession {
  id: string;
  title: string;
  userId: string;
  progress: number;
  concepts: any[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

async function deleteSession(id: string) {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete session');
  }
}

async function archiveSession(id: string) {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'ARCHIVED' }),
  });
  if (!response.ok) {
    throw new Error('Failed to archive session');
  }
}

export default async function SessionsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get active session from URL parameter with proper await
  const params = await Promise.resolve(searchParams);
  const activeSessionId = typeof params.session === 'string' ? params.session : undefined;

  // Get user's learning sessions using raw SQL
  const result = await prisma.$queryRaw`
    SELECT id, title, "userId", progress, concepts, status, "createdAt", "updatedAt"
    FROM "LearningSession"
    WHERE "userId" = ${session.user.id}
    ORDER BY "updatedAt" DESC
  `;

  const userSessions = (result as any[]).map(session => ({
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
  }));

  // Group sessions by status
  const activeSessions = userSessions.filter(session => session.status === 'active');
  const completedSessions = userSessions.filter(session => session.status === 'completed');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Upload Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sessions</h1>
            <p className="mt-2 text-base-content/70">
              Manage your learning sessions and track your progress
            </p>
          </div>
          <UploadDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Session
              </Button>
            }
          />
        </div>

        {/* Active Sessions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Active Sessions
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeSessions.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No active sessions. Start a new session to begin learning.
                </CardContent>
              </Card>
            ) : (
              activeSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                />
              ))
            )}
          </div>
        </div>

        {/* Completed Sessions */}
        {completedSessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Completed Sessions
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 