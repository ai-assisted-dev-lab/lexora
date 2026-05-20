import { invoke } from "@tauri-apps/api/core";

export interface CreateBackupInputDto {
  filePath?: string | null;
  note?: string | null;
  includeContent?: boolean;
  overwrite?: boolean;
}

export interface RestoreBackupInputDto {
  filePath: string;
  confirmRestore: boolean;
  createSafetyBackup?: boolean;
}

export interface BackupTableCountDto {
  table: string;
  rows: number;
}

export interface BackupExportResultDto {
  backupId: number;
  filePath: string;
  bytesWritten: number;
  createdAt: string;
  backupKind: string;
  includeContent: boolean;
  tableCounts: BackupTableCountDto[];
}

export interface BackupHistoryItemDto {
  id: number;
  filePath: string;
  fileSizeBytes: number | null;
  note: string | null;
  backupKind: string;
  includeContent: boolean;
  createdAt: string;
  exists: boolean;
}

export interface BackupHistoryDto {
  items: BackupHistoryItemDto[];
  total: number;
  latestBackupAt: string | null;
  latestAutoBackupAt: string | null;
  backupDirectory: string;
}

export interface BackupValidationDto {
  valid: boolean;
  schema: string | null;
  schemaVersion: number | null;
  exportedAt: string | null;
  backupKind: string | null;
  username: string | null;
  includeContent: boolean;
  tableCounts: BackupTableCountDto[];
  warnings: string[];
}

export interface BackupRestoreResultDto {
  restoredAt: string;
  restoredTables: BackupTableCountDto[];
  safetyBackup: BackupHistoryItemDto | null;
}

export interface ScheduledBackupResultDto {
  created: boolean;
  skippedReason: string | null;
  backup: BackupExportResultDto | null;
}

export function createBackup(
  input: CreateBackupInputDto,
): Promise<BackupExportResultDto> {
  return invoke<BackupExportResultDto>("create_backup", { input });
}

export function listBackups(): Promise<BackupHistoryDto> {
  return invoke<BackupHistoryDto>("list_backups");
}

export function validateBackup(filePath: string): Promise<BackupValidationDto> {
  return invoke<BackupValidationDto>("validate_backup", { filePath });
}

export function restoreBackup(
  input: RestoreBackupInputDto,
): Promise<BackupRestoreResultDto> {
  return invoke<BackupRestoreResultDto>("restore_backup", { input });
}

export function ensureScheduledBackup(): Promise<ScheduledBackupResultDto> {
  return invoke<ScheduledBackupResultDto>("ensure_scheduled_backup");
}
