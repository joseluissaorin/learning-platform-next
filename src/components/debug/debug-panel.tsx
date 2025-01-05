import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/debug/logger';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bug, X, RefreshCw, Trash2, Filter } from 'lucide-react';

interface DebugPanelProps {
  state: any;
  module: string;
}

export function DebugPanel({ state, module }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'debug' | 'info' | 'warn' | 'error' | null>(null);
  const [logs, setLogs] = useState(logger.getLogs());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isOpen || !isAutoRefresh) return;

    const interval = setInterval(() => {
      setLogs(logger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isAutoRefresh]);

  const filteredLogs = selectedLevel 
    ? logs.filter(log => log.level === selectedLevel)
    : logs;

  const moduleFilteredLogs = module
    ? filteredLogs.filter(log => log.module === module)
    : filteredLogs;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-50"
        title="Toggle Debug Panel"
      >
        <Bug className="h-4 w-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-16 left-4 right-4 max-w-2xl h-96 z-50"
          >
            <Card className="h-full overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  <h3 className="font-semibold">Debug Panel</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                    className={cn(isAutoRefresh && "text-primary")}
                    title="Toggle Auto Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => logger.clearLogs()}
                    title="Clear Logs"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedLevel(null)}
                    className={cn(!selectedLevel && "text-primary")}
                    title="Clear Filter"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    title="Close Panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 h-[calc(100%-57px)]">
                {/* State View */}
                <div className="border-r p-4 overflow-auto">
                  <h4 className="font-medium mb-2">Current State</h4>
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(state, null, 2)}
                  </pre>
                </div>

                {/* Logs View */}
                <div className="p-4 overflow-auto">
                  <h4 className="font-medium mb-2">Logs</h4>
                  <div className="space-y-2">
                    {moduleFilteredLogs.map((log, index) => (
                      <div
                        key={index}
                        className={cn(
                          "text-xs p-2 rounded",
                          log.level === 'error' && "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300",
                          log.level === 'warn' && "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
                          log.level === 'info' && "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
                          log.level === 'debug' && "bg-gray-50 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">[{log.level.toUpperCase()}]</span>
                          <span className="text-xs opacity-70">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div>{log.message}</div>
                        {log.data && (
                          <pre className="mt-1 text-xs opacity-70">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 