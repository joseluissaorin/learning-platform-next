"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Brain, TrendingUp, Calendar, Target, Zap } from "lucide-react";
import { learningAnalyticsService } from "@/lib/services/learning-analytics-service";
import type { LearningMetrics, StudyRecommendation } from "@/lib/services/learning-analytics-service";

interface AnalyticsPanelProps {
  userId: string;
}

export function AnalyticsPanel({ userId }: AnalyticsPanelProps) {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<StudyRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [metricsData, recommendationsData] = await Promise.all([
          learningAnalyticsService.getLearningMetrics(userId),
          learningAnalyticsService.getStudyRecommendations(userId)
        ]);

        setMetrics(metricsData);
        setRecommendations(recommendationsData);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [userId]);

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  if (isLoading || !metrics || !recommendations) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">Learning Analytics</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Retention Rate</span>
                  <span className="text-primary">{Math.round(metrics.retentionRate)}%</span>
                </div>
                <Progress value={metrics.retentionRate} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Focus Score</span>
                  <span className="text-primary">{Math.round(metrics.focusScore)}%</span>
                </div>
                <Progress value={metrics.focusScore} />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Completed {metrics.completedUnits} units</p>
                <p>Total study time: {Math.round(metrics.timeSpent)} minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topic Mastery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Topic Mastery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topicMastery.map((topic, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {topic.topic}
                      {topic.trend === 'improving' && <TrendingUp className="h-3 w-3 text-green-500" />}
                      {topic.trend === 'declining' && <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />}
                    </span>
                    <span className={
                      topic.masteryLevel >= 70 ? "text-green-500" :
                      topic.masteryLevel >= 40 ? "text-orange-500" : "text-red-500"
                    }>
                      {Math.round(topic.masteryLevel)}%
                    </span>
                  </div>
                  <Progress 
                    value={topic.masteryLevel} 
                    className={
                      topic.masteryLevel >= 70 ? "bg-green-100 dark:bg-green-900" :
                      topic.masteryLevel >= 40 ? "bg-orange-100 dark:bg-orange-900" :
                      "bg-red-100 dark:bg-red-900"
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Study Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Study Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Optimal Study Time</h4>
                <p className="text-2xl font-bold text-primary">
                  {formatTime(recommendations.bestTimeToStudy)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Recommended session: {recommendations.recommendedSessionLength} minutes
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Topics to Review</h4>
                <ul className="space-y-1">
                  {recommendations.recommendedTopics.map((topic, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {topic}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Current Difficulty Level</h4>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-2 flex-1 rounded-full ${
                        level <= recommendations.difficulty
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  Level {recommendations.difficulty} of 5
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Calendar */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Best Study Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-sm font-medium">
                  {day}
                </div>
              ))}
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <div key={dayIndex} className="space-y-2">
                  <div
                    className="aspect-square rounded-md relative"
                    style={{
                      backgroundColor: dayIndex === new Date().getDay()
                        ? 'hsl(var(--primary))' 
                        : 'hsl(var(--muted))'
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-xs">
                      {formatTime(metrics.bestTimeOfDay)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 