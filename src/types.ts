export type FileCategory =
  | "Documents"
  | "Images"
  | "Screenshots"
  | "Installers"
  | "Archives"
  | "Code"
  | "Video"
  | "Audio"
  | "Others";

export const ALL_CATEGORIES: FileCategory[] = [
  "Documents", "Images", "Screenshots", "Installers",
  "Archives", "Code", "Video", "Audio", "Others",
];

export interface Rule {
  extensions: string[];
  category: FileCategory;
}

export interface ClassificationResult {
  category: FileCategory;
  matchedRule: Rule | null;
  aiGenerated: boolean;
  reason: string | null;
}

export interface Config {
  targetPath: string;
  customRules: Rule[];
  aiEnabled: boolean;
  ignorePatterns: string[];
  recursive: boolean;
  stabilityThreshold: number;
}

export interface AICacheEntry {
  extension: string;
  fileNamePattern: string;
  category: FileCategory;
  reason: string;
  createdAt: string;
}

export interface OrganizeResult {
  total: number;
  moved: number;
  skipped: number;
  errors: number;
  details: OrganizeDetail[];
}

export interface OrganizeDetail {
  fileName: string;
  from: string;
  to: string;
  category: FileCategory;
  success: boolean;
  error?: string;
  duplicate?: boolean;
  duplicateOf?: string;
}

export interface OperationRecord {
  batchId: string;
  timestamp: string;
  source: string;
  dest: string;
  fileName: string;
  category: FileCategory;
}

export interface UndoResult {
  batchId: string;
  timestamp: string;
  total: number;
  reverted: number;
  errors: number;
  details: Array<{ fileName: string; from: string; to: string; success: boolean; error?: string }>;
}
