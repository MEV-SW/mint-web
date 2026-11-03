import { apiClient } from './client'

/** mint-server#228 외부전달 — email reports (admin only, /api/v1/admin/delivery). */

const BASE = '/api/v1/admin/delivery'

export type DeliveryReportKind = 'monthly' | 'quarterly'
export type DeliveryReportStatus = 'draft' | 'sending' | 'sent' | 'partial' | 'failed'
export type BatchKind = 'send' | 'retry' | 'test'
export type BatchStatus = 'queued' | 'sending' | 'done' | 'cancelled' | 'failed'

export interface DeliveryStatus {
  enabled: boolean
  configured: boolean
  sender: string | null
  sandbox: boolean | null
  max_24h: number | null
  sent_last_24h: number | null
  active_recipients: number
}

export interface Attachment {
  filename: string
  size_bytes: number
}

export interface BatchFailure {
  name: string
  email: string
  status: string
  error_label: string | null
}

export interface Batch {
  id: string
  kind: BatchKind
  status: BatchStatus
  report_id: string | null
  report_title: string
  total: number
  done: number
  sent: number
  failed: number
  skipped: number
  unknown: number
  created_at: string
  finished_at: string | null
}

export interface BatchProgress extends Batch {
  failures: BatchFailure[]
}

export interface DeliveryReport {
  id: string
  edition_id: string | null
  kind: DeliveryReportKind
  period_start: string
  period_end: string
  title: string
  email_subject: string
  pdf_filename: string
  pdf_size: number
  send_status: DeliveryReportStatus
  created_at: string
  updated_at: string
  counts: Record<string, number>
  last_sent_at: string | null
}

export interface DeliveryReportDetail extends DeliveryReport {
  active_batch: BatchProgress | null
  last_batch: BatchProgress | null
}

export interface UploadedReport extends DeliveryReport {
  sanitize_notes: string[]
}

export interface MailPreview {
  from_display: string | null
  active_recipients: number
  pending_recipients: number
  subject: string
  attachment: Attachment
  html: string
  text: string
  message_size_bytes: number
}

export interface Recipient {
  id: string
  email: string
  name: string
  is_active: boolean
  created_at: string
}

export interface SendPreview {
  count: number
  digest: string
  recipients: { name: string; email: string }[]
  attachment: Attachment
}

export interface SendStarted {
  batch_id: string
  job_id: string | null
  total: number
}

export interface TestSendResult {
  batch_id: string
  status: string
  message_id: string | null
  error_label: string | null
  to: string
}

export interface BatchDeliveries {
  batch: Batch
  received: { name: string }[]
  not_received: BatchFailure[]
  retry_count: number
}

export async function getDeliveryStatus(): Promise<DeliveryStatus> {
  return (await apiClient.get<DeliveryStatus>(`${BASE}/status`)).data
}

export async function listDeliveryReports(): Promise<DeliveryReport[]> {
  return (await apiClient.get<DeliveryReport[]>(`${BASE}/reports`, { params: { limit: 50 } })).data
}

export async function getDeliveryReport(id: string): Promise<DeliveryReportDetail> {
  return (await apiClient.get<DeliveryReportDetail>(`${BASE}/reports/${id}`)).data
}

export interface UploadReportInput {
  title: string
  email_subject: string
  kind: DeliveryReportKind
  period_start: string
  period_end: string
  edition_id?: string | null
  pdf: File
  email_html: File
}

export async function uploadDeliveryReport(input: UploadReportInput): Promise<UploadedReport> {
  const form = new FormData()
  form.append('title', input.title)
  form.append('email_subject', input.email_subject)
  form.append('kind', input.kind)
  form.append('period_start', input.period_start)
  form.append('period_end', input.period_end)
  if (input.edition_id) form.append('edition_id', input.edition_id)
  form.append('pdf', input.pdf)
  form.append('email_html', input.email_html)
  // The client defaults to JSON; axios fills in the multipart boundary for this header.
  return (
    await apiClient.post<UploadedReport>(`${BASE}/reports`, form, {
      timeout: 120_000,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data
}

export async function deleteDeliveryReport(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/reports/${id}`)
}

export async function getMailPreview(id: string): Promise<MailPreview> {
  return (await apiClient.get<MailPreview>(`${BASE}/reports/${id}/preview`)).data
}

async function downloadBlob(path: string, fallbackName: string): Promise<void> {
  const response = await apiClient.get<Blob>(path, { responseType: 'blob' })
  const disposition = String(response.headers['content-disposition'] ?? '')
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = encoded ? decodeURIComponent(encoded) : fallbackName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadReportPdf(report: DeliveryReport): Promise<void> {
  return downloadBlob(`${BASE}/reports/${report.id}/pdf`, report.pdf_filename)
}

export function downloadReportHtml(report: DeliveryReport): Promise<void> {
  return downloadBlob(`${BASE}/reports/${report.id}/html`, report.pdf_filename.replace(/\.pdf$/i, '.email.html'))
}

export async function listRecipients(): Promise<Recipient[]> {
  return (await apiClient.get<Recipient[]>(`${BASE}/recipients`)).data
}

export async function addRecipient(email: string, name: string): Promise<Recipient> {
  return (await apiClient.post<Recipient>(`${BASE}/recipients`, { email, name })).data
}

export async function addRecipientsBulk(text: string): Promise<{ added: number; duplicates: number; invalid: number[] }> {
  return (await apiClient.post(`${BASE}/recipients/bulk`, { text })).data
}

export async function updateRecipient(id: string, changes: { name?: string; is_active?: boolean }): Promise<Recipient> {
  return (await apiClient.patch<Recipient>(`${BASE}/recipients/${id}`, changes)).data
}

export async function deleteRecipient(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/recipients/${id}`)
}

export async function getSendPreview(reportId: string): Promise<SendPreview> {
  return (await apiClient.get<SendPreview>(`${BASE}/reports/${reportId}/send-preview`)).data
}

export async function sendReport(reportId: string, digest: string): Promise<SendStarted> {
  return (await apiClient.post<SendStarted>(`${BASE}/reports/${reportId}/send`, { digest })).data
}

export async function getRetryPreview(batchId: string): Promise<SendPreview> {
  return (await apiClient.get<SendPreview>(`${BASE}/batches/${batchId}/retry-preview`)).data
}

export async function retryBatch(batchId: string, digest: string): Promise<SendStarted> {
  return (await apiClient.post<SendStarted>(`${BASE}/batches/${batchId}/retry`, { digest })).data
}

export async function sendTest(reportId: string): Promise<TestSendResult> {
  return (await apiClient.post<TestSendResult>(`${BASE}/reports/${reportId}/test`)).data
}

export async function getBatch(batchId: string): Promise<BatchProgress> {
  return (await apiClient.get<BatchProgress>(`${BASE}/batches/${batchId}`)).data
}

export async function cancelBatch(batchId: string): Promise<BatchProgress> {
  return (await apiClient.post<BatchProgress>(`${BASE}/batches/${batchId}/cancel`)).data
}

export async function listBatches(): Promise<Batch[]> {
  return (await apiClient.get<Batch[]>(`${BASE}/batches`, { params: { limit: 20 } })).data
}

export async function getBatchDeliveries(batchId: string): Promise<BatchDeliveries> {
  return (await apiClient.get<BatchDeliveries>(`${BASE}/batches/${batchId}/deliveries`)).data
}
