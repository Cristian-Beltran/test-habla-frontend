import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/auth/useAuth";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// lucide icon como logo y features
import {
  Mic,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  BookOpen,
  ClipboardCheck,
  Activity,
} from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Ingresa un correo válido." }),
  password: z.string().min(6, { message: "Mínimo 6 caracteres." }),
});

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setServerError("");
    try {
      await login({ email: values.email, password: values.password });
      navigate("/");
    } catch {
      form.setError("email", { type: "server", message: " " });
      form.setError("password", { type: "server", message: " " });
      setServerError("Credenciales inválidas. Intenta nuevamente.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-muted/20 dark:from-primary/15 dark:via-secondary/15 dark:to-muted/25">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-primary/10 via-secondary/10 to-muted/20 dark:from-primary/15 dark:via-secondary/15 dark:to-muted/25">
      {/* Capa de formas suaves con colores de sistema */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* blob superior derecha */}
        <div className="absolute -top-24 -right-16 h-[34rem] w-[34rem] rounded-full bg-gradient-to-tr from-primary/25 via-primary/10 to-transparent blur-3xl" />
        {/* blob inferior izquierda */}
        <div className="absolute -bottom-24 -left-16 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-secondary/25 via-secondary/10 to-transparent blur-3xl" />
        {/* velo con patrón radial sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_110%_-10%,hsl(var(--primary)/0.08),transparent),radial-gradient(45rem_22rem_at_-10%_110%,hsl(var(--secondary)/0.10),transparent)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full sm:max-w-md">
          <CardHeader className="space-y-3 text-center">
            {/* logo simple */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              Plataforma de Terapia del Habla
            </CardTitle>
            <CardDescription>
              Gestiona <span className="font-medium">prácticas guiadas</span>,
              aplica
              <span className="font-medium"> tests estandarizados</span> y
              monitorea el progreso clínico.
            </CardDescription>

            {/* highlights compactos para dar contexto */}
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="flex items-center justify-center gap-2 rounded-md border bg-background/60 px-3 py-2 text-sm">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>Prácticas</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-md border bg-background/60 px-3 py-2 text-sm">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <span>Tests</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-md border bg-background/60 px-3 py-2 text-sm">
                <Activity className="h-4 w-4 text-primary" />
                <span>Progreso</span>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {serverError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{serverError}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="doctor@ejemplo.com"
                            className="h-11 pl-10"
                            autoComplete="email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-11 pl-10 pr-10"
                            autoComplete="current-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={
                              showPassword
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando…
                    </>
                  ) : (
                    "Iniciar sesión"
                  )}
                </Button>

                {/* copy de valor breve bajo el CTA */}
                <p className="text-center text-xs text-muted-foreground">
                  Acceso exclusivo para personal clínico y pacientes
                  registrados.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
