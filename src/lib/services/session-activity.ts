export class SessionActivityService {
  private static instance: SessionActivityService;
  private updateQueue: Map<string, NodeJS.Timeout>;
  private readonly DEBOUNCE_TIME = 5000; // 5 seconds

  private constructor() {
    this.updateQueue = new Map();
  }

  public static getInstance(): SessionActivityService {
    if (!SessionActivityService.instance) {
      SessionActivityService.instance = new SessionActivityService();
    }
    return SessionActivityService.instance;
  }

  public async trackActivity(sessionId: string): Promise<void> {
    // Clear any existing timeout for this session
    const existingTimeout = this.updateQueue.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set a new debounced timeout
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/activity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || 'Failed to update session activity');
        }

        this.updateQueue.delete(sessionId);
      } catch (error) {
        console.error('Error updating session activity:', error);
      }
    }, this.DEBOUNCE_TIME);

    this.updateQueue.set(sessionId, timeout);
  }

  public async getLastActive(sessionId: string): Promise<Date | null> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to get session data');
      }
      const data = await response.json();
      return data.lastActiveAt ? new Date(data.lastActiveAt) : null;
    } catch (error) {
      console.error('Error getting session last active time:', error);
      return null;
    }
  }

  public async cleanupInactiveSessions(thresholdDays: number = 30): Promise<void> {
    try {
      const response = await fetch('/api/sessions/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thresholdDays }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to cleanup inactive sessions');
      }
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
    }
  }
} 