import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, AlertCircle, KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoginPage: React.FC = () => {
    const { login, loginWithEmail, currentUser, isAuthorized, loading } = useAuth();
    const [email, setEmail] = useState("demo@loomy.com");
    const [password, setPassword] = useState("demo1234");
    const [error, setError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";
    const initialError = location.state?.error;

    useEffect(() => {
        if (initialError) {
            setError(initialError);
        }
    }, [initialError]);

    useEffect(() => {
        if (currentUser && isAuthorized) {
            navigate(from, { replace: true });
        } else if (currentUser && !isAuthorized) {
            setError("Tu usuario no está autorizado para acceder. Contacta con el administrador.");
        }
    }, [currentUser, isAuthorized, navigate, from]);

    const handleDemoLogin = async () => {
        setError(null);
        setIsLoggingIn(true);
        try {
            await login();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Error al iniciar sesión con la cuenta demo.");
            setIsLoggingIn(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Por favor ingresa correo y contraseña.");
            return;
        }

        setError(null);
        setIsLoggingIn(true);
        try {
            await loginWithEmail(email, password);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Error al iniciar sesión. Verifica tus datos.");
            setIsLoggingIn(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-surface-accent via-background to-muted px-4 py-12">
            {/* Fondo de cristal decorativo */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-50 blur-3xl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
                <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl" style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }} />
                <div className="absolute top-1/3 left-1/2 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }} />
            </div>
            <div className="relative w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                        Loomy
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Sistema de gestión y proyección
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <KeyRound className="h-3 w-3" />
                        Versión Demo
                    </span>
                </div>

                <Card className="shadow-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">Bienvenido</CardTitle>
                        <CardDescription className="text-center">
                            Ingresa al panel administrativo
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 px-8 pb-8">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-center">
                            <p className="text-xs font-semibold text-foreground">Acceso rápido de demostración</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">demo@loomy.com · demo1234</p>
                            <Button
                                type="button"
                                onClick={handleDemoLogin}
                                disabled={isLoggingIn}
                                variant="secondary"
                                className="mt-2 h-9 w-full font-medium"
                            >
                                {isLoggingIn ? "Cargando..." : "Entrar con cuenta demo"}
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-background/40 px-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                                    o ingresa con correo
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleEmailLogin} className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <Label htmlFor="email" className="text-xs">Correo electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2 text-sm">
                                <Label htmlFor="password" className="text-xs">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-10"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isLoggingIn}
                                className="h-11 w-full font-medium"
                            >
                                {isLoggingIn ? "Cargando..." : "Entrar"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col border-t border-border bg-muted/40 p-6 text-center text-[10px] text-muted-foreground rounded-b-2xl">
                        <p className="uppercase tracking-widest font-bold">Acceso restringido solo a personal autorizado.</p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default LoginPage;
