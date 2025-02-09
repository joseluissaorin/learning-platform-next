export interface GenerateRequest {
  conceptId: string;
  layer: number;
  conceptTitle: string;
  documentContent: string;
  sessionId: string;
  parentTitles: string[];
  isLeafNode: boolean;
} 