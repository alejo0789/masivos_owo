'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Contact,
  sendBulkMessages,
  BulkSendResponse,
  uploadFiles,
  deleteFile,
  WhatsAppTemplate,
  getApprovedWhatsAppTemplates,
  sendWhatsAppTemplate,
  WhatsAppBulkSendResponse,
  Template,
  getTemplates,
  sendBulkSMS,
  getSMSCredits
} from '@/lib/api';
import ContactList from '@/components/ContactList';

export default function Home() {
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string, preview?: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BulkSendResponse | WhatsAppBulkSendResponse | null>(null);
  const [error, setError] = useState('');

  // WhatsApp Templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');

  // Email Templates
  const [emailTemplates, setEmailTemplates] = useState<Template[]>([]);
  const [showEmailTemplates, setShowEmailTemplates] = useState(false);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<Template | null>(null);
  const [loadingEmailTemplates, setLoadingEmailTemplates] = useState(false);
  const [previewEmailTemplate, setPreviewEmailTemplate] = useState<Template | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // File upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplates();
    loadEmailTemplates();

    // Check for contacts from groups page
    const groupContacts = sessionStorage.getItem('selectedGroupContacts');
    if (groupContacts) {
      try {
        const contacts = JSON.parse(groupContacts);
        setSelectedContacts(contacts);
        sessionStorage.removeItem('selectedGroupContacts');
      } catch (e) {
        console.error('Error parsing group contacts:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Update contentEditable only when template changes, not on every content change
    if (contentEditableRef.current && selectedEmailTemplate) {
      contentEditableRef.current.innerHTML = content;
    }
  }, [selectedEmailTemplate]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await getApprovedWhatsAppTemplates();
      if (response.success) {
        setTemplates(response.templates);
      }
    } catch (err) {
      console.error('Error loading WhatsApp templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      setLoadingEmailTemplates(true);
      const templates = await getTemplates({ channel: 'email' });
      setEmailTemplates(templates);
    } catch (err) {
      console.error('Error loading email templates:', err);
    } finally {
      setLoadingEmailTemplates(false);
    }
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  const getPreviewContent = (template: WhatsAppTemplate, contactName?: string) => {
    let text = template.body?.text || '';
    // Replace common variable patterns with contact name
    text = text.replace(/\{\{nombre\}\}/gi, contactName || '[Nombre del contacto]');
    text = text.replace(/\{\{name\}\}/gi, contactName || '[Nombre del contacto]');
    return text;
  };

  const applyTemplate = (template: WhatsAppTemplate) => {
    const bodyText = template.body?.text || '';
    // Show preview with placeholder
    const previewText = getPreviewContent(template);
    setContent(previewText);
    setSelectedTemplate(template);
    setChannel('whatsapp');
    setShowTemplates(false);
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setContent('');
    setHeaderMediaUrl('');
  };

  const applyEmailTemplate = (template: Template) => {
    // Extract content from HTML if needed
    let templateContent = template.content;

    // If it's an HTML template, extract the body content
    if (templateContent.trim().startsWith('<!DOCTYPE html>') || templateContent.trim().startsWith('<html')) {
      const contentMatch = templateContent.match(/<!-- Content -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<!-- Footer -->/);
      if (contentMatch && contentMatch[1]) {
        templateContent = contentMatch[1].trim();
      }
    }

    setSubject(template.subject || '');
    setContent(templateContent);
    setSelectedEmailTemplate(template);
    setChannel('email');
    setShowEmailTemplates(false);
  };

  const clearEmailTemplate = () => {
    setSelectedEmailTemplate(null);
    setSubject('');
    setContent('');
  };

  // Handle channel change - clear templates from other channels
  // Handle channel change - clear templates from other channels
  const handleChannelChange = (newChannel: 'whatsapp' | 'email' | 'sms') => {
    // If changing away from email, clear email template
    if (newChannel !== 'email' && selectedEmailTemplate) {
      setSelectedEmailTemplate(null);
      setSubject('');
      setContent('');
    }
    // If changing away from whatsapp, clear whatsapp template
    if (newChannel !== 'whatsapp' && selectedTemplate) {
      setSelectedTemplate(null);
      setContent('');
    }

    setChannel(newChannel);
  };

  const extractTextFromHtml = (html: string): string => {
    // Remove HTML tags and get clean text
    const text = html.replace(/<[^>]*>/g, '');
    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const getEmailTemplatePreview = (template: Template): string => {
    let preview = template.content;

    // If it's HTML, extract clean text
    if (preview.trim().startsWith('<!DOCTYPE html>') || preview.trim().startsWith('<html')) {
      const contentMatch = preview.match(/<!-- Content -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<!-- Footer -->/);
      if (contentMatch && contentMatch[1]) {
        preview = extractTextFromHtml(contentMatch[1]);
      } else {
        preview = extractTextFromHtml(preview);
      }
    }

    return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
  };

  const generateFullEmailHtml = (bodyContent: string, emailSubject: string): string => {
    // Use public S3 URL for logo to ensure it works in emails
    const logoUrl = 'https://owo-public-files.s3.amazonaws.com/mails/logo-mails-light.png';

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>${emailSubject || 'Email de OWO'}</title>
    <style>
        :root { color-scheme: light only; }
        body { background-color: #f5f5f5 !important; }
    </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif !important; background-color: #f5f5f5 !important;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5 !important; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff !important; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td bgcolor="#8B5A9B" style="background-color: #8B5A9B !important; padding: 5px; text-align: center;">
                            <img src="${logoUrl}" alt="OWO" width="200" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td bgcolor="#ffffff" style="background-color: #ffffff !important; padding: 40px 30px; color: #333333 !important; line-height: 1.6;">
                            <div style="color: #333333 !important;">
                                ${bodyContent}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td bgcolor="#f8f8f8" style="background-color: #f8f8f8 !important; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666 !important;">
                                Este buzón de correo es solo para envío de información, por favor no lo respondas porque no podrá ser recibido y atendido.
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666666 !important;">
                                Equipo <strong style="color: #8B5A9B !important;">OWO</strong>
                            </p>
                            <p style="margin: 15px 0 0 0; font-size: 12px; color: #999999 !important;">
                                © 2025 <strong>OWO</strong> by <strong>Owo</strong>tech. Todos los derechos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fileArray = Array.from(files);
      const filenames = await uploadFiles(fileArray);

      const newFiles = filenames.map((name, index) => {
        const file = fileArray[index];
        const isImage = file.type.startsWith('image/');
        let preview: string | undefined;

        if (isImage) {
          preview = URL.createObjectURL(file);
        }

        return { name, preview };
      });

      setUploadedFiles([...uploadedFiles, ...newFiles]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (filename: string) => {
    try {
      await deleteFile(filename);
      const file = uploadedFiles.find(f => f.name === filename);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      setUploadedFiles(uploadedFiles.filter(f => f.name !== filename));
    } catch (err) {
      console.error('Error removing file:', err);
    }
  };

  // Check if selected template requires media header
  const templateRequiresMedia = selectedTemplate?.header &&
    ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedTemplate.header.type.toUpperCase());

  const canSend = selectedContacts.length > 0 && (content.trim().length > 0 || selectedTemplate || selectedEmailTemplate);

  const handleSend = async () => {
    if (!canSend) return;

    // Warn if template requires media but URL not provided
    if (templateRequiresMedia && !headerMediaUrl.trim()) {
      const confirmed = window.confirm(
        `Esta plantilla requiere ${selectedTemplate?.header?.type.toUpperCase() === 'IMAGE' ? 'una imagen' :
          selectedTemplate?.header?.type.toUpperCase() === 'VIDEO' ? 'un video' : 'un documento'
        } pero no has proporcionado una URL. ¿Deseas continuar sin el archivo multimedia? (El envío podría fallar)`
      );
      if (!confirmed) return;
    }

    setError('');
    setResult(null);
    setSending(true);

    try {
      // If using a WhatsApp template, send directly via WhatsApp API
      if (selectedTemplate) {
        // Prepare recipients with all data for variable mapping
        const recipients = selectedContacts
          .filter(c => c.phone) // Only contacts with phone
          .map(c => ({
            name: c.name,
            phone: c.phone!,
            email: c.email,
            department: c.department,
            position: c.position,
          }));

        if (recipients.length === 0) {
          setError('Ninguno de los contactos seleccionados tiene número de teléfono');
          setSending(false);
          return;
        }

        // Extract actual variables from the template
        const templateVarsInBody = extractVariables(selectedTemplate.body?.text || '');

        // Define all possible mappings
        const allMappings: Record<string, string> = {
          'nombre': 'name',
          'name': 'name',
          'empresa': 'department',
          'company': 'department',
          'departamento': 'department',
          'department': 'department',
          'cargo': 'position',
          'position': 'position',
        };

        // Only include mappings for variables that actually exist in the template
        const variableMapping: Record<string, string> = {};
        templateVarsInBody.forEach(varName => {
          const lowerVar = varName.toLowerCase();
          if (allMappings[lowerVar]) {
            variableMapping[lowerVar] = allMappings[lowerVar];
          }
        });

        const response = await sendWhatsAppTemplate({
          template_name: selectedTemplate.name,
          language_code: selectedTemplate.language,
          recipients,
          variable_mapping: variableMapping,
          header_media_url: headerMediaUrl || undefined,
        });

        setResult(response);

        if (response.sent > 0 && response.failed === 0) {
          setSelectedContacts([]);
          setContent('');
          setSelectedTemplate(null);
          setHeaderMediaUrl('');
          uploadedFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
          setUploadedFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } else {
        // Regular message via SMS or n8n webhook
        if (channel === 'sms') {
          // SMS Sending Logic
          const recipients = selectedContacts
            .filter(c => c.phone) // Only contacts with phone
            .map(c => ({
              phone: c.phone!,
              name: c.name
            }));

          if (recipients.length === 0) {
            setError('Ninguno de los contactos seleccionados tiene número de teléfono');
            setSending(false);
            return;
          }

          const response = await sendBulkSMS({
            recipients,
            message: content,
          });

          // Adapt SMS response to match BulkSendResponse structure generically
          const result: BulkSendResponse = {
            total: response.total || 0,
            sent: response.sent || 0,
            failed: response.failed || 0,
            messages: [] // SMS service might not return detailed logs per message in this call yet
          };

          setResult(result);

          if (response.success) {
            setSelectedContacts([]);
            setContent('');
          } else {
            setError(response.error || 'Error enviando SMS');
          }

        } else {
          // Regular message via n8n webhook (WhatsApp or Email)
          const recipients = selectedContacts.map(c => ({
            name: c.name,
            phone: c.phone,
            email: c.email,
          }));

          // For email channel, wrap content in full HTML template
          let emailContent = content;
          if (channel === 'email') {
            emailContent = generateFullEmailHtml(content, subject || 'Mensaje de OWO');
          }

          const response = await sendBulkMessages({
            recipients,
            subject: subject || undefined,
            content: emailContent,
            channel: channel as 'whatsapp' | 'email', // Cast since we removed 'both' but API might still support it
            attachments: uploadedFiles.map(f => f.name),
          });

          setResult(response);
          // If response has batch_id, it means it's processing in background
          if ((response as any).batch_id || (response.sent > 0 && response.failed === 0)) {
            setSelectedContacts([]);
            setSubject('');
            setContent('');
            setSelectedTemplate(null);
            uploadedFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
            setUploadedFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar mensajes');
    } finally {
      setSending(false);
    }
  };

  const imageFiles = uploadedFiles.filter(f => f.preview);
  const otherFiles = uploadedFiles.filter(f => !f.preview);

  const getChannelStyles = () => {
    switch (channel) {
      case 'whatsapp':
        return { header: 'composer-header whatsapp', sendBtn: 'send-btn send-btn-whatsapp' };
      case 'email':
        return { header: 'composer-header email', sendBtn: 'send-btn send-btn-email' };
      case 'sms':
        return { header: 'composer-header sms', sendBtn: 'send-btn send-btn-sms' };
      default:
        return { header: 'composer-header default', sendBtn: 'send-btn' };
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'MARKETING': return <span className="badge badge-purple text-xs">📢 Marketing</span>;
      case 'UTILITY': return <span className="badge badge-info text-xs">🔧 Utilidad</span>;
      case 'AUTHENTICATION': return <span className="badge badge-warning text-xs">🔐 Auth</span>;
      default: return <span className="badge text-xs">{category}</span>;
    }
  };

  const styles = getChannelStyles();

  // Get template variables info
  const templateVars = selectedTemplate ? extractVariables(selectedTemplate.body?.text || '') : [];
  const contactsWithPhone = selectedContacts.filter(c => c.phone).length;

  return (
    <div className="p-6 lg:p-8 min-h-screen flex flex-col relative overflow-auto">
      {/* Background decorative elements */}
      <div className="absolute top-10 right-20 w-96 h-96 rounded-full bg-[#8B5A9B] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-64 h-64 rounded-full bg-[#00B4D8] opacity-5 blur-[100px] pointer-events-none" />

      {/* Decorative curves */}
      <svg className="absolute top-0 right-0 w-full h-48 opacity-10 pointer-events-none" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path d="M0 100 Q 300 0 600 100 T 1200 100" stroke="url(#curveGrad)" strokeWidth="2" fill="none" />
        <path d="M0 150 Q 300 50 600 150 T 1200 150" stroke="url(#curveGrad)" strokeWidth="1" fill="none" />
        <defs>
          <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5A9B" />
            <stop offset="50%" stopColor="#00B4D8" />
            <stop offset="100%" stopColor="#9D4EDD" />
          </linearGradient>
        </defs>
      </svg>

      {/* Sending Overlay */}
      {sending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="card p-10 flex flex-col items-center gap-6 animate-fade-in" style={{
            boxShadow: '0 20px 60px rgba(139, 90, 155, 0.2)'
          }}>
            <div className="relative">
              <div className="spinner-glow" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {selectedTemplate ? 'Enviando plantilla WhatsApp...' : 'Enviando mensajes...'}
              </p>
              <p className="text-gray-500">
                {selectedTemplate
                  ? `${contactsWithPhone} destinatario${contactsWithPhone !== 1 ? 's' : ''} con teléfono`
                  : `${selectedContacts.length} destinatario${selectedContacts.length !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            <div className="flex gap-2">
              {selectedTemplate ? (
                <span className="badge badge-success">📱 WhatsApp Directo</span>
              ) : (
                <>
                  {channel !== 'email' && <span className="badge badge-success">📱 WhatsApp</span>}
                  {channel !== 'whatsapp' && <span className="badge badge-info">📧 Email</span>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 relative z-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Envío <span className="text-gradient">Masivo</span>
        </h1>
        <p className="text-gray-500 text-sm">Envía mensajes por WhatsApp y Email de forma simultánea</p>
      </div>

      {/* Result/Error Toasts */}
      {result && (
        <div className={`mb-5 p-4 rounded-2xl animate-fade-in flex items-center justify-between ${result.failed === 0
          ? 'bg-green-50 border border-green-200'
          : 'bg-amber-50 border border-amber-200'
          }`} style={{
            boxShadow: result.failed === 0
              ? '0 4px 20px rgba(0, 200, 83, 0.15)'
              : '0 4px 20px rgba(255, 179, 0, 0.15)'
          }}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${result.failed === 0 ? 'bg-green-100' : 'bg-amber-100'
              }`}>
              <span className="text-2xl">{result.failed === 0 ? '✅' : '⚠️'}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {(result as any).batch_id
                  ? '¡Proceso de envío iniciado!'
                  : result.failed === 0 ? '¡Envío completado con éxito!' : 'Envío parcialmente completado'}
              </p>
              <p className="text-sm text-gray-500">
                {(result as any).batch_id
                  ? `Se están procesando ${result.total} mensajes en segundo plano. Los resultados aparecerán en el historial pronto.`
                  : `${result.sent} enviados exitosamente, ${result.failed} fallidos`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setResult(null)}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mb-5 p-4 rounded-2xl animate-fade-in flex items-center justify-between bg-red-50 border border-red-200" style={{
          boxShadow: '0 4px 20px rgba(255, 71, 87, 0.15)'
        }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Error en el envío</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setError('')}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 gap-6 min-h-0 relative z-10">

        {/* LEFT: Message Composer (3 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-5 overflow-y-auto pr-2">

          {/* Channel Selection - Hidden when template selected */}
          {!selectedTemplate && (
            <div className="flex gap-3">
              {[
                { value: 'whatsapp', label: 'WhatsApp', icon: '📱', activeClass: 'active-whatsapp' },
                { value: 'email', label: 'Email', icon: '📧', activeClass: 'active-email' },
                { value: 'sms', label: 'SMS', icon: '💬', activeClass: 'active-sms' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleChannelChange(option.value as 'whatsapp' | 'email' | 'sms')}
                  className={`channel-btn ${channel === option.value ? option.activeClass : ''}`}
                >
                  <span className="text-xl">{option.icon}</span>
                  <span className="font-semibold hidden sm:inline">{option.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Template selection notice */}
          {selectedTemplate && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="font-bold text-green-800">Plantilla WhatsApp: {selectedTemplate.name}</p>
                    <p className="text-xs text-green-600">{selectedTemplate.language} • Envío directo via API</p>
                  </div>
                  {getCategoryBadge(selectedTemplate.category)}
                </div>
                <button
                  onClick={clearTemplate}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                  ✕ Quitar
                </button>
              </div>

              {/* Variable mapping info */}
              {templateVars.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-white/60 border border-green-100">
                  <p className="text-sm font-medium text-green-800 mb-2">🔤 Variables automáticas</p>
                  <div className="flex flex-wrap gap-2">
                    {templateVars.map((varName) => {
                      const mapping: Record<string, string> = {
                        'nombre': 'Nombre del contacto',
                        'name': 'Nombre del contacto',
                        'empresa': 'Departamento',
                        'company': 'Departamento',
                        'departamento': 'Departamento',
                        'department': 'Departamento',
                        'cargo': 'Posición',
                        'position': 'Posición',
                      };
                      return (
                        <span key={varName} className="px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs">
                          {`{{${varName}}}`} → {mapping[varName.toLowerCase()] || 'Campo del contacto'}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Las variables se reemplazarán automáticamente con los datos de cada contacto seleccionado.
                  </p>
                </div>
              )}

              {/* Header Media URL input - show when template has IMAGE, VIDEO or DOCUMENT header */}
              {selectedTemplate.header && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedTemplate.header.type.toUpperCase()) && (
                <div className="mt-3 p-3 rounded-lg bg-white/60 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {selectedTemplate.header.type.toUpperCase() === 'IMAGE' ? '🖼️' :
                        selectedTemplate.header.type.toUpperCase() === 'VIDEO' ? '🎥' : '📄'}
                    </span>
                    <p className="text-sm font-medium text-blue-800">
                      Esta plantilla requiere {selectedTemplate.header.type.toUpperCase() === 'IMAGE' ? 'una imagen' :
                        selectedTemplate.header.type.toUpperCase() === 'VIDEO' ? 'un video' : 'un documento'}
                    </p>
                  </div>
                  <input
                    type="url"
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder={`URL del archivo ${selectedTemplate.header.type.toLowerCase()} (ej: https://example.com/archivo.${selectedTemplate.header.type.toUpperCase() === 'IMAGE' ? 'jpg' :
                      selectedTemplate.header.type.toUpperCase() === 'VIDEO' ? 'mp4' : 'pdf'
                      })`}
                    value={headerMediaUrl}
                    onChange={(e) => setHeaderMediaUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 La URL debe ser pública y accesible.
                    {selectedTemplate.header.type.toUpperCase() === 'IMAGE' && ' Formatos soportados: JPG, PNG.'}
                    {selectedTemplate.header.type.toUpperCase() === 'VIDEO' && ' Formatos soportados: MP4.'}
                    {selectedTemplate.header.type.toUpperCase() === 'DOCUMENT' && ' Formato recomendado: PDF.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Subject for email */}
          {channel === 'email' && !selectedTemplate && (
            <div className="animate-fade-in">
              <input
                type="text"
                className="input"
                placeholder="✉️ Asunto del correo electrónico..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          {/* Message Composer Card */}
          <div className="composer-container flex flex-col flex-1" style={{ minHeight: '320px' }}>

            {/* Header */}
            <div className={styles.header}>
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {selectedTemplate ? '📱' : selectedEmailTemplate ? '📧' : channel === 'whatsapp' ? '💬' : channel === 'email' ? '📧' : '📨'}
                </span>
                <span className={`font-semibold ${channel === 'whatsapp' || selectedTemplate ? 'text-white' : 'text-gray-800'}`}>
                  {selectedTemplate
                    ? `WhatsApp Template: ${selectedTemplate.name}`
                    : selectedEmailTemplate
                      ? `Email Template: ${selectedEmailTemplate.name}`
                      : channel === 'whatsapp' ? 'WhatsApp Message'
                        : channel === 'email' ? 'Email Message'
                          : channel === 'sms' ? 'Mensaje SMS'
                            : 'Mensaje'}
                </span>
              </div>
              {/* WhatsApp Templates Button */}
              {channel === 'whatsapp' && (
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  disabled={loadingTemplates}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-white/80 hover:bg-white/10"
                >
                  {loadingTemplates ? (
                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      Plantillas WhatsApp ({templates.length})
                    </>
                  )}
                </button>
              )}
              {/* Email Templates Button */}
              {channel === 'email' && (
                <button
                  onClick={() => setShowEmailTemplates(!showEmailTemplates)}
                  disabled={loadingEmailTemplates}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-[#8B5A9B] hover:bg-[#8B5A9B]/10"
                >
                  {loadingEmailTemplates ? (
                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      Plantillas Email ({emailTemplates.length})
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Templates Dropdown */}
            {showTemplates && templates.length > 0 && (
              <div className="p-4 border-b border-green-100 animate-fade-in bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                    📱 Plantillas de WhatsApp Business (envío directo)
                  </p>
                  <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="w-full text-left p-3 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{template.name}</span>
                        <div className="flex gap-2">
                          {getCategoryBadge(template.category)}
                          <span className="badge badge-success text-xs">✓ Aprobada</span>
                        </div>
                      </div>
                      {template.header?.text && (
                        <p className="text-xs text-gray-400 mb-1">📌 {template.header.text}</p>
                      )}
                      {/* Media header indicator */}
                      {template.header && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.header.type.toUpperCase()) && (
                        <p className="text-xs text-blue-600 mb-1">
                          {template.header.type.toUpperCase() === 'IMAGE' ? '🖼️ Requiere imagen' :
                            template.header.type.toUpperCase() === 'VIDEO' ? '🎥 Requiere video' : '📄 Requiere documento'}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2">{template.body?.text}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {template.variables?.length > 0 && (
                          <span className="text-xs text-purple-600">
                            🔤 Variables: se llenarán automáticamente
                          </span>
                        )}
                        <span className="text-xs text-gray-400">🌐 {template.language}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email Templates Dropdown */}
            {showEmailTemplates && emailTemplates.length > 0 && (
              <div className="p-4 border-b border-blue-100 animate-fade-in bg-gradient-to-r from-blue-50 to-cyan-50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                    📧 Plantillas de Email
                  </p>
                  <button onClick={() => setShowEmailTemplates(false)} className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => applyEmailTemplate(template)}
                        className="w-full text-left p-3 hover:bg-blue-50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900">{template.name}</span>
                          <span className="badge badge-info text-xs">📧 Email</span>
                        </div>
                        {template.subject && (
                          <p className="text-xs text-blue-600 mb-1">📌 {template.subject}</p>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {getEmailTemplatePreview(template)}
                        </p>
                      </button>
                      <div className="px-3 pb-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewEmailTemplate(template);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Vista Previa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Image Preview Grid - only for non-template messages */}
            {!selectedTemplate && imageFiles.length > 0 && (
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {imageFiles.map((file) => (
                    <div key={file.name} className="relative flex-shrink-0 group">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="h-20 w-20 object-cover rounded-xl border-2 border-purple-200"
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <button
                        onClick={() => handleRemoveFile(file.name)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white opacity-0 group-hover:opacity-100 transition-all bg-red-500 hover:bg-red-600"
                        style={{ boxShadow: '0 2px 8px rgba(255, 71, 87, 0.4)' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Files */}
            {!selectedTemplate && otherFiles.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {otherFiles.map((file) => (
                    <span key={file.name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 border border-purple-200 text-[#8B5A9B]">
                      📎 {file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                      <button
                        onClick={() => handleRemoveFile(file.name)}
                        className="hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Textarea / Template Preview */}
            <div className="flex-1 p-4 bg-white">
              {selectedTemplate ? (
                <div className="h-full flex flex-col">
                  <p className="text-xs text-gray-400 mb-2">Vista previa (las variables se reemplazarán por cada contacto):</p>
                  <div className="flex-1 p-4 rounded-xl bg-gray-50 border border-gray-200">
                    {selectedTemplate.header?.text && (
                      <p className="font-bold text-gray-900 mb-2">{selectedTemplate.header.text}</p>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
                    {selectedTemplate.footer?.text && (
                      <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-200">{selectedTemplate.footer.text}</p>
                    )}
                  </div>
                </div>
              ) : selectedEmailTemplate ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">Edita el contenido de tu email:</p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          document.execCommand('bold', false);
                          contentEditableRef.current?.focus();
                        }}
                        className="w-7 h-7 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all"
                        title="Negrita (Ctrl+B)"
                      >
                        <strong className="text-sm">N</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          document.execCommand('italic', false);
                          contentEditableRef.current?.focus();
                        }}
                        className="w-7 h-7 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all"
                        title="Cursiva (Ctrl+I)"
                      >
                        <em className="text-sm">K</em>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          document.execCommand('underline', false);
                          contentEditableRef.current?.focus();
                        }}
                        className="w-7 h-7 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all"
                        title="Subrayado (Ctrl+U)"
                      >
                        <u className="text-sm">S</u>
                      </button>
                    </div>
                  </div>
                  <div
                    ref={contentEditableRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setContent(e.currentTarget.innerHTML)}
                    className="flex-1 p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-400 focus:outline-none overflow-y-auto"
                    style={{ lineHeight: '1.6', fontSize: '15px' }}
                  />
                </div>
              ) : (
                <textarea
                  className="w-full h-full resize-none bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-800 placeholder-gray-400 text-base leading-relaxed"
                  placeholder="Escribe tu mensaje aquí... ✨"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              )}
            </div>

            {/* Bottom Bar */}
            <div className="composer-footer">
              <div className="flex items-center gap-4">
                {!selectedTemplate && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white border border-gray-200 hover:border-[#8B5A9B] hover:bg-purple-50"
                      title="Adjuntar archivo"
                    >
                      {uploading ? (
                        <div className="spinner" style={{ width: '18px', height: '18px' }} />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5A9B" strokeWidth="2">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                      )}
                    </button>
                  </>
                )}
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  {selectedTemplate ? (
                    <span className="text-green-600 font-medium">⚡ Envío directo API</span>
                  ) : (
                    <>
                      <span className="text-[#8B5A9B] font-medium">{content.length}</span>
                      <span>caracteres</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 border border-purple-100">
                  {selectedTemplate ? (
                    <>
                      <span className="text-green-600 font-semibold">{contactsWithPhone}</span>
                      <span className="text-gray-500 text-sm">con teléfono</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#8B5A9B] font-semibold">{selectedContacts.length}</span>
                      <span className="text-gray-500 text-sm">contacto{selectedContacts.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
                {selectedEmailTemplate && (
                  <button
                    onClick={() => setPreviewEmailTemplate(selectedEmailTemplate)}
                    className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-all flex items-center gap-2 text-sm font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Vista Previa
                  </button>
                )}
                {/* Vista previa para email libre (sin plantilla) */}
                {!selectedTemplate && !selectedEmailTemplate && channel === 'email' && content.trim() && (
                  <button
                    onClick={() => setShowEmailPreview(true)}
                    className="px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-[#8B5A9B] hover:bg-purple-100 transition-all flex items-center gap-2 text-sm font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Vista Previa Email
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={!canSend || sending}
                  className={selectedTemplate ? 'send-btn send-btn-whatsapp' : styles.sendBtn}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-3 flex-wrap">
            <div className="stat-pill">
              <span className="text-lg">📱</span>
              <span>{selectedContacts.filter(c => c.phone).length} con teléfono</span>
            </div>
            <div className="stat-pill">
              <span className="text-lg">📧</span>
              <span>{selectedContacts.filter(c => c.email).length} con email</span>
            </div>
            {!selectedTemplate && (
              <div className="stat-pill">
                <span className="text-lg">📎</span>
                <span>{uploadedFiles.length} adjunto{uploadedFiles.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {selectedTemplate && (
              <div className="stat-pill" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                <span className="text-lg">⚡</span>
                <span className="text-green-700">API Directa (sin n8n)</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Contacts (2 cols) */}
        <div className="xl:col-span-2 min-h-0">
          <ContactList
            selectedContacts={selectedContacts}
            onSelectionChange={setSelectedContacts}
            channel={channel}
            selectedTemplate={selectedTemplate}
          />
        </div>
      </div>

      {/* Email Template Preview Modal */}
      {previewEmailTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPreviewEmailTemplate(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-2xl">
                    📧
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Vista Previa del Email</h2>
                    <p className="text-sm text-gray-500">{previewEmailTemplate.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewEmailTemplate(null)}
                  className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Template Info */}
              {previewEmailTemplate.subject && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Asunto</h3>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-blue-900 font-medium">{previewEmailTemplate.subject}</p>
                  </div>
                </div>
              )}

              {/* Email Preview */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Vista Previa del Email</h3>
                <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg bg-white">
                  <iframe
                    srcDoc={
                      selectedEmailTemplate && previewEmailTemplate.id === selectedEmailTemplate.id
                        ? generateFullEmailHtml(content, subject)
                        : previewEmailTemplate.content
                    }
                    className="w-full h-[600px] border-0"
                    title="Vista previa del email"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => setPreviewEmailTemplate(null)}
                className="btn btn-secondary"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  applyEmailTemplate(previewEmailTemplate);
                  setPreviewEmailTemplate(null);
                }}
                className="btn btn-glow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Usar Esta Plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal (for free-form emails without template) */}
      {showEmailPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowEmailPreview(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#8B5A9B] to-purple-600 flex items-center justify-center text-white text-2xl">
                    📧
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Vista Previa del Email</h2>
                    <p className="text-sm text-gray-500">Así se verá tu mensaje</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Subject */}
              {subject && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Asunto</h3>
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                    <p className="text-purple-900 font-medium">{subject}</p>
                  </div>
                </div>
              )}

              {/* Email Preview */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Vista Previa del Email</h3>
                <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg bg-white">
                  <iframe
                    srcDoc={generateFullEmailHtml(content, subject || 'Mensaje de OWO')}
                    className="w-full h-[600px] border-0"
                    title="Vista previa del email"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowEmailPreview(false)}
                className="btn btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
