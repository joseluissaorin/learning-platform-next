import { DashboardLayout } from "@/components/dashboard/layout";
import { UploadDialog } from "@/components/upload/upload-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, BookOpen, Clock, TrendingUp, Star, Flame, CalendarClock } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Progress } from "@prisma/client";

const MAX_STREAK_DAYS = 30; // Consider this a "fire" streak

async function getStats(userId: string) {
  const documents = await prisma.document.count({ where: { userId } });
  const learningUnits = await prisma.learningUnit.count({ where: { userId } });
  const progress = await prisma.progress.findMany({ 
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 1
  });
  
  const totalUnits = await prisma.learningUnit.count({ where: { userId } });
  const completedUnits = progress.filter((p: Progress) => p.status === "COMPLETED").length;
  const progressPercentage = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
  const lastActivity = progress[0]?.updatedAt;

  // Calculate streak - look back up to MAX_STREAK_DAYS
  const today = new Date();
  const lastMonthProgress = await prisma.progress.findMany({
    where: {
      userId,
      updatedAt: {
        gte: new Date(today.getTime() - MAX_STREAK_DAYS * 24 * 60 * 60 * 1000)
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  // Group progress by day
  const dailyProgress = lastMonthProgress.reduce((acc: Record<string, boolean>, curr: Progress) => {
    const date = curr.updatedAt.toISOString().split('T')[0];
    acc[date] = true;
    return acc;
  }, {});

  // Calculate streak
  let streak = 0;
  for (let i = 0; i < MAX_STREAK_DAYS; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    if (dailyProgress[date]) {
      streak++;
    } else if (i === 0) {
      // Check if there was activity yesterday
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      if (dailyProgress[yesterday]) {
        streak = 1;
      }
      break;
    } else {
      break;
    }
  }
  
  return { documents, learningUnits, progressPercentage, streak, lastActivity };
}

function getTimeAgo(date: Date | null | undefined) {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const stats = await getStats(session.user.id);
  const isFireStreak = stats.streak >= MAX_STREAK_DAYS;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome back{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}!</h1>
          <p className="mt-2 text-base-content/70 text-lg">
            Track your learning progress and manage your documents.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* First Row */}
          <Card className="transition-all duration-200 ease-out hover:shadow-md hover: hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 group">
                <div className={`p-3 rounded-xl transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-6 ${isFireStreak ? 'bg-orange-500/10 group-hover:bg-orange-500/20' : 'bg-primary/10 group-hover:bg-primary/20'}`}>
                  {isFireStreak ? (
                    <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
                  ) : (
                    <Star className="h-6 w-6 text-primary transition-transform duration-300 ease-in-out group-hover:scale-110 group-hover:-rotate-12" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground transition-colors duration-300 ease-in-out group-hover:text-primary/70">Study Streak</p>
                  <h3 className="text-2xl font-bold transition-all duration-300 ease-in-out group-hover:text-primary animate-in fade-in-0 zoom-in-95">{stats.streak} days</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 ease-out hover:shadow-md hover: hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 group">
                <div className="p-3 bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 ease-in-out rounded-xl group-hover:scale-110 group-hover:rotate-6">
                  <TrendingUp className="h-6 w-6 text-primary transition-transform duration-300 ease-in-out group-hover:scale-110 group-hover:-rotate-12" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground transition-colors duration-300 ease-in-out group-hover:text-primary/70">Progress</p>
                  <h3 className="text-2xl font-bold transition-all duration-300 ease-in-out group-hover:text-primary animate-in fade-in-0 zoom-in-95">{stats.progressPercentage}%</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 ease-out hover:shadow-md hover: hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 group">
                <div className="p-3 bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 ease-in-out rounded-xl group-hover:scale-110 group-hover:rotate-6">
                  <Clock className="h-6 w-6 text-primary transition-transform duration-300 ease-in-out group-hover:scale-110 group-hover:-rotate-12" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground transition-colors duration-300 ease-in-out group-hover:text-primary/70">Time Spent</p>
                  <h3 className="text-2xl font-bold transition-all duration-300 ease-in-out group-hover:text-primary animate-in fade-in-0 zoom-in-95">2.5h</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Second Row */}
          <Card className="transition-all duration-200 ease-out hover:shadow-md hover: hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 group">
                <div className="p-3 bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 ease-in-out rounded-xl group-hover:scale-110 group-hover:rotate-6">
                  <CalendarClock className="h-6 w-6 text-primary transition-transform duration-300 ease-in-out group-hover:scale-110 group-hover:-rotate-12" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground transition-colors duration-300 ease-in-out group-hover:text-primary/70">Last Activity</p>
                  <h3 className="text-2xl font-bold transition-all duration-300 ease-in-out group-hover:text-primary animate-in fade-in-0 zoom-in-95">{getTimeAgo(stats.lastActivity)}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 ease-out hover:shadow-md hover: hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 group">
                <div className="p-3 bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 ease-in-out rounded-xl group-hover:scale-110 group-hover:rotate-6">
                  <Upload className="h-6 w-6 text-primary transition-transform duration-300 ease-in-out group-hover:scale-110 group-hover:-rotate-12" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground transition-colors duration-300 ease-in-out group-hover:text-primary/70">Documents</p>
                  <h3 className="text-2xl font-bold transition-all duration-300 ease-in-out group-hover:text-primary animate-in fade-in-0 zoom-in-95">{stats.documents}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 ease-out hover:shadow-md hover: hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 group">
                <div className="p-3 bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 ease-in-out rounded-xl group-hover:scale-110 group-hover:rotate-6">
                  <BookOpen className="h-6 w-6 text-primary transition-transform duration-300 ease-in-out group-hover:scale-110 group-hover:-rotate-12" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground transition-colors duration-300 ease-in-out group-hover:text-primary/70">Learning Units</p>
                  <h3 className="text-2xl font-bold transition-all duration-300 ease-in-out group-hover:text-primary animate-in fade-in-0 zoom-in-95">{stats.learningUnits}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload Document */}
          <Card className="relative overflow-hidden group">
            <CardContent className="p-6">
              <div className="relative z-10">
                <h2 className="text-2xl font-semibold mb-2">Upload Document</h2>
                <p className="text-base-content/70 mb-4">Start by uploading your study materials.</p>
                <UploadDialog 
                  trigger={
                    <Button size="lg" className="gap-2">
                      <Upload className="h-5 w-5" />
                      Upload Now
                    </Button>
                  }
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent transition-opacity group-hover:opacity-100 opacity-0" />
            </CardContent>
          </Card>

          {/* Start Learning */}
          <Card className="relative overflow-hidden group">
            <CardContent className="p-6">
              <div className="relative z-10">
                <h2 className="text-2xl font-semibold mb-2">Start Learning</h2>
                <p className="text-base-content/70 mb-4">Begin your learning journey with generated units.</p>
                <Button size="lg" variant="secondary" className="gap-2">
                  <BookOpen className="h-5 w-5" />
                  Get Started
                </Button>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent transition-opacity group-hover:opacity-100 opacity-0" />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 