"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/locale-context";
import { ApiError } from "@/lib/api";

type Mode = "login" | "register";

interface FormValues {
  email: string;
  password: string;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register: registerUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.email({ message: t("auth.validation.emailInvalid") }),
        password:
          mode === "register"
            ? z.string().min(8, { message: t("auth.validation.passwordMin") })
            : z.string().min(1, { message: t("auth.validation.passwordRequired") }),
      }),
    [mode, t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "register") {
        await registerUser(values.email, values.password);
      } else {
        await login(values.email, values.password);
      }
      const next = searchParams.get("next");
      // Path-absolute only: reject "//evil.com" (protocol-relative) open redirects.
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.replace(safeNext);
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 409
          ? t("auth.register.emailTaken")
          : t(`auth.${mode}.error`);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-semibold tracking-tight">{t("nav.brand")}</span>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.brandTagline")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t(`auth.${mode}.title`)}</CardTitle>
            <CardDescription>{t(`auth.${mode}.subtitle`)}</CardDescription>
          </CardHeader>
          <CardContent>
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t(`auth.${mode}.emailLabel`)}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder={t(`auth.${mode}.emailPlaceholder`)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
                {errors.email && (
                  <p id="email-error" className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t(`auth.${mode}.passwordLabel`)}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  {...register("password")}
                />
                {errors.password ? (
                  <p id="password-error" className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                ) : isRegister ? (
                  <p className="text-xs text-muted-foreground">
                    {t("auth.register.passwordHint")}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t(`auth.${mode}.submitting`) : t(`auth.${mode}.submit`)}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isRegister ? t("auth.register.haveAccount") : t("auth.login.noAccount")}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {isRegister ? t("auth.register.loginLink") : t("auth.login.registerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
