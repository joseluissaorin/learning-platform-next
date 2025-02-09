import { prisma } from "@/lib/prisma";

export class SessionTimeService {
  /**
   * Start tracking time for a session
   */
  static async startTracking(sessionId: string): Promise<void> {
    // First, ensure any existing active tracking is ended
    await this.endTracking(sessionId);

    // Start new tracking
    await prisma.sessionTime.create({
      data: {
        sessionId,
        startTime: new Date(),
        isActive: true
      }
    });
  }

  /**
   * End tracking time for a session
   */
  static async endTracking(sessionId: string): Promise<void> {
    const now = new Date();

    // Find active tracking record
    const activeRecord = await prisma.sessionTime.findFirst({
      where: {
        sessionId,
        isActive: true
      }
    });

    if (activeRecord) {
      const duration = Math.floor((now.getTime() - activeRecord.startTime.getTime()) / 1000);
      
      // Update the record
      await prisma.sessionTime.update({
        where: { id: activeRecord.id },
        data: {
          endTime: now,
          duration,
          isActive: false
        }
      });
    }
  }

  /**
   * Get total time spent in a session
   */
  static async getSessionTime(sessionId: string): Promise<number> {
    const records = await prisma.sessionTime.findMany({
      where: { sessionId }
    });

    let totalSeconds = 0;

    for (const record of records) {
      if (record.duration) {
        totalSeconds += record.duration;
      } else if (record.isActive && record.startTime) {
        // Calculate duration for active session
        const now = new Date();
        totalSeconds += Math.floor((now.getTime() - record.startTime.getTime()) / 1000);
      }
    }

    return totalSeconds;
  }

  /**
   * Get total time spent by a user across all sessions
   */
  static async getUserTotalTime(userId: string): Promise<number> {
    const sessions = await prisma.learningSession.findMany({
      where: { userId },
      include: {
        timeRecords: true
      }
    });

    let totalSeconds = 0;

    for (const session of sessions) {
      for (const record of session.timeRecords) {
        if (record.duration) {
          totalSeconds += record.duration;
        } else if (record.isActive && record.startTime) {
          // Calculate duration for active session
          const now = new Date();
          totalSeconds += Math.floor((now.getTime() - record.startTime.getTime()) / 1000);
        }
      }
    }

    return totalSeconds;
  }

  /**
   * Format seconds into a human-readable string
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
} 