import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  // AuthForm reads `?next=` via useSearchParams → needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
