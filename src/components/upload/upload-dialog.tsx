"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type UploadStage,
  type UploadFile,
  type UploadDialogProps,
  type ProcessingProgress,
  type AnalysisResult,
} from "@/types/upload";
import {
  validateFile,
  createUploadFile,
  processFiles,
  formatFileSize,
} from "@/lib/upload";
import { StructuredDocumentService } from "@/lib/services/structured-document-service";

const STAGES = {
  UPLOAD: "upload",
  PROCESSING: "processing",
  ANALYZING: "analyzing",
  STRUCTURING: "structuring",
  COMPLETE: "complete",
} as const;

export function UploadDialog({ trigger, onComplete }: UploadDialogProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<UploadStage>(STAGES.UPLOAD);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detailedStatus, setDetailedStatus] = useState<string>("");
  const [language, setLanguage] = useState("en");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("[Upload] Files dropped:", {
      count: acceptedFiles.length,
      files: acceptedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });
    
    setError(null);
    
    const newFiles = acceptedFiles.map((file) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        console.log("[Upload] File validation failed:", {
          file: file.name,
          error: validation.error
        });
        setError(validation.error || "Invalid file");
        return null;
      }
      console.log("[Upload] File validated successfully:", file.name);
      return createUploadFile(file);
    });

    const validFiles = newFiles.filter((file): file is UploadFile => file !== null);
    console.log("[Upload] Added valid files:", validFiles.map(f => f.name));
    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 15 * 1024 * 1024, // 15MB
  });

  const dropzoneClasses = cn(
    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
    isDragActive
      ? "border-primary bg-primary/5"
      : "border-muted-foreground/25"
  );

  const removeFile = (id: string) => {
    console.log("[Upload] Removing file:", id);
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleStructuredDocumentGeneration = async (
    content: string,
    analysisResult: AnalysisResult
  ) => {
    try {
      console.log("[Structured Document] Starting generation");
      setStage(STAGES.STRUCTURING);
      setProgress(0);
      setDetailedStatus("Generating structured document...");

      const response = await fetch('/api/sessions/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: files[0]?.name || 'Untitled Document',
          content: content,
          index: analysisResult.index,
          language: language
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate structured document');
      }

      const result = await response.json();

      if (!result.success || !result.data?.sessionId) {
        throw new Error('Invalid response from server');
      }

      setStage(STAGES.COMPLETE);
      setProgress(100);
      setDetailedStatus("Document processing complete! Redirecting...");

      if (onComplete) {
        onComplete(files);
      }

      // Close the dialog and redirect to the learning session
      setOpen(false);
      router.push(`/dashboard/learning?session=∫${result.data.sessionId}`);

    } catch (error) {
      console.error("[Structured Document] Generation failed:", error);
      setError(error instanceof Error ? error.message : "Failed to generate structured document");
      setStage(STAGES.UPLOAD);
    }
  };

  const handleProcess = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    console.log("[Processing] Starting file processing");
    setError(null);
    setStage(STAGES.PROCESSING);
    setProgress(0);
    setDetailedStatus("Starting file processing...");

    try {
      // Process all files to markdown first
      console.log("[Processing] Converting files to markdown");
      setDetailedStatus("Converting files to markdown...");
      const processedFiles = await processFiles(files, (progress) => {
        console.log("[Processing] File conversion progress:", progress);
        setProgress(progress);
      });

      // Check if any files failed to process
      const failedFiles = processedFiles.filter((file) => file.status === "error");
      if (failedFiles.length > 0) {
        console.error("[Processing] Files failed to process:", failedFiles);
        throw new Error(
          `Failed to process files: ${failedFiles
            .map((f) => f.name)
            .join(", ")}`,
        );
      }
      console.log("[Processing] All files processed successfully");

      // Combine all markdown content with document titles
      console.log("[Processing] Combining markdown content");
      setDetailedStatus("Combining document content...");
      const combinedContent = processedFiles
        .map((file) => {
          if (!file.markdown) {
            console.warn("[Processing] No markdown content for file:", file.name);
            return "";
          }
          console.log("[Processing] Adding content for file:", {
            name: file.name,
            contentLength: file.markdown.length,
            preview: file.markdown.substring(0, 100)
          });
          return file.markdown;
        })
        .filter(Boolean)
        .join("\n\n---\n\n");
      
      if (!combinedContent) {
        throw new Error("No content available from processed files");
      }
      
      console.log("[Processing] Combined content:", {
        totalLength: combinedContent.length,
        preview: combinedContent.substring(0, 100),
        hasMarkdown: combinedContent.includes('#')
      });

      // Store the content in sessionStorage for backup
      sessionStorage.setItem('currentDocumentContent', combinedContent);

      // Analyze combined content
      console.log("[Analysis] Starting content analysis");
      setStage(STAGES.ANALYZING);
      setProgress(0);
      setDetailedStatus("Starting content analysis...");

      // Create a promise to handle the analysis completion
      const analysisPromise = new Promise((resolve, reject) => {
        let lastProgressTimestamp = Date.now();
        let progressTimeout: NodeJS.Timeout;
        let eventSource: EventSource | null = null;

        const resetProgressTimeout = () => {
          if (progressTimeout) clearTimeout(progressTimeout);
          progressTimeout = setTimeout(() => {
            console.error("[Analysis] Progress timeout - no updates received");
            if (eventSource) eventSource.close();
            reject(new Error("Analysis timed out - no progress updates received"));
          }, 300000); // 5 minute timeout
        };

        const cleanup = () => {
          if (progressTimeout) clearTimeout(progressTimeout);
          if (eventSource) eventSource.close();
        };

        // Generate session ID first
        const sessionId = crypto.randomUUID();
        console.log("[Analysis] Generated session ID:", sessionId);

        // First make the POST request to start the analysis
        console.log("[Analysis] Sending POST request to analyze endpoint");
        fetch(`/api/analyze/stream?session=${sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: combinedContent,
            format: 'markdown',
          }),
          credentials: 'include',
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Analysis request failed: ${response.statusText}`);
          }
          
          // After successful POST, set up the EventSource
          console.log("[Analysis] Setting up EventSource");
          eventSource = new EventSource(`/api/analyze/stream?session=${sessionId}`, {
            withCredentials: true
          });

          const hasCompleted = false;

          // Handle progress updates
          console.log("[Analysis] Adding progress event listener");
          eventSource.addEventListener('progress', (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              console.log("[Analysis] Progress event received:", data);
              
              // Reset timeout on progress update
              resetProgressTimeout();
              lastProgressTimestamp = Date.now();
              
              // Update both status text and progress bar
              setDetailedStatus(data.stage);
              if (typeof data.progress === 'number' && !isNaN(data.progress)) {
                // Ensure progress is between 0 and 100
                const normalizedProgress = Math.min(Math.max(data.progress, 0), 100);
                setProgress(normalizedProgress);
                console.log("[Analysis] Progress updated:", {
                  stage: data.stage,
                  progress: normalizedProgress,
                  timestamp: data.timestamp
                });
              } else {
                console.warn("[Analysis] Invalid progress value received:", data.progress);
              }
            } catch (error) {
              console.error("[Analysis] Error processing progress event:", error);
            }
          });

          // Handle completion
          console.log("[Analysis] Adding complete event listener");
          eventSource.addEventListener('complete', (event: MessageEvent) => {
            try {
              const analysisResult: AnalysisResult = JSON.parse(event.data);
              console.log("[Analysis] Analysis complete:", analysisResult);
              cleanup();

              // Start structured document generation
              handleStructuredDocumentGeneration(combinedContent, analysisResult);

            } catch (error) {
              console.error("[Analysis] Error processing completion:", error);
              cleanup();
              reject(error);
            }
          });

          // Handle errors
          console.log("[Analysis] Adding error event listener");
          eventSource.addEventListener('error', (event: MessageEvent) => {
            // Only handle as error if we haven't completed successfully
            if (!hasCompleted) {
              console.log("[Analysis] Error event received:", event);
              let errorMessage = 'Connection closed';
              
              try {
                if (event.data) {
                  const data = JSON.parse(event.data);
                  errorMessage = data.error || errorMessage;
                }
              } catch (parseError) {
                console.error("[Analysis] Error parsing error event data:", parseError);
              }

              if (errorMessage !== 'Connection closed') {
                console.error("[Analysis] Analysis failed:", errorMessage);
                cleanup();
                reject(new Error(errorMessage || "Failed to analyze content"));
              } else {
                console.log("[Analysis] Ignoring connection closed error");
              }
            } else {
              console.log("[Analysis] Ignoring error event after completion");
            }
          });

          // Start progress timeout
          resetProgressTimeout();
        }).catch(error => {
          console.error("[Analysis] Request failed:", error);
          cleanup();
          reject(error);
        });
      });

      // Wait for analysis to complete and continue with the process
      console.log("[Analysis] Waiting for analysis promise to resolve");
      const analysisResult = await analysisPromise;
      console.log("[Analysis] Analysis promise resolved, proceeding to completion handling");
      await handleAnalysisComplete(analysisResult, files);

    } catch (error) {
      console.error("[Processing] Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred during processing");
      setStage(STAGES.UPLOAD);
    }
  };

  // Helper function to handle analysis completion
  const handleAnalysisComplete = async (analysisResult: any, files: UploadFile[]) => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    try {
      setStage(STAGES.STRUCTURING);
      console.log("[Session] Creating session with analysis result");

      // Get the content from sessionStorage that was saved during processing
      const documentContent = sessionStorage.getItem('currentDocumentContent');
      if (!documentContent) {
        throw new Error('Document content not found in storage');
      }

      console.log("[Session] Document content:", {
        length: documentContent.length,
        preview: documentContent.substring(0, 100),
        hasMarkdown: documentContent.includes('#')
      });

      // Process files metadata
      const processedContent = files.map(f => ({
        title: f.file.name,
        content: f.markdown || '',
        type: f.file.type,
        size: f.size
      }));

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: files[0].file.name.replace(/\.[^/.]+$/, ''),
          content: documentContent, // Use the stored content
          files: processedContent,
          analysis: analysisResult.analysis,
          index: analysisResult.index,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("[Session] Failed to create session:", errorData);
        throw new Error(errorData?.error || 'Failed to create session');
      }

      const session = await response.json();
      console.log("[Session] Session created successfully:", {
        id: session.id,
        title: session.title,
        contentLength: documentContent.length
      });

      if (onComplete) {
        onComplete(session);
      }

      // Delay redirect slightly to show success state
      setTimeout(() => {
        console.log("[Session] Executing redirect");
        setOpen(false);
        setStage(STAGES.UPLOAD);
        setFiles([]);
        window.location.href = `/dashboard/learning?session=${session.id}`;
      }, 1500);
    } catch (error) {
      console.error("[Session] Error creating session:", error);
      setError(error instanceof Error ? error.message : "Failed to create session");
      setStage(STAGES.UPLOAD);
    }
  };

  const renderUploadStage = () => {
    return (
      <div className="space-y-6">
        <div {...getRootProps()} className={dropzoneClasses}>
          <input {...getInputProps()} />
          <div className="cursor-pointer flex flex-col items-center">
            <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <span className="text-sm text-muted-foreground">
              {isDragActive
                ? "Drop your files here"
                : "Drop your files here or click to browse"}
            </span>
            <span className="text-xs text-muted-foreground/75 mt-1">
              Maximum file size: 15MB
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language of explanations:</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-muted-foreground/75" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (newOpen && !session) {
        router.push('/auth/signin');
        return;
      }
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Learning Session</DialogTitle>
          <DialogDescription>
            Upload your study materials to begin. Maximum file size is 15MB per file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {stage === STAGES.UPLOAD && (
            <div className="space-y-4">
              {renderUploadStage()}
            </div>
          )}

          {stage !== STAGES.UPLOAD && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {detailedStatus}
                  </span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-2">
                {Object.values(STAGES).map((s, index) => {
                  const isComplete = index < Object.values(STAGES).indexOf(stage);
                  const isCurrent = stage === s;

                  return (
                    <div
                      key={s}
                      className={cn(
                        "flex items-center space-x-2",
                        isCurrent && "text-primary",
                        isComplete && "text-success",
                        !isComplete && !isCurrent && "text-muted-foreground/50",
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : isCurrent ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-current opacity-50" />
                      )}
                      <span className="text-sm capitalize">{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          {stage === STAGES.UPLOAD && (
            <Button
              type="submit"
              disabled={files.length === 0}
              onClick={handleProcess}
            >
              Start Learning
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 