"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Layers,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type LearningSessionProps } from "@/types/learning";
import { ConceptQuestion } from "./concept-question";
import { QuestionPanel } from "./question-panel";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { SessionActivityService } from '@/lib/services/session-activity';
import { useConceptNavigation } from '@/lib/hooks/useConceptNavigation';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { ShortcutTooltip } from '@/components/ui/shortcut-tooltip';
import { useFocusManagement } from '@/lib/hooks/useFocusManagement';
import { ScreenReaderText } from '@/components/ui/screen-reader-text';
import { RegenerationProgress } from "@/components/ui/regeneration-progress";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { DebugPanel } from '@/components/debug/debug-panel';
import { LayerControls } from "@/components/ui/layer-controls";
import { ConceptPath } from "@/components/ui/concept-path";
import { LoadingState } from "@/components/ui/loading-state";

const ChatIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className="h-12 w-12"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M18 3a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-4.724l-4.762 2.857a1 1 0 0 1 -1.508 -.743l-.006 -.114v-2h-1a4 4 0 0 1 -3.995 -3.8l-.005 -.2v-8a4 4 0 0 1 4 -4zm-2.8 9.286a1 1 0 0 0 -1.414 .014a2.5 2.5 0 0 1 -3.572 0a1 1 0 0 0 -1.428 1.4a4.5 4.5 0 0 0 6.428 0a1 1 0 0 0 -.014 -1.414m-5.69 -4.286h-.01a1 1 0 1 0 0 2h.01a1 1 0 0 0 0 -2m5 0h-.01a1 1 0 0 0 0 2h.01a1 1 0 0 0 0 -2" />
  </svg>
);

const CircleArrowLeft = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className="h-12 w-12"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 2a10 10 0 0 1 .324 19.995l-.324 .005l-.324 -.005a10 10 0 0 1 .324 -19.995zm.707 5.293a1 1 0 0 0 -1.414 0l-4 4a1.048 1.048 0 0 0 -.083 .094l-.064 .092l-.052 .098l-.044 .11l-.03 .112l-.017 .126l-.003 .075l.004 .09l.007 .058l.025 .118l.035 .105l.054 .113l.043 .07l.071 .095l.054 .058l4 4l.094 .083a1 1 0 0 0 1.32 -1.497l-2.292 -2.293h5.585l.117 -.007a1 1 0 0 0 -.117 -1.993h-5.586l2.293 -2.293l.083 -.094a1 1 0 0 0 -.083 -1.32z" />
  </svg>
);

const QuestionMark = () => (
  <svg  
    xmlns="http://www.w3.org/2000/svg"  
    width="24"  
    height="24"  
    viewBox="0 0 24 24"  
    fill="none"  
    stroke="currentColor"  
    strokeWidth="2"  
    strokeLinecap="round"  
    strokeLinejoin="round"
    className="h-8 w-8"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4" />
    <path d="M12 19l0 .01" />
  </svg>
);

const LoadingSpinner = ({ 
  isRegenerating,
  completedLayers,
  totalLayers
}: { 
  isRegenerating: boolean;
  completedLayers: number;
  totalLayers: number;
}) => (
  <div className="flex flex-col items-center justify-center h-full space-y-4">
    <div className="animate-spin">
      <RefreshCw className="h-8 w-8 text-primary" />
    </div>
    <p className="text-sm text-muted-foreground">
      {isRegenerating ? "Regenerating explanations..." : "Loading explanation..."}
    </p>
    {isRegenerating && (
      <RegenerationProgress
        completedLayers={completedLayers}
        totalLayers={totalLayers}
        className="w-64"
      />
    )}
  </div>
);

const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-4">
    <p className="text-sm text-red-500">{error}</p>
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="text-muted-foreground hover:text-primary"
    >
      Try Again
    </Button>
  </div>
);

interface Concept {
  id: string;
  title: string;
  content: string;
}

