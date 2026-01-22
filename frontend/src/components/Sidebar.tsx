'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    {
        href: '/',
        label: 'Envío Masivo',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
        ),
    },
    {
        href: '/templates',
        label: 'Plantillas WhatsApp',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
        ),
    },
    {
        href: '/email-templates',
        label: 'Plantillas Email',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
            </svg>
        ),
    },
    {
        href: '/history',
        label: 'Historial',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-72 min-h-screen flex flex-col relative overflow-hidden" style={{
            background: 'linear-gradient(180deg, #8B5A9B 0%, #6B4478 50%, #5A3766 100%)',
        }}>
            {/* Decorative gradient orbs */}
            <div className="absolute top-20 -left-20 w-60 h-60 rounded-full bg-white opacity-10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-40 -right-20 w-40 h-40 rounded-full bg-[#00D9FF] opacity-15 blur-[60px] pointer-events-none" />

            {/* Curved decorative line */}
            <svg className="absolute top-0 right-0 h-full w-2 opacity-30" viewBox="0 0 10 400" preserveAspectRatio="none">
                <path
                    d="M5 0 Q 10 100 5 200 T 5 400"
                    stroke="url(#sidebarGradient)"
                    strokeWidth="2"
                    fill="none"
                />
                <defs>
                    <linearGradient id="sidebarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                        <stop offset="50%" stopColor="#00D9FF" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="white" stopOpacity="0.5" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Logo Section */}
            <div className="p-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center shadow-lg" style={{
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
                        }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/owo-logo.webp`}
                                alt="OWO"
                                width={56}
                                height={56}
                                className="object-cover"
                            />
                        </div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-white opacity-20 blur-xl -z-10" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-xl tracking-tight">Mensajería</h1>
                        <p className="text-white/70 text-sm font-medium">Masiva OWO</p>
                    </div>
                </div>
            </div>

            {/* Decorative divider */}
            <div className="mx-6 h-px relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 relative z-10">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 relative overflow-hidden ${isActive
                                ? 'text-[#8B5A9B]'
                                : 'text-white/80 hover:text-white'
                                }`}
                            style={isActive ? {
                                background: 'white',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                            } : {}}
                        >
                            {/* Hover background */}
                            {!isActive && (
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                            )}

                            {/* Icon container */}
                            <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                {item.icon}
                            </div>

                            <span className="font-semibold relative z-10">{item.label}</span>

                            {/* Active indicator */}
                            {isActive && (
                                <div className="ml-auto flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#00D9FF]" style={{
                                        boxShadow: '0 0 10px rgba(0, 217, 255, 0.8)'
                                    }} />
                                </div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Help Section */}
            <div className="px-4 pb-4 relative z-10">
                <div className="rounded-xl p-4" style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div className="flex items-center gap-3 text-white/80">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span className="text-sm font-medium">¿Necesitas ayuda?</span>
                    </div>
                    <p className="text-white/50 text-xs mt-2 leading-relaxed">
                        Configura tus webhooks en las variables de entorno para conectar n8n.
                    </p>
                </div>
            </div>

            {/* Brand Footer */}
            <div className="p-6 text-center relative z-10">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-white/60 text-xs font-medium">Powered by</span>
                    <span className="text-white font-bold text-lg tracking-tight">OWO</span>
                </div>
                <div className="mt-2 flex justify-center">
                    <div className="h-1 w-16 rounded-full bg-gradient-to-r from-white/30 via-white/60 to-white/30" />
                </div>
            </div>
        </aside>
    );
}
