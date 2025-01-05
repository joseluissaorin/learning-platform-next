import { type UploadFile, type ConversionResponse } from "@/types/upload";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain",
  "text/markdown",
  // OpenDocument
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
];

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File ${file.name} exceeds the 15MB limit`,
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not supported`,
    };
  }

  return { valid: true };
}

export function createUploadFile(file: File): UploadFile {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
    status: "pending",
    file,
  };
}

export async function convertToMarkdown(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ConversionResponse> {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/convert", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to convert document");
    }

    return {
      success: true,
      markdown: result.markdown,
    };
  } catch (error) {
    console.error("Error converting file:", error);
    return {
      success: false,
      markdown: "",
      error: error instanceof Error 
        ? error.message 
        : "Failed to convert document. Please try again.",
    };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function processFiles(
  files: UploadFile[],
  onProgress: (progress: number) => void,
): Promise<UploadFile[]> {
  const processedFiles: UploadFile[] = [];
  let totalProgress = 0;

  console.log("Starting to process files:", files.map(f => ({
    id: f.id,
    name: f.name,
    size: f.size,
    type: f.type,
    hasFile: !!f.file
  })));

  for (const file of files) {
    try {
      if (!file.file) {
        console.error("Missing file data for:", file.name);
        throw new Error(`No file data available for ${file.name}`);
      }

      console.log("Processing file:", {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        fileSize: file.file.size,
        fileType: file.file.type
      });

      const result = await convertToMarkdown(file.file);

      if (result.success) {
        console.log(`Successfully converted ${file.name}`, {
          markdownLength: result.markdown.length
        });
        
        processedFiles.push({
          ...file,
          status: "complete",
          markdown: result.markdown,
        });
      } else {
        console.error(`Failed to convert ${file.name}:`, result.error);
        processedFiles.push({
          ...file,
          status: "error",
          error: result.error,
        });
      }
    } catch (error) {
      console.error(`Error processing ${file.name}:`, {
        error,
        type: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error)
      });
      
      processedFiles.push({
        ...file,
        status: "error",
        error: error instanceof Error ? error.message : "Failed to process file",
      });
    }

    totalProgress += 100 / files.length;
    onProgress(Math.round(totalProgress));
  }

  console.log("Finished processing files:", processedFiles.map(f => ({
    name: f.name,
    status: f.status,
    error: f.error,
    hasMarkdown: !!f.markdown
  })));

  return processedFiles;
} 