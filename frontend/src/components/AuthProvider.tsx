"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = () => {
            // Skip auth check if running on localhost
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
            }

            try {
                const identityStr = localStorage.getItem("identity");

                if (!identityStr) {
                    throw new Error("No se encontró el objeto 'identity' en el localStorage de este dominio.");
                }

                let identity;
                try {
                    identity = JSON.parse(identityStr);
                } catch (e) {
                    throw new Error("El objeto 'identity' no tiene un formato JSON válido.");
                }

                if (!identity || !identity.token) {
                    throw new Error("No se encontró un 'token' válido dentro del objeto identity.");
                }

                // Token exists locally
                setIsAuthenticated(true);
            } catch (error: any) {
                console.log("Authentication failed:", error);
                setAuthError(error.message || "Error desconocido de autenticación");
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#FAFBFC]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    <p className="text-gray-500 font-medium">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    if (authError) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#FAFBFC] p-6">
                <div className="flex flex-col items-center gap-6 max-w-md text-center bg-white p-8 rounded-2xl shadow-xl border border-red-100">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
                        <p className="text-gray-600 mb-4">{authError}</p>
                        <p className="text-sm text-gray-400 bg-gray-50 p-3 rounded-lg text-left break-words font-mono">
                            URL Actual: {typeof window !== 'undefined' ? window.location.href : '...'}
                        </p>
                    </div>
                    <button 
                        onClick={() => window.location.href = "https://saman.lafortuna.com.co"}
                        className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        Volver a Saman
                    </button>
                </div>
            </div>
        );
    }

    // Only render children if authenticated
    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
