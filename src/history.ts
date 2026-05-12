import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import type { OperationRecord, UndoResult, OrganizeDetail } from "./types.js";

const HISTORY_FILENAME = ".download-organizer-history.json";

let _batchId: string | null = null;
let _records: OperationRecord[] | null = null;

function getHistoryPath(): string {
  return resolve(process.cwd(), HISTORY_FILENAME);
}

function loadHistory(): OperationRecord[] {
  if (_records) return _records;
  const path = getHistoryPath();
  const records: OperationRecord[] = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf-8"))
    : [];
  _records = records;
  return records;
}

export function beginBatch(): string {
  _batchId = new Date().toISOString().replace(/[:.]/g, "-");
  loadHistory();
  return _batchId;
}

export function recordMove(detail: OrganizeDetail): void {
  if (!detail.success || !_batchId) return;
  const records = loadHistory();
  records.push({
    batchId: _batchId,
    timestamp: new Date().toISOString(),
    source: detail.from,
    dest: detail.to,
    fileName: detail.fileName,
    category: detail.category,
  });
}

export function endBatch(): void {
  _batchId = null;
}

export function saveHistory(): void {
  if (!_records) return;
  writeFileSync(getHistoryPath(), JSON.stringify(_records, null, 2), "utf-8");
}

export function undoLastBatch(dryRun: boolean): UndoResult {
  const records = loadHistory();
  if (records.length === 0) {
    return { batchId: "", timestamp: "", total: 0, reverted: 0, errors: 0, details: [] };
  }

  const lastBatchId = records[records.length - 1].batchId;
  const batchRecords = records.filter((r) => r.batchId === lastBatchId);

  const result: UndoResult = {
    batchId: lastBatchId,
    timestamp: batchRecords[0].timestamp,
    total: batchRecords.length,
    reverted: 0,
    errors: 0,
    details: [],
  };

  for (const record of batchRecords) {
    const detail = { fileName: record.fileName, from: record.dest, to: record.source, success: false, error: undefined as string | undefined };
    try {
      if (!dryRun) {
        renameSync(record.dest, record.source);
      }
      detail.success = true;
      result.reverted++;
    } catch (err) {
      detail.error = err instanceof Error ? err.message : String(err);
      result.errors++;
    }
    result.details.push(detail);
  }

  if (!dryRun) {
    _records = records.filter((r) => r.batchId !== lastBatchId);
    saveHistory();
  }

  return result;
}
