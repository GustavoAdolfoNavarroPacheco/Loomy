import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken, clearToken, apiLogin, apiMe, apiLogout } from "@/services/dataService";

interface Permissions {
    modifyLocal: boolean;
    modifyInternational: boolean;
    isCotizador: boolean;
}

interface DemoUser {
    email: string;
}

interface AuthContextType {
    currentUser: DemoUser | null;
    isAuthorized: boolean;
    canModifyInternational: boolean;
    canModifyLocal: boolean;
    isCotizador: boolean;
    isMarianaOrHector: boolean;
    isHector: boolean;
    isGabriela: boolean;
    loading: boolean;
    login: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
    const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [permissions, setPermissions] = useState<Permissions>({
        modifyLocal: false,
        modifyInternational: false,
        isCotizador: false
    });

    const applySession = (user: any) => {
        setCurrentUser({ email: user.email });
        setPermissions({
            modifyLocal: !!user.modifyLocal,
            modifyInternational: !!user.modifyInternational,
            isCotizador: !!user.isCotizador
        });
        setIsAuthorized(true);
    };

    const clearSession = () => {
        clearToken();
        setCurrentUser(null);
        setIsAuthorized(false);
        setPermissions({
            modifyLocal: false,
            modifyInternational: false,
            isCotizador: false
        });
    };

    useEffect(() => {
        let cancelled = false;
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        apiMe()
            .then((res) => {
                if (cancelled) return;
                if (res?.user) applySession(res.user);
                else clearSession();
            })
            .catch(() => {
                if (!cancelled) clearSession();
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // En la DEMO el botón "Google" se sustituye por el acceso rápido con la cuenta demo.
    // Las credenciales demo pueden sobrescribirse con VITE_DEMO_EMAIL / VITE_DEMO_PASSWORD.
    const login = async () => {
        const email = import.meta.env.VITE_DEMO_EMAIL || 'demo@loomy.com';
        const password = import.meta.env.VITE_DEMO_PASSWORD || 'demo1234';
        const res = await apiLogin(email, password);
        setToken(res.token);
        applySession(res.user);
    };

    const loginWithEmail = async (email: string, pass: string) => {
        const res = await apiLogin(email, pass);
        setToken(res.token);
        applySession(res.user);
    };

    const logout = async () => {
        await apiLogout();
        clearSession();
    };

    // En la DEMO no hay roles especiales: todas las opciones quedan habilitadas.
    const isHector = false;
    const isGabriela = false;
    const isMarianaOrHector = false;

    return (
        <AuthContext.Provider value={{
            currentUser,
            isAuthorized,
            canModifyInternational: permissions.modifyInternational,
            canModifyLocal: permissions.modifyLocal,
            isCotizador: permissions.isCotizador,
            isMarianaOrHector,
            isHector,
            isGabriela,
            loading,
            login,
            loginWithEmail,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
