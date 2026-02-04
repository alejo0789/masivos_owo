/**
 * API Client for the Mass Messaging System
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Types
export interface Contact {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    department?: string;  // "Apostador" o "Operacional"
    position?: string;
    is_customer?: boolean;  // true = Apostador, false = Operacional
    customer_name?: string | null;
    state?: string;
}

export interface ContactsResponse {
    total: number;
    contacts: Contact[];
}

export interface Template {
    id: number;
    name: string;
    subject?: string;
    content: string;
    channel: 'whatsapp' | 'email' | 'both';
    created_at: string;
    updated_at: string;
}

export interface MessageLog {
    id: number;
    recipient_name: string;
    recipient_phone?: string;
    recipient_email?: string;
    subject?: string;
    message_content: string;
    channel: string;
    status: 'pending' | 'sent' | 'failed';
    error_message?: string;
    sent_at: string;
    attachments: string[];
}

export interface BulkSendResponse {
    total: number;
    sent: number;
    failed: number;
    messages: MessageLog[];
}

export interface Stats {
    period_days: number;
    total: number;
    sent: number;
    failed: number;
    success_rate: number;
    by_channel: {
        whatsapp: number;
        email: number;
        sms: number;
    };
}

// API Functions
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(error.detail || `HTTP Error: ${response.status}`);
    }
    return response.json();
}

// Contacts
export async function getContacts(params?: {
    search?: string;
    department?: string;
    limit?: number;
    offset?: number;
}): Promise<ContactsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.department) searchParams.append('department', params.department);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const url = `${API_URL}/contacts?${searchParams.toString()}`;
    const response = await fetch(url);
    return handleResponse<ContactsResponse>(response);
}

export async function getDepartments(): Promise<string[]> {
    const response = await fetch(`${API_URL}/contacts/departments`);
    return handleResponse<string[]>(response);
}

// Templates
export async function getTemplates(params?: {
    search?: string;
    channel?: string;
}): Promise<Template[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.channel) searchParams.append('channel', params.channel);

    const url = `${API_URL}/templates?${searchParams.toString()}`;
    const response = await fetch(url);
    return handleResponse<Template[]>(response);
}

export async function getTemplate(id: number): Promise<Template> {
    const response = await fetch(`${API_URL}/templates/${id}`);
    return handleResponse<Template>(response);
}

export async function createTemplate(data: {
    name: string;
    subject?: string;
    content: string;
    channel: string;
}): Promise<Template> {
    const response = await fetch(`${API_URL}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<Template>(response);
}

export async function updateTemplate(id: number, data: {
    name?: string;
    subject?: string;
    content?: string;
    channel?: string;
}): Promise<Template> {
    const response = await fetch(`${API_URL}/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<Template>(response);
}

export async function deleteTemplate(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/templates/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Error al eliminar' }));
        throw new Error(error.detail);
    }
}

// WhatsApp Business Templates
export interface WhatsAppTemplateVariable {
    component: 'header' | 'body';
    count: number;
}

export interface WhatsAppTemplateHeader {
    type: string;
    text: string;
    example?: Record<string, unknown>;
}

export interface WhatsAppTemplateBody {
    text: string;
    example?: {
        body_text_named_params?: Array<{
            param_name: string;
            example: string;
        }>;
    };
}

export interface WhatsAppTemplateButton {
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
}

export interface WhatsAppTemplate {
    id: string;
    name: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    category: string;
    language: string;
    header?: WhatsAppTemplateHeader | null;
    body?: WhatsAppTemplateBody | null;
    footer?: { text: string } | null;
    buttons: WhatsAppTemplateButton[];
    variables: WhatsAppTemplateVariable[];
}

export interface WhatsAppTemplatesResponse {
    success: boolean;
    count: number;
    templates: WhatsAppTemplate[];
    paging?: Record<string, unknown>;
}

export async function getWhatsAppTemplates(status?: 'APPROVED' | 'PENDING' | 'REJECTED'): Promise<WhatsAppTemplatesResponse> {
    const searchParams = new URLSearchParams();
    if (status) searchParams.append('status', status);
    searchParams.append('parsed', 'true');

    const url = `${API_URL}/templates/whatsapp/list?${searchParams.toString()}`;
    const response = await fetch(url);
    return handleResponse<WhatsAppTemplatesResponse>(response);
}

export async function getApprovedWhatsAppTemplates(): Promise<WhatsAppTemplatesResponse> {
    const response = await fetch(`${API_URL}/templates/whatsapp/approved?parsed=true`);
    return handleResponse<WhatsAppTemplatesResponse>(response);
}

export async function getWhatsAppTemplateByName(name: string): Promise<{ success: boolean; template: WhatsAppTemplate }> {
    const response = await fetch(`${API_URL}/templates/whatsapp/by-name/${encodeURIComponent(name)}?parsed=true`);
    return handleResponse<{ success: boolean; template: WhatsAppTemplate }>(response);
}

// WhatsApp Direct Send
export interface WhatsAppRecipient {
    name: string;
    phone: string;
    email?: string;
    department?: string;
    position?: string;
    company?: string;
}

export interface WhatsAppSendRequest {
    template_name: string;
    language_code: string;
    recipients: WhatsAppRecipient[];
    variable_mapping?: Record<string, string>;
}

export interface WhatsAppMessageResult {
    recipient: string;
    phone: string | null;
    success: boolean;
    message_id?: string;
    error?: string;
}

export interface WhatsAppBulkSendResponse {
    total: number;
    sent: number;
    failed: number;
    messages: WhatsAppMessageResult[];
}

export interface WhatsAppConfigStatus {
    configured: boolean;
    details: {
        access_token: boolean;
        business_account_id: boolean;
        phone_number_id: boolean;
    };
    can_fetch_templates: boolean;
    can_send_messages: boolean;
}

export async function sendWhatsAppTemplate(data: WhatsAppSendRequest): Promise<WhatsAppBulkSendResponse> {
    const response = await fetch(`${API_URL}/whatsapp/send-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<WhatsAppBulkSendResponse>(response);
}

export async function sendWhatsAppSingle(data: {
    template_name: string;
    language_code: string;
    phone: string;
    variables?: Record<string, string>;
}): Promise<{ success: boolean; message_id?: string; phone?: string; status?: string }> {
    const response = await fetch(`${API_URL}/whatsapp/send-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; message_id?: string; phone?: string; status?: string }>(response);
}

export async function getWhatsAppConfigStatus(): Promise<WhatsAppConfigStatus> {
    const response = await fetch(`${API_URL}/whatsapp/config-status`);
    return handleResponse<WhatsAppConfigStatus>(response);
}

// Messages
export async function uploadFiles(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${API_URL}/messages/upload-files`, {
        method: 'POST',
        body: formData,
    });
    return handleResponse<string[]>(response);
}

export async function deleteFile(filename: string): Promise<void> {
    const response = await fetch(`${API_URL}/messages/files/${filename}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Error al eliminar archivo');
    }
}

export async function sendBulkMessages(data: {
    recipients: Array<{ name: string; phone?: string; email?: string }>;
    subject?: string;
    content: string;
    channel: 'whatsapp' | 'email' | 'both';
    attachments: string[];
}): Promise<BulkSendResponse> {
    const response = await fetch(`${API_URL}/messages/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<BulkSendResponse>(response);
}

// History
export async function getHistory(params?: {
    search?: string;
    channel?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
}): Promise<MessageLog[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.channel) searchParams.append('channel', params.channel);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const url = `${API_URL}/history?${searchParams.toString()}`;
    const response = await fetch(url);
    return handleResponse<MessageLog[]>(response);
}

export async function getStats(days: number = 7): Promise<Stats> {
    const response = await fetch(`${API_URL}/history/stats?days=${days}`);
    return handleResponse<Stats>(response);
}

export async function getHistoryCount(params?: {
    channel?: string;
    status?: string;
}): Promise<{ count: number }> {
    const searchParams = new URLSearchParams();
    if (params?.channel) searchParams.append('channel', params.channel);
    if (params?.status) searchParams.append('status', params.status);

    const url = `${API_URL}/history/count?${searchParams.toString()}`;
    const response = await fetch(url);
    return handleResponse<{ count: number }>(response);
}

// AI Assistant
export interface AssistantMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AssistantRequest {
    messages: AssistantMessage[];
    context?: 'template' | 'bulk_message';
    sessionId?: string;
}

export interface AssistantResponse {
    message: string;
    html_preview?: string;
    is_final: boolean;
}

export async function chatWithAssistant(data: AssistantRequest): Promise<AssistantResponse> {
    const response = await fetch(`${API_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<AssistantResponse>(response);
}

export async function generateTemplate(data: AssistantRequest): Promise<any> {
    const response = await fetch(`${API_URL}/assistant/generate-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<any>(response);
}

// SMS API
export interface SMSRequest {
    phone: string;
    message: string;
    test?: boolean;
}

export interface BulkSMSRequest {
    recipients: Array<{ phone: string; name?: string }>;
    message: string;
    test?: boolean;
}

export interface SMSResponse {
    success: boolean;
    total?: number;
    sent?: number;
    failed?: number;
    messages?: any[];
    error?: string;
    credits_used?: number;
}

export async function sendSMS(data: SMSRequest): Promise<SMSResponse> {
    const response = await fetch(`${API_URL}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<SMSResponse>(response);
}

export async function sendBulkSMS(data: BulkSMSRequest): Promise<SMSResponse> {
    const response = await fetch(`${API_URL}/sms/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<SMSResponse>(response);
}

export async function getSMSCredits(): Promise<{ success: boolean; credits: number }> {
    const response = await fetch(`${API_URL}/sms/credits`);
    return handleResponse<{ success: boolean; credits: number }>(response);
}

// Groups API
export interface GroupContact {
    id: number;
    group_id: number;
    name: string;
    phone?: string;
    email?: string;
    created_at: string;
}

export interface Group {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
    contact_count: number;
}

export interface GroupDetail {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
    contacts: GroupContact[];
}

export interface ExcelUploadResponse {
    group_id: number;
    group_name: string;
    contacts_created: number;
    errors: string[];
}

export async function getGroups(): Promise<Group[]> {
    const response = await fetch(`${API_URL}/groups`);
    return handleResponse<Group[]>(response);
}

export async function getGroup(id: number): Promise<GroupDetail> {
    const response = await fetch(`${API_URL}/groups/${id}`);
    return handleResponse<GroupDetail>(response);
}

export async function createGroup(data: { name: string; description?: string }): Promise<Group> {
    const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<Group>(response);
}

export async function uploadGroupExcel(file: File, groupName: string): Promise<ExcelUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('group_name', groupName);

    const response = await fetch(`${API_URL}/groups/upload`, {
        method: 'POST',
        body: formData,
    });
    return handleResponse<ExcelUploadResponse>(response);
}

export async function updateGroup(id: number, data: { name?: string; description?: string }): Promise<Group> {
    const response = await fetch(`${API_URL}/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<Group>(response);
}

export async function deleteGroup(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/groups/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Error al eliminar' }));
        throw new Error(error.detail);
    }
}

export async function addGroupContact(groupId: number, data: { name: string; phone?: string; email?: string }): Promise<GroupContact> {
    const response = await fetch(`${API_URL}/groups/${groupId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<GroupContact>(response);
}

export async function updateGroupContact(groupId: number, contactId: number, data: { name?: string; phone?: string; email?: string }): Promise<GroupContact> {
    const response = await fetch(`${API_URL}/groups/${groupId}/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse<GroupContact>(response);
}

export async function deleteGroupContact(groupId: number, contactId: number): Promise<void> {
    const response = await fetch(`${API_URL}/groups/${groupId}/contacts/${contactId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Error al eliminar' }));
        throw new Error(error.detail);
    }
}