interface ContentMotionProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function LearningSession({ session }: LearningSessionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [activeExplanationId, setActiveExplanationId] = useState<string | null>(null);

  const {
    state: {
      currentLayer,
      explanation,
      isLoading,
      error,
      progress,
      totalConceptsInLayer,
      completedConceptsInLayer,
      currentPath,
      regenerationProgress,
      toast
    },
    nextConcept,
    previousConcept,
    changeLayer,
    regenerateExplanation,
    getCurrentConcept,
    getLayerConcepts
  } = useConceptNavigation(session);

  const currentConcept = getCurrentConcept();
  const layerConcepts = getLayerConcepts();

  const handleQuestionPanelToggle = useCallback((explanationId: string) => {
    setActiveExplanationId(explanationId);
    setShowQuestionPanel(!showQuestionPanel);
  }, [showQuestionPanel]);

  const handleConceptComplete = useCallback(() => {
    setShowQuestion(false);
    if (completedConceptsInLayer < totalConceptsInLayer) {
      nextConcept();
    }
  }, [completedConceptsInLayer, totalConceptsInLayer, nextConcept]);

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Header with Title, Progress, and Chat */}
      <div className="grid grid-cols-[1fr,auto] gap-4">
        <div className="group p-2 rounded-lg hover:bg-background/50 transition-all duration-300">
          <p className="text-sm text-muted-foreground group-hover:text-primary/70 transition-colors duration-300">
            Current Session
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-6 select-none">
              <h2 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors duration-300">
                {session.title}
              </h2>
              <div className="flex items-center gap-4 flex-grow max-w-md">
                <Progress 
                  value={progress} 
                  className={cn(
                    "h-1.5 transition-all duration-300",
                    progress === 100 && "bg-primary/20"
                  )} 
                />
                <span className="text-lg font-semibold text-muted-foreground min-w-[3rem] text-right">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
            <ConceptPath 
              path={currentPath} 
              currentLayer={currentLayer}
              className="mt-2" 
            />
          </div>
        </div>

        {/* Chat Button */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleQuestionPanelToggle(activeExplanationId || currentConcept?.id || "")}
            className="transition-all duration-300 hover:scale-105 hover:bg-background/50 h-24 w-24 relative"
            disabled={isLoading}
          >
            {/* Your existing chat button content */}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={showQuestionPanel ? "split" : "full"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <motion.div
            layout
            className={cn(
              "grid gap-8",
              showQuestionPanel ? "grid-cols-[7fr,5fr]" : "grid-cols-1"
            )}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Main Content Area */}
            <motion.div
              layout
              key={`${currentConcept?.id}-${currentLayer}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "rounded-lg min-h-[600px]",
                showQuestionPanel ? "" : "col-span-full"
              )}
            >
              <Card className="border-0 shadow-none h-full">
                <div className="p-6 space-y-6">
                  {!showQuestion ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <h3 className="text-2xl font-semibold tracking-tight">
                              {currentConcept?.title}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {completedConceptsInLayer} of {totalConceptsInLayer} concepts at Layer {currentLayer}
                          </p>
                        </div>

                        <LayerControls
                          currentLayer={currentLayer}
                          isLoading={isLoading}
                          onLayerChange={changeLayer}
                          path={currentPath}
                        />
                      </div>

                      {/* Content Area */}
                      <div className="relative h-[calc(100vh-32rem)] min-h-[250px]">
                        <div className="transition-opacity duration-200">
                          {isLoading ? (
                            <div className="opacity-100">
                              <LoadingState 
                                state={regenerationProgress.isRegenerating ? 'regenerating' : 
                                  currentLayer === 1 ? 'summarizing' :
                                  currentLayer === 2 ? 'analyzing' : 'generating'
                                }
                                layer={currentLayer}
                                progress={regenerationProgress.isRegenerating ? 
                                  (regenerationProgress.completedLayers / regenerationProgress.totalLayers) * 100 : 
                                  undefined
                                }
                              />
                            </div>
                          ) : error ? (
                            <div className="opacity-100">
                              <ErrorDisplay 
                                error={error} 
                                onRetry={regenerateExplanation} 
                              />
                            </div>
                          ) : (
                            <div className="prose prose-lg max-w-none dark:prose-invert opacity-100">
                              <ReactMarkdown>{explanation || currentConcept?.content || ""}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Navigation Controls */}
                      <div className="flex items-center justify-between pt-4 space-x-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={previousConcept}
                          disabled={completedConceptsInLayer <= 1 || isLoading}
                          className="relative group"
                        >
                          <ChevronLeft className="h-5 w-5" />
                          <ShortcutTooltip shortcut="←" />
                        </Button>

                        <div className="flex gap-4">
                          <Button
                            variant="outline"
                            onClick={() => setShowQuestion(true)}
                            disabled={isLoading}
                            className="relative group"
                          >
                            <QuestionMark className="h-5 w-5 mr-2" />
                            Test Understanding
                            <ShortcutTooltip shortcut="Q" />
                          </Button>

                          <Button
                            variant="outline"
                            onClick={regenerateExplanation}
                            disabled={isLoading}
                            className="relative group"
                          >
                            <RefreshCw className={cn(
                              "h-5 w-5 mr-2",
                              isLoading && "animate-spin"
                            )} />
                            Regenerate
                            <ShortcutTooltip shortcut="R" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={nextConcept}
                          disabled={completedConceptsInLayer >= totalConceptsInLayer || isLoading}
                          className="relative group"
                        >
                          <ChevronRight className="h-5 w-5" />
                          <ShortcutTooltip shortcut="→" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <ConceptQuestion
                      concept={currentConcept as Concept}
                      onComplete={handleConceptComplete}
                      onBack={() => setShowQuestion(false)}
                    />
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Question Panel */}
            <AnimatePresence mode="wait">
              {showQuestionPanel && (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <QuestionPanel
                    explanationId={activeExplanationId || currentConcept?.id || ""}
                    concept={currentConcept as Concept}
                    explanation={explanation}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Toast and Debug Panel */}
      <ToastContainer>
        {toast.type && toast.message && (
          <Toast type={toast.type} message={toast.message} />
        )}
      </ToastContainer>

      {process.env.NODE_ENV === 'development' && (
        <DebugPanel
          state={{
            session,
            currentConcept,
            currentLayer,
            explanation,
            isLoading,
            error,
            progress,
            totalConceptsInLayer,
            completedConceptsInLayer,
            regenerationProgress,
            showQuestion,
            showQuestionPanel,
            activeExplanationId,
            currentPath
          }}
          module="LearningSession"
        />
      )}
    </div>
  );
} 