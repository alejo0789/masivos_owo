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

  // SMS Templates
  const [smsTemplates, setSmsTemplates] = useState<Template[]>([]);
  const [showSmsTemplates, setShowSmsTemplates] = useState(false);
  const [selectedSmsTemplate, setSelectedSmsTemplate] = useState<Template | null>(null);
  const [loadingSmsTemplates, setLoadingSmsTemplates] = useState(false);

  // HTML Editor State
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);

  // Custom Variables State
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});

  // File upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplates();
    loadEmailTemplates();
    loadSmsTemplates();

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
    // Update contentEditable when template changes, switching channels, or content is cleared
    if (contentEditableRef.current) {
      // If we have a selected template, force strict sync (preview mode mostly)
      if (selectedEmailTemplate) {
        if (contentEditableRef.current.innerHTML !== content) {
          contentEditableRef.current.innerHTML = content;
        }
      } else {
        // Manual editing mode
        // 1. If content is empty (e.g. cleared), empty the editor
        if (content === '') {
          if (contentEditableRef.current.innerHTML !== '') {
            contentEditableRef.current.innerHTML = '';
          }
        }
        // 2. If editor is empty but content has text (e.g. switching channel to email), fill it
        else if (contentEditableRef.current.innerHTML === '' && content !== '') {
          contentEditableRef.current.innerHTML = content;
        }
      }
    }
  }, [selectedEmailTemplate, channel, content]);

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

  const loadSmsTemplates = async () => {
    try {
      setLoadingSmsTemplates(true);
      const templates = await getTemplates({ channel: 'sms' });
      setSmsTemplates(templates);
    } catch (err) {
      console.error('Error loading SMS templates:', err);
    } finally {
      setLoadingSmsTemplates(false);
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

  const replaceVariables = (text: string, variables: Record<string, string>): string => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      result = result.replace(regex, value || `{{${key}}}`);
    });
    return result;
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

    // Extract variables and initialize custom variables state
    const variables = extractVariables(bodyText);
    const initialVars: Record<string, string> = {};
    variables.forEach(varName => {
      initialVars[varName] = '';
    });
    setCustomVariables(initialVars);
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setContent('');
    setHeaderMediaUrl('');
    setCustomVariables({});
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

    // Extract variables from both subject and content
    const subjectVars = extractVariables(template.subject || '');
    const contentVars = extractVariables(templateContent);
    const allVars = [...new Set([...subjectVars, ...contentVars])];

    // Filter out automatic variables (these are replaced from contact data)
    const automaticVars = ['nombre', 'name', 'telefono', 'phone', 'primer_nombre', 'first_name', 'email'];
    const customVars = allVars.filter(varName =>
      !automaticVars.includes(varName.toLowerCase())
    );

    const initialVars: Record<string, string> = {};
    customVars.forEach(varName => {
      initialVars[varName] = '';
    });
    setCustomVariables(initialVars);
  };

  const clearEmailTemplate = () => {
    setSelectedEmailTemplate(null);
    setSubject('');
    setContent('');
    setCustomVariables({});
  };

  const applySmsTemplate = (template: Template) => {
    setContent(template.content);
    setSelectedSmsTemplate(template);
    setChannel('sms');
    setShowSmsTemplates(false);

    // Extract variables from content
    const contentVars = extractVariables(template.content);

    // Filter out automatic variables (these are replaced from contact data)
    const automaticVars = ['nombre', 'name', 'telefono', 'phone', 'primer_nombre', 'first_name'];
    const customVars = contentVars.filter(varName =>
      !automaticVars.includes(varName.toLowerCase())
    );

    const initialVars: Record<string, string> = {};
    customVars.forEach(varName => {
      initialVars[varName] = '';
    });
    setCustomVariables(initialVars);
  };

  const clearSmsTemplate = () => {
    setSelectedSmsTemplate(null);
    setContent('');
    setCustomVariables({});
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentEditableRef.current?.focus();
    // Trigger update
    if (contentEditableRef.current) {
      setContent(contentEditableRef.current.innerHTML);
    }
  };

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
    // If changing away from sms, clear sms template
    if (newChannel !== 'sms' && selectedSmsTemplate) {
      setSelectedSmsTemplate(null);
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

  // Header File Upload
  const [headerFileUploading, setHeaderFileUploading] = useState(false);
  const headerFileInputRef = useRef<HTMLInputElement>(null);

  const handleHeaderFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setHeaderFileUploading(true);
    try {
      const fileArray = Array.from(files);
      // We only take the first file
      const file = fileArray[0];
      const filenames = await uploadFiles([file]);

      if (filenames.length > 0) {
        const filename = filenames[0];
        // Construct public URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
        // Remove trailing slash if present
        const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const publicUrl = `${baseUrl}/uploads/${filename}`;

        setHeaderMediaUrl(publicUrl);

        // Show success feedback if needed, or just rely on the URL appearing in the input
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo de cabecera');
    } finally {
      setHeaderFileUploading(false);
      if (headerFileInputRef.current) headerFileInputRef.current.value = '';
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

        // Define all possible mappings for automatic contact fields
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

        // Prepare custom variables for WhatsApp (static values that apply to all recipients)
        // We need to add these to each recipient's data
        const customVarsForRecipients: Record<string, string> = {};
        Object.entries(customVariables).forEach(([key, value]) => {
          if (value.trim()) {
            customVarsForRecipients[key] = value;
          }
        });

        const response = await sendWhatsAppTemplate({
          template_name: selectedTemplate.name,
          language_code: selectedTemplate.language,
          recipients: recipients.map(r => ({
            ...r,
            ...customVarsForRecipients // Add custom variables to each recipient
          })),
          variable_mapping: {
            ...variableMapping,
            // Add custom variables to the mapping (they'll use the same value for all)
            ...Object.keys(customVarsForRecipients).reduce((acc, key) => {
              acc[key.toLowerCase()] = key; // Map variable name to itself in recipient data
              return acc;
            }, {} as Record<string, string>)
          },
          header_media_url: headerMediaUrl || undefined,
        });

        setResult(response);

        if (response.sent > 0 && response.failed === 0) {
          setSelectedContacts([]);
          setContent('');
          setSelectedTemplate(null);
          setHeaderMediaUrl('');
          setCustomVariables({});
          uploadedFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
          setUploadedFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } else {
        // Regular message via SMS or n8n webhook
        if (channel === 'sms') {
          // SMS Sending Logic with per-contact variable replacement
          const recipientsWithMessages = selectedContacts
            .filter(c => c.phone) // Only contacts with phone
            .map(c => {
              // Replace variables for each contact individually
              let personalizedMessage = content;

              // Replace {{nombre}} or {{name}}
              personalizedMessage = personalizedMessage.replace(/\{\{nombre\}\}/gi, c.name || '');
              personalizedMessage = personalizedMessage.replace(/\{\{name\}\}/gi, c.name || '');

              // Replace {{telefono}} or {{phone}}
              personalizedMessage = personalizedMessage.replace(/\{\{telefono\}\}/gi, c.phone || '');
              personalizedMessage = personalizedMessage.replace(/\{\{phone\}\}/gi, c.phone || '');

              // Replace {{primer_nombre}} or {{first_name}}
              const firstName = c.name ? c.name.split(' ')[0] : '';
              personalizedMessage = personalizedMessage.replace(/\{\{primer_nombre\}\}/gi, firstName);
              personalizedMessage = personalizedMessage.replace(/\{\{first_name\}\}/gi, firstName);

              // Replace custom variables if any (static values for all)
              if (Object.keys(customVariables).length > 0) {
                Object.keys(customVariables).forEach(varName => {
                  const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'gi');
                  personalizedMessage = personalizedMessage.replace(regex, customVariables[varName]);
                });
              }

              return {
                phone: c.phone!,
                name: c.name,
                message: personalizedMessage
              };
            });

          if (recipientsWithMessages.length === 0) {
            setError('Ninguno de los contactos seleccionados tiene número de teléfono');
            setSending(false);
            return;
          }

          const response = await sendBulkSMS({
            recipients: recipientsWithMessages,
            message: content, // Send original template for logging
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
            setSelectedSmsTemplate(null);
            setCustomVariables({});
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
          let emailSubject = subject;

          if (channel === 'email') {
            // Replace custom variables in content and subject
            let bodyContent = content;
            if (selectedEmailTemplate && Object.keys(customVariables).length > 0) {
              bodyContent = replaceVariables(content, customVariables);
              emailSubject = replaceVariables(subject || '', customVariables);
            } else if (!selectedEmailTemplate) {
              // If sending without a template (plain text), convert newlines to <br>
              bodyContent = content.replace(/\n/g, '<br />');
            }
            emailContent = generateFullEmailHtml(bodyContent, emailSubject || 'Mensaje de OWO');
          }

          const response = await sendBulkMessages({
            recipients,
            subject: emailSubject || undefined,
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
            setCustomVariables({});
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

              {/* Custom Variables Input - for variables not auto-mapped */}
              {Object.keys(customVariables).length > 0 && (
                <div className="mt-3 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✏️</span>
                    <p className="text-sm font-bold text-purple-900">Variables Personalizadas</p>
                  </div>
                  <div className="space-y-3">
                    {Object.keys(customVariables).map((varName) => (
                      <div key={varName} className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-purple-700">
                          {`{{${varName}}}`}
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                          placeholder={`Valor para {{${varName}}}`}
                          value={customVariables[varName]}
                          onChange={(e) => setCustomVariables({
                            ...customVariables,
                            [varName]: e.target.value
                          })}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-purple-600 mt-3 flex items-start gap-1">
                    <span>💡</span>
                    <span>Estas variables se aplicarán a todos los mensajes enviados.</span>
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

                  <div className="space-y-3">
                    {/* URL Input */}
                    <input
                      type="url"
                      className="w-full px-4 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      placeholder={`URL del archivo ${selectedTemplate.header.type.toLowerCase()} (ej: https://example.com/archivo.${selectedTemplate.header.type.toUpperCase() === 'IMAGE' ? 'jpg' :
                        selectedTemplate.header.type.toUpperCase() === 'VIDEO' ? 'mp4' : 'pdf'
                        })`}
                      value={headerMediaUrl}
                      onChange={(e) => setHeaderMediaUrl(e.target.value)}
                    />

                    <div className="flex items-center gap-2">
                      <div className="h-px bg-blue-200 flex-1"></div>
                      <span className="text-xs text-blue-400 font-medium">O</span>
                      <div className="h-px bg-blue-200 flex-1"></div>
                    </div>

                    {/* File Upload Button */}
                    <input
                      ref={headerFileInputRef}
                      type="file"
                      accept={selectedTemplate.header.type.toUpperCase() === 'IMAGE' ? 'image/*' :
                        selectedTemplate.header.type.toUpperCase() === 'VIDEO' ? 'video/*' :
                          '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'}
                      className="hidden"
                      onChange={(e) => handleHeaderFileUpload(e.target.files)}
                    />
                    <button
                      onClick={() => headerFileInputRef.current?.click()}
                      disabled={headerFileUploading}
                      className="w-full py-2 px-4 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      {headerFileUploading ? (
                        <>
                          <div className="spinner" style={{ width: '16px', height: '16px', borderColor: '#3B82F6', borderRightColor: 'transparent' }} />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          Subir archivo desde mi equipo
                        </>
                      )}
                    </button>
                  </div>

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

          {/* Custom Variables for Email Templates */}
          {channel === 'email' && Object.keys(customVariables).length > 0 && (
            <div className="animate-fade-in p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✏️</span>
                <p className="text-sm font-bold text-blue-900">Variables Personalizadas</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(customVariables).map((varName) => (
                  <div key={varName} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-blue-700">
                      {`{{${varName}}}`}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                      placeholder={`Valor para {{${varName}}}`}
                      value={customVariables[varName]}
                      onChange={(e) => setCustomVariables({
                        ...customVariables,
                        [varName]: e.target.value
                      })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-3 flex items-start gap-1">
                <span>💡</span>
                <span>Estas variables se reemplazarán en el asunto y contenido del email.</span>
              </p>
            </div>
          )}

          {/* Custom Variables for SMS Templates */}
          {channel === 'sms' && Object.keys(customVariables).length > 0 && (
            <div className="animate-fade-in p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✏️</span>
                <p className="text-sm font-bold text-purple-900">Variables Personalizadas</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(customVariables).map((varName) => (
                  <div key={varName} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-purple-700">
                      {`{{${varName}}}`}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                      placeholder={`Valor para {{${varName}}}`}
                      value={customVariables[varName]}
                      onChange={(e) => setCustomVariables({
                        ...customVariables,
                        [varName]: e.target.value
                      })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-purple-600 mt-3 flex items-start gap-1">
                <span>💡</span>
                <span>Estas variables se reemplazarán en el contenido del SMS.</span>
              </p>
            </div>
          )}


          {/* Message Composer Card */}
          <div className="composer-container flex flex-col flex-1" style={{ minHeight: '320px' }}>

            {/* Header */}
            <div className={styles.header}>
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {selectedTemplate ? '📱' : selectedEmailTemplate ? '📧' : selectedSmsTemplate ? '💬' : channel === 'whatsapp' ? '💬' : channel === 'email' ? '📧' : '📨'}
                </span>
                <span className={`font-semibold ${channel === 'whatsapp' || selectedTemplate ? 'text-white' : 'text-gray-800'}`}>
                  {selectedTemplate
                    ? `WhatsApp Template: ${selectedTemplate.name}`
                    : selectedEmailTemplate
                      ? `Email Template: ${selectedEmailTemplate.name}`
                      : selectedSmsTemplate
                        ? `SMS Template: ${selectedSmsTemplate.name}`
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
              {/* SMS Templates Button */}
              {channel === 'sms' && (
                <button
                  onClick={() => setShowSmsTemplates(!showSmsTemplates)}
                  disabled={loadingSmsTemplates}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-[#8B5A9B] hover:bg-[#8B5A9B]/10"
                >
                  {loadingSmsTemplates ? (
                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Plantillas SMS ({smsTemplates.length})
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

            {/* SMS Templates Dropdown */}
            {showSmsTemplates && smsTemplates.length > 0 && (
              <div className="p-4 border-b border-purple-100 animate-fade-in bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                    💬 Plantillas de SMS
                  </p>
                  <button onClick={() => setShowSmsTemplates(false)} className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {smsTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applySmsTemplate(template)}
                      className="w-full text-left p-3 bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{template.name}</span>
                        <span className="badge badge-purple text-xs">💬 SMS</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 font-mono">
                        {template.content.length > 100 ? template.content.substring(0, 100) + '...' : template.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">{template.content.length} caracteres</span>
                        {template.content.match(/\{\{(\w+)\}\}/g) && (
                          <span className="text-xs text-purple-600">
                            🔤 {template.content.match(/\{\{(\w+)\}\}/g)?.length} variable(s)
                          </span>
                        )}
                      </div>
                    </button>
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
                <>
                  {channel === 'email' ? (
                    <div className="h-full flex flex-col">
                      {/* Toolbar */}
                      <div className="mb-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 flex flex-wrap gap-2 items-center">
                        {/* Basic Formatting */}
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => applyFormat('bold')} className="p-1.5 rounded hover:bg-white hover:text-purple-600 transition-colors" title="Negrita">
                            <strong className="text-sm">N</strong>
                          </button>
                          <button type="button" onClick={() => applyFormat('italic')} className="p-1.5 rounded hover:bg-white hover:text-purple-600 transition-colors" title="Cursiva">
                            <em className="text-sm">K</em>
                          </button>
                          <button type="button" onClick={() => applyFormat('underline')} className="p-1.5 rounded hover:bg-white hover:text-purple-600 transition-colors" title="Subrayado">
                            <u className="text-sm">S</u>
                          </button>
                        </div>
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>

                        {/* Alignment */}
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => applyFormat('justifyLeft')} className="p-1.5 rounded hover:bg-white hover:text-purple-600 transition-colors" title="Izquierda">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>
                          </button>
                          <button type="button" onClick={() => applyFormat('justifyCenter')} className="p-1.5 rounded hover:bg-white hover:text-purple-600 transition-colors" title="Centro">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
                          </button>
                          <button type="button" onClick={() => applyFormat('justifyRight')} className="p-1.5 rounded hover:bg-white hover:text-purple-600 transition-colors" title="Derecha">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></svg>
                          </button>
                        </div>
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>

                        {/* Color Picker */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setShowColorPicker(!showColorPicker); setShowFontPicker(false); }}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white text-sm"
                          >
                            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 via-purple-500 to-blue-500"></span>
                            <span>Color</span>
                          </button>
                          {showColorPicker && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)}></div>
                              <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 min-w-[200px]">
                                <div className="grid grid-cols-5 gap-2 mb-3">
                                  {['#8B5A9B', '#00B4D8', '#000000', '#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#6B7280', '#FFFFFF'].map(c => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => { applyFormat('foreColor', c); setShowColorPicker(false); }}
                                      className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 border-t pt-2">
                                  <input type="color" onChange={(e) => applyFormat('foreColor', e.target.value)} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" />
                                  <span className="text-xs text-gray-500">Personalizado</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Font Size */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setShowFontPicker(!showFontPicker); setShowColorPicker(false); }}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white text-sm"
                          >
                            <span className="text-xs">Aa</span>
                            <span>Tamaño</span>
                          </button>
                          {showFontPicker && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowFontPicker(false)}></div>
                              <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 p-1 z-50 min-w-[120px]">
                                {[
                                  { size: '1', label: 'Muy pequeño' },
                                  { size: '2', label: 'Pequeño' },
                                  { size: '3', label: 'Normal' },
                                  { size: '4', label: 'Mediano' },
                                  { size: '5', label: 'Grande' },
                                  { size: '6', label: 'Muy grande' },
                                  { size: '7', label: 'Enorme' },
                                ].map((s) => (
                                  <button
                                    key={s.size}
                                    type="button"
                                    onClick={() => { applyFormat('fontSize', s.size); setShowFontPicker(false); }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-sm rounded"
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Editor */}
                      <div
                        ref={contentEditableRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => setContent(e.currentTarget.innerHTML)}
                        className="flex-1 p-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none bg-white overflow-y-auto transition-all"
                        style={{
                          lineHeight: '1.6',
                          fontSize: '15px',
                          minHeight: '200px'
                        }}
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
                </>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="composer-footer">
              <div className="flex items-center gap-4">
                {!selectedTemplate && channel !== 'sms' && (
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
                    srcDoc={generateFullEmailHtml(content.replace(/\n/g, '<br />'), subject || 'Mensaje de OWO')}
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
