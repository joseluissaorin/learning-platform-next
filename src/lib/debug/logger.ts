type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private static instance: DebugLogger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private isDebugMode: boolean = process.env.NODE_ENV === 'development';

  private constructor() {}

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private log(level: LogLevel, module: string, message: string, data?: any) {
    if (!this.isDebugMode) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      module,
      message,
      data
    };

    console.log(`[${level.toUpperCase()}] [${module}] ${message}`, data || '');
    
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  debug(module: string, message: string, data?: any) {
    this.log('debug', module, message, data);
  }

  info(module: string, message: string, data?: any) {
    this.log('info', module, message, data);
  }

  warn(module: string, message: string, data?: any) {
    this.log('warn', module, message, data);
  }

  error(module: string, message: string, data?: any) {
    this.log('error', module, message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    return level 
      ? this.logs.filter(log => log.level === level)
      : this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  setDebugMode(enabled: boolean) {
    this.isDebugMode = enabled;
  }
}

export const logger = DebugLogger.getInstance(); 