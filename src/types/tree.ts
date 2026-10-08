export interface FileTreeNode {
  id: string;
  name: string;
  file_path: string;
  folder_path?: string | null;
  has_subpages: boolean;
  children: FileTreeNode[];
}

export interface WorkspaceState {
  currentPath: string | null;
  activeFilePath: string | null;
  activeFileTitle: string;
  fileTree: FileTreeNode[];
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
}
