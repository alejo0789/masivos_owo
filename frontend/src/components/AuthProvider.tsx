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

    useEffect(() => {
        const checkAuth = () => {
            try {
                const identityStr = localStorage.getItem("identity");

                if (!identityStr) {
                    throw new Error("No identity found");
                }

                const identity = JSON.parse(identityStr);

                if (!identity || !identity.token) {
                    throw new Error("No valid token found");
                }

                // Token exists locally
                setIsAuthenticated(true);
            } catch (error) {
                console.log("Authentication failed:", error);
                // Redirect to external login
                window.location.href = "https://saman.lafortuna.com.co";
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

    // Only render children if authenticated
    // If not authenticated, the useEffect redirect will handle it, 
    // but we return null here to avoid flashing protected content
    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
