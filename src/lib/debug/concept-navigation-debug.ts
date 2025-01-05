import { type Concept } from '@/types/learning';

class ConceptNavigationDebugger {
  private isBrowser = typeof window !== 'undefined';

  private logToConsole(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}\n`;
    
    if (this.isBrowser) {
      // Store in localStorage for persistence (browser only)
      try {
        const logs = JSON.parse(localStorage.getItem('concept-navigation-logs') || '[]');
        logs.push(logEntry);
        // Keep only last 1000 logs
        if (logs.length > 1000) {
          logs.shift();
        }
        localStorage.setItem('concept-navigation-logs', JSON.stringify(logs));
      } catch (error) {
        console.warn('Failed to write to localStorage:', error);
      }

      // Also log to console for development
      console.log(`[Concept Navigation] ${message}`, data || '');
    } else {
      // Server-side logging
      console.log(`[Concept Navigation SSR] ${message}`, data || '');
    }
  }

  logLayerTransition(fromLayer: number, toLayer: number, currentIndex: number) {
    this.logToConsole('Layer Transition', {
      fromLayer,
      toLayer,
      currentIndex,
      timestamp: new Date().toISOString()
    });
  }

  logConceptFiltering(layer: number, allConcepts: Concept[], filteredConcepts: Concept[]) {
    this.logToConsole('Concept Filtering', {
      layer,
      totalConcepts: allConcepts.length,
      filteredCount: filteredConcepts.length,
      allConceptIds: allConcepts.map(c => c.id),
      filteredConceptIds: filteredConcepts.map(c => c.id)
    });
  }

  logPatternMatching(conceptId: string, pattern: string, isMatch: boolean, layer: number) {
    this.logToConsole('Pattern Matching', {
      conceptId,
      pattern,
      isMatch,
      layer
    });
  }

  logCurrentState(state: any) {
    this.logToConsole('Current Navigation State', state);
  }

  logError(error: Error, context: any = {}) {
    this.logToConsole('Error', {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  // Utility method to get all logs (browser only)
  getLogs(): string[] {
    if (!this.isBrowser) return [];
    try {
      return JSON.parse(localStorage.getItem('concept-navigation-logs') || '[]');
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return [];
    }
  }

  // Utility method to clear logs (browser only)
  clearLogs(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem('concept-navigation-logs', '[]');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

export const conceptNavigationDebugger = new ConceptNavigationDebugger(); 