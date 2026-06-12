import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
