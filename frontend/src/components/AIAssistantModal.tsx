'use client';

import { useState, useRef, useEffect } from 'react';
import { chatWithAssistant, AssistantMessage, AssistantResponse } from '@/lib/api';

interface AIAssistantModalProps {
    context: 'template' | 'bulk_message';
    onClose: () => void;
    onApply?: (html: string) => void;
}

export default function AIAssistantModal({ context, onClose, onApply }: AIAssistantModalProps) {
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPreview, setCurrentPreview] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Generate unique sessionId for this conversation
    const [sessionId] = useState<string>(() =>
        `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    );

    useEffect(() => {
        // Auto-focus input
        inputRef.current?.focus();

        // Welcome message
        const welcomeMessage: AssistantMessage = {
            role: 'assistant',
            content: context === 'template'
                ? '¡Hola! 👋 Soy tu asistente de IA. Puedo ayudarte a crear plantillas de email profesionales. ¿Qué tipo de plantilla necesitas?'
                : '¡Hola! 👋 Soy tu asistente de IA. Puedo ayudarte a redactar el mensaje perfecto para tu campaña. ¿Qué mensaje quieres enviar?'
        };
        setMessages([welcomeMessage]);
    }, [context]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: AssistantMessage = {
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response: AssistantResponse = await chatWithAssistant({
                messages: [...messages, userMessage],
                context,
                sessionId
            });

            const assistantMessage: AssistantMessage = {
                role: 'assistant',
                content: response.message
            };

            setMessages(prev => [...prev, assistantMessage]);

            if (response.html_preview) {
                setCurrentPreview(response.html_preview);
            }
        } catch (error) {
            const errorMessage: AssistantMessage = {
                role: 'assistant',
                content: '❌ Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleApplyPreview = () => {
        if (currentPreview && onApply) {
            onApply(currentPreview);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur-md opacity-30"></div>
                            <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-lg shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                Asistente IA
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                                    Powered by AI
                                </span>
                            </h2>
                            <p className="text-sm text-gray-600">
                                {context === 'template' ? 'Creador de Plantillas' : 'Redactor de Mensajes'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden bg-gray-50">
                    {/* Chat Section */}
                    <div className={`${currentPreview ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200 bg-white`}>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                            ? 'bg-white text-gray-900 border border-gray-200'
                                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                                        <div className="flex gap-2">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex gap-3">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Escribe tu mensaje... (Shift+Enter para nueva línea)"
                                    className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    rows={2}
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preview Section */}
                    {currentPreview && (
                        <div className="w-1/2 flex flex-col bg-gray-50">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Vista Previa
                                </h3>
                                {onApply && (
                                    <button
                                        onClick={handleApplyPreview}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                                    >
                                        ✓ Aplicar
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="bg-white rounded-lg shadow-lg border border-gray-200">
                                    <div dangerouslySetInnerHTML={{ __html: currentPreview }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
