import { ReactNode } from "react";

export type UploadStage = 
  | "upload" 
  | "processing" 
  | "analyzing" 
  | "structuring" 
  | "complete";

export type UploadFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "pending" | "processing" | "complete" | "error";
  markdown?: string;
  error?: string;
  file: File;
};

export type UploadDialogProps = {
  trigger: ReactNode;
  onComplete?: (files: UploadFile[]) => void;
};

export type ProcessingProgress = {
  stage: UploadStage;
  progress: number;
  detailedStatus?: string;
};

export type ConversionResponse = {
  success: boolean;
  markdown: string;
  error?: string;
};

export type AnalysisResult = {
  index: {
    sections: Array<{
      title: string;
      content?: string;
      subsections?: Array<{
        title: string;
        content?: string;
        subsections?: Array<any>;
      }>;
    }>;
  };
}; 