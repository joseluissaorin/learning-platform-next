import { DashboardLayout } from "@/components/dashboard/layout";
import { LearningSession } from "@/components/learning/learning-session";
import { SessionCard } from "@/components/learning/session-card";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Target, TrendingUp } from "lucide-react";

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

async function getLearningData(userId: string, activeSessionId?: string) {
  // Get user's learning sessions with concepts from the database
  const result = await prisma.$queryRaw`
    WITH SessionConcepts AS (
      SELECT 
        sc."sessionId",
        json_agg(
          json_build_object(
            'id', c.id,
            'title', c.title,
            'content', c.content,
            'level', c.level,
            'order', c."order",
            'parentId', c."parentId"
          ) ORDER BY c.level, c."order"
        ) as concepts
      FROM "SessionConcept" sc
      JOIN "Concept" c ON c.id = sc."conceptId"
      GROUP BY sc."sessionId"
    )
    SELECT 
      ls.id, 
      ls.title, 
      ls."userId", 
      ls.progress, 
      COALESCE(sc.concepts, '[]'::json) as concepts,
      ls.status, 
      ls."createdAt", 
      ls."updatedAt",
      sd.content as "documentContent",
      sd.id as "documentId",
      sd.metadata as "documentMetadata"
    FROM "LearningSession" ls
    LEFT JOIN SessionConcepts sc ON sc."sessionId" = ls.id
    LEFT JOIN "SessionDocument" sd ON sd."sessionId" = ls.id
    WHERE ls."userId" = ${userId}
    ORDER BY ls."updatedAt" DESC
    LIMIT 10
  `;

  const userSessions = (result as any[]).map(session => ({
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
    status: session.status as 'active' | 'completed' | 'archived',
    document: session.documentContent ? {
      id: session.documentId,
      title: session.title,
      content: session.documentContent,
      metadata: session.documentMetadata
    } : undefined
  }));

  // Calculate analytics
  const analytics = userSessions.reduce((acc, session) => {
    const totalConcepts = (session.concepts as any[]).length;
    const progress = session.progress || 0;
    const completedConcepts = Math.round(totalConcepts * (progress / 100));
    
    return {
      totalSessions: acc.totalSessions + 1,
      completedConcepts: acc.completedConcepts + completedConcepts,
      totalConcepts: acc.totalConcepts + totalConcepts,
      averageProgress: acc.totalSessions > 0 
        ? Math.round((acc.totalProgress + progress) / (acc.totalSessions + 1))
        : progress,
      totalProgress: acc.totalProgress + progress,
    };
  }, {
    totalSessions: 0,
    completedConcepts: 0,
    totalConcepts: 0,
    averageProgress: 0,
    totalProgress: 0,
  });

  // If no active session specified but user has sessions, use the most recent one
  const activeSession = activeSessionId
    ? userSessions.find(s => s.id === activeSessionId)
    : userSessions[0];

  return { userSessions, analytics, activeSession };
}

export default async function LearningPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get the session parameter and await its resolution
  const params = await Promise.resolve(searchParams);
  const sessionParam = params?.session;
  const sessionId = Array.isArray(sessionParam) ? sessionParam[0] : sessionParam;

  const { userSessions, analytics, activeSession } = await getLearningData(
    session.user.id,
    sessionId
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Learning</h1>
          <p className="mt-2 text-base-content/70">
            Review your learning materials and track your progress.
          </p>
        </div>

        {/* Analytics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-all duration-200 hover:scale-102 hover:shadow-md">
            <div className="flex flex-row items-center justify-between space-y-0 p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <div className="text-2xl font-bold">{analytics.totalSessions}</div>
              </div>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:scale-102 hover:shadow-md">
            <div className="flex flex-row items-center justify-between space-y-0 p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Completed Concepts</p>
                <div className="text-2xl font-bold">{analytics.completedConcepts}</div>
                <p className="text-xs text-muted-foreground">
                  of {analytics.totalConcepts} total concepts
                </p>
              </div>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:scale-102 hover:shadow-md">
            <div className="flex flex-row items-center justify-between space-y-0 p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Average Progress</p>
                <div className="text-2xl font-bold">{analytics.averageProgress}%</div>
                <Progress value={analytics.averageProgress} className="mt-2" />
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:scale-102 hover:shadow-md">
            <div className="flex flex-row items-center justify-between space-y-0 p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Last Activity</p>
                <div className="text-2xl font-bold">
                  {userSessions[0] 
                    ? formatDistanceToNow(userSessions[0].updatedAt)
                    : "Never"}
                </div>
                <p className="text-xs text-muted-foreground">ago</p>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* Session List */}
        <div className="grid gap-6">
          {userSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base-content/70">
                No learning sessions found. Create a new session to get started.
              </p>
            </div>
          ) : (
            <>
              {/* Active Session */}
              {activeSession && (
                <Card className="col-span-full">
                  <CardContent className="p-6">
                    <LearningSession session={activeSession} />
                  </CardContent>
                </Card>
              )}

              {/* Session List */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSession?.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 