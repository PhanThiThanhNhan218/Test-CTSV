import type { EvidenceInput } from '../types';

/**
 * Điểm nối tải minh chứng. Bản demo chưa có backend nên chỉ giữ tên & dung lượng tệp.
 * App mẹ thay bằng upload thật (S3 / máy chủ trường) qua `configureEvidenceUpload`.
 */
export type EvidenceUploader = (file: File) => Promise<EvidenceInput>;

let uploader: EvidenceUploader = async (file) => ({ kind: 'file', name: file.name, size: file.size });

export function configureEvidenceUpload(fn: EvidenceUploader) {
  uploader = fn;
}

export function uploadEvidence(file: File): Promise<EvidenceInput> {
  return uploader(file);
}

export function fmtSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
