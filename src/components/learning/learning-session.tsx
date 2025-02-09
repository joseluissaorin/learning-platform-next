// learning-session.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronRight, ChevronLeft, BookOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { type LearningSessionProps } from "@/types/learning";
import { type ConceptIndex } from "@/types/analysis";
import { ConceptQuestion } from "./concept-question";
import { QuestionPanel } from "./question-panel";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useConceptNavigation } from "@/lib/hooks/useConceptNavigation";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { ScreenReaderText } from "@/components/ui/screen-reader-text";
import { RegenerationProgress } from "@/components/ui/regeneration-progress";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { ConceptPath } from "@/components/ui/concept-path";
import { LoadingState } from "@/components/ui/loading-state";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { SessionTimeService } from "@/lib/services/session-time";
import { assessmentService } from "@/lib/services/assessment-service";
import { AssessmentModal } from "./assessment-modal";
import { type AssessmentBlockStatus } from "@/lib/services/assessment-service";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

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

interface ShortcutTooltipProps {
  text: string;
  children: React.ReactNode;
}

interface QuestionPanelProps {
  concept: ConceptIndex;
  explanation: string | null;
  session: LearningSessionProps;
}

export function LearningSession({ session }: LearningSessionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [activeExplanationId, setActiveExplanationId] = useState<string | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [isCheckingAssessment, setIsCheckingAssessment] = useState(false);
  const [blockStatus, setBlockStatus] = useState<AssessmentBlockStatus | null>(null);
  const { toast } = useToast();

  const {
    state: {
      explanation,
      isLoading,
      error,
      progress,
      totalVisible: totalConcepts,
      visibleIndex: currentConceptIndex,
      regenerationProgress
    },
    nextConcept,
    previousConcept,
    regenerateExplanation,
    getCurrentConcept,
    getVisibleConcepts
  } = useConceptNavigation(session);

  const currentConcept = getCurrentConcept();
  const concepts = getVisibleConcepts();
  const conceptPath = currentConcept?.title ? [currentConcept.title] : [];

  // Start time tracking when session mounts
  useEffect(() => {
    const startTimeTracking = async () => {
      try {
        await SessionTimeService.startTracking(session.id);
      } catch (error) {
        console.error('Failed to start time tracking:', error);
      }
    };

    startTimeTracking();

    // End time tracking when component unmounts
    return () => {
      const endTimeTracking = async () => {
        try {
          await SessionTimeService.endTracking(session.id);
        } catch (error) {
          console.error('Failed to end time tracking:', error);
        }
      };

      endTimeTracking();
    };
  }, [session.id]);

  // Add assessment check when progress changes
  useEffect(() => {
    const checkAssessment = async () => {
      if (isCheckingAssessment) return;
      
      setIsCheckingAssessment(true);
      try {
        const shouldAssess = await assessmentService.shouldTriggerAssessment(session);
        if (shouldAssess) {
          setShowAssessment(true);
        }
      } catch (error) {
        console.error('Error checking assessment:', error);
      } finally {
        setIsCheckingAssessment(false);
      }
    };

    checkAssessment();
  }, [session, progress, isCheckingAssessment]);

  // Add progress block check
  useEffect(() => {
    const checkProgressBlock = async () => {
      try {
        const status = await assessmentService.getProgressBlockStatus(session);
        setBlockStatus(status);
        if (status.isBlocked && !showAssessment) {
          setShowAssessment(true);
        }
      } catch (error) {
        console.error('Error checking progress block:', error);
      }
    };

    checkProgressBlock();
  }, [session, showAssessment]);

  const handleQuestionPanelToggle = useCallback((explanationId: string) => {
    setActiveExplanationId(explanationId);
    setShowQuestionPanel(!showQuestionPanel);
  }, [showQuestionPanel]);

  const handleAssessmentComplete = () => {
    setShowAssessment(false);
  };

  const handleAssessmentClose = () => {
    setShowAssessment(false);
  };

  // Modify nextConcept to check for blocks
  const handleNextConcept = async () => {
    if (blockStatus?.isBlocked) {
      setShowAssessment(true);
      return;
    }
    nextConcept();
  };

  const handleShowToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    toast({
      title: type.charAt(0).toUpperCase() + type.slice(1),
      description: message,
      variant: type === 'warning' ? 'destructive' : undefined
    });
  }, [toast]);

  return (
    <TooltipProvider>
      <div ref={containerRef} className="space-y-6">
        {/* Header */}
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
                path={conceptPath} 
                currentLayer={3} 
                className="mt-2" 
              />
            </div>
          </div>

          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleQuestionPanelToggle(activeExplanationId || currentConcept?.id || "")}
              className="transition-all duration-300 hover:scale-105 hover:bg-background/50 h-24 w-24 relative"
              disabled={isLoading}
            >
              {showQuestionPanel ? <CircleArrowLeft /> : <ChatIcon />}
              <span className="sr-only">
                {showQuestionPanel ? "Close question panel" : "Open question panel"}
              </span>
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
              <motion.div
                layout
                key={currentConcept?.id}
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
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <h3 className="text-2xl font-semibold tracking-tight">
                            {currentConcept?.title}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Concept {currentConceptIndex + 1} of {totalConcepts}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={regenerateExplanation}
                        disabled={isLoading || regenerationProgress.isRegenerating}
                        className="relative"
                      >
                        <RefreshCw className={cn(
                          "h-5 w-5 transition-all",
                          regenerationProgress.isRegenerating && "animate-spin"
                        )} />
                        <span className="sr-only">Regenerate explanation</span>
                      </Button>
                    </div>

                    <div className="relative h-[calc(100vh-32rem)] min-h-[250px]">
                      <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                          <div className="px-1">
                            <LoadingState
                              state={regenerationProgress.isRegenerating ? "regenerating" : "generating"}
                              progress={regenerationProgress.progress}
                            />
                          </div>
                        ) : error ? (
                          <div className="p-4 text-red-500">
                            {error}
                          </div>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{explanation || ""}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={previousConcept}
                            disabled={currentConceptIndex === 0 || isLoading}
                            className="gap-2"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Previous (←)</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleNextConcept}
                            disabled={
                              currentConceptIndex === totalConcepts - 1 || 
                              isLoading || 
                              (blockStatus?.isBlocked && !showAssessment)
                            }
                            className="gap-2"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {blockStatus?.isBlocked 
                            ? "Complete the assessment to continue"
                            : "Next (→)"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {showQuestionPanel && currentConcept && (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <QuestionPanel
                    explanationId={activeExplanationId || currentConcept.id}
                    concept={currentConcept}
                    explanation={explanation}
                    session={session}
                  />
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <ToastContainer>
          {error && <Toast type="error" message={error} />}
        </ToastContainer>

        {/* Progress Block Alert */}
        {blockStatus?.isBlocked && !showAssessment && (
          <AlertDialog open>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Progress Blocked</AlertDialogTitle>
                <AlertDialogDescription>
                  {blockStatus.reason}
                  <div className="mt-4">
                    <p>Required Score: {blockStatus.requiredScore}%</p>
                    <p>Your Score: {blockStatus.currentScore}%</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex justify-end space-x-4 mt-4">
                <Button 
                  onClick={() => {
                    setShowAssessment(true);
                    handleShowToast('Starting assessment...', 'info');
                  }}
                >
                  Take Assessment
                </Button>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Assessment Modal */}
        {showAssessment && (
          <AssessmentModal
            session={session}
            onComplete={async () => {
              setShowAssessment(false);
              // Recheck block status after assessment
              try {
                const newStatus = await assessmentService.getProgressBlockStatus(session);
                setBlockStatus(newStatus);
                if (!newStatus.isBlocked) {
                  handleShowToast('You can now continue with your learning session.', 'success');
                }
              } catch (error) {
                console.error('Error checking block status:', error);
                handleShowToast('Failed to update progress status. Please refresh the page.', 'error');
              }
            }}
            onClose={() => {
              if (!blockStatus?.isBlocked) {
                setShowAssessment(false);
              } else {
                handleShowToast('You need to complete the assessment to continue.', 'warning');
              }
            }}
            onShowToast={handleShowToast}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
