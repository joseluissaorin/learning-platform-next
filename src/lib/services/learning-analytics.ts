import { prisma } from "@/lib/prisma";
import { StudyPattern, TopicMastery } from "@prisma/client";

export class LearningAnalyticsService {
  /**
   * Record a learning session analytics
   */
  static async recordSession(
    userId: string,
    sessionLength: number,
    completedUnits: number,
    retentionScore?: number,
    topicId?: string
  ): Promise<void> {
    const now = new Date();
    const timeOfDay = now.getHours();

    // Calculate focus score based on session length and completed units
    const focusScore = Math.min(
      (completedUnits * 20) + (sessionLength / 60) * 10,
      100
    );

    await prisma.learningAnalytics.create({
      data: {
        userId,
        timeOfDay,
        sessionLength,
        completedUnits,
        retentionScore,
        focusScore,
        topicId
      }
    });

    // Update study patterns
    await this.updateStudyPattern(userId, timeOfDay, now.getDay(), focusScore);
  }

  /**
   * Update study pattern for a specific time
   */
  private static async updateStudyPattern(
    userId: string,
    hourOfDay: number,
    dayOfWeek: number,
    effectiveness: number
  ): Promise<void> {
    const existingPattern = await prisma.studyPattern.findUnique({
      where: {
        userId_dayOfWeek_hourOfDay: {
          userId,
          dayOfWeek,
          hourOfDay
        }
      }
    });

    if (existingPattern) {
      const newFrequency = existingPattern.frequency + 1;
      const newEffectiveness = (existingPattern.effectiveness * existingPattern.frequency + effectiveness) / newFrequency;

      await prisma.studyPattern.update({
        where: { id: existingPattern.id },
        data: {
          frequency: newFrequency,
          effectiveness: newEffectiveness
        }
      });
    } else {
      await prisma.studyPattern.create({
        data: {
          userId,
          dayOfDay: hourOfDay,
          dayOfWeek,
          effectiveness,
          frequency: 1
        }
      });
    }
  }

  /**
   * Update topic mastery
   */
  static async updateTopicMastery(
    userId: string,
    topic: string,
    success: boolean
  ): Promise<void> {
    const existingMastery = await prisma.topicMastery.findUnique({
      where: {
        userId_topic: {
          userId,
          topic
        }
      }
    });

    if (existingMastery) {
      const newAttempts = existingMastery.attempts + 1;
      const newSuccessRate = (existingMastery.successRate * existingMastery.attempts + (success ? 100 : 0)) / newAttempts;
      const newMasteryLevel = Math.min(existingMastery.masteryLevel + (success ? 5 : -2), 100);

      await prisma.topicMastery.update({
        where: { id: existingMastery.id },
        data: {
          attempts: newAttempts,
          successRate: newSuccessRate,
          masteryLevel: Math.max(newMasteryLevel, 0),
          lastReviewed: new Date()
        }
      });
    } else {
      await prisma.topicMastery.create({
        data: {
          userId,
          topic,
          masteryLevel: success ? 20 : 10,
          attempts: 1,
          successRate: success ? 100 : 0
        }
      });
    }
  }

  /**
   * Get best study times for a user
   */
  static async getBestStudyTimes(userId: string): Promise<Array<{
    dayOfWeek: number;
    hourOfDay: number;
    effectiveness: number;
    frequency: number;
  }>> {
    const patterns = await prisma.studyPattern.findMany({
      where: { userId },
      orderBy: [
        { effectiveness: 'desc' },
        { frequency: 'desc' }
      ],
      take: 5
    });

    return patterns.map((p: StudyPattern) => ({
      dayOfWeek: p.dayOfWeek,
      hourOfDay: p.hourOfDay,
      effectiveness: p.effectiveness,
      frequency: p.frequency
    }));
  }

  /**
   * Get topic strengths and weaknesses
   */
  static async getTopicMasteryAnalysis(userId: string): Promise<{
    strengths: Array<{ topic: string; masteryLevel: number }>;
    weaknesses: Array<{ topic: string; masteryLevel: number }>;
  }> {
    const topics = await prisma.topicMastery.findMany({
      where: { userId },
      orderBy: { masteryLevel: 'desc' }
    });

    return {
      strengths: topics
        .filter(t => t.masteryLevel >= 70)
        .map(t => ({ topic: t.topic, masteryLevel: t.masteryLevel }))
        .slice(0, 3),
      weaknesses: topics
        .filter(t => t.masteryLevel < 70)
        .sort((a, b) => a.masteryLevel - b.masteryLevel)
        .map(t => ({ topic: t.topic, masteryLevel: t.masteryLevel }))
        .slice(0, 3)
    };
  }

  /**
   * Get learning pace trend
   */
  static async getLearningPaceTrend(userId: string): Promise<Array<{
    date: Date;
    completedUnits: number;
    focusScore: number;
  }>> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const analytics = await prisma.learningAnalytics.findMany({
      where: {
        userId,
        date: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { date: 'asc' }
    });

    // Group by date
    const dailyStats = new Map<string, { completedUnits: number; focusScore: number }>();
    
    analytics.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const existing = dailyStats.get(dateKey) || { completedUnits: 0, focusScore: 0 };
      
      dailyStats.set(dateKey, {
        completedUnits: existing.completedUnits + record.completedUnits,
        focusScore: Math.max(existing.focusScore, record.focusScore || 0)
      });
    });

    return Array.from(dailyStats.entries()).map(([dateStr, stats]) => ({
      date: new Date(dateStr),
      ...stats
    }));
  }
} 