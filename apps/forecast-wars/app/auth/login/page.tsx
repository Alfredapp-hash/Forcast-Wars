import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-16 text-white/50">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
