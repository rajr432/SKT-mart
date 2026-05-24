"use client";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

interface Props {
  next?: string;
}

export default function GoogleSignIn({ next = "/" }: Props) {
  const { login } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  const hasClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  if (!hasClientId) {
    return (
      <div className="text-xs text-gray-400 text-center py-2">
        Google sign-in will be enabled soon
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const onSuccess = async (cred: CredentialResponse) => {
    setErr(null);
    const idToken = cred.credential;
    if (!idToken) {
      setErr("No credential from Google");
      return;
    }
    try {
      const { token, user } = await api<{ token: string; user: User }>(
        "/api/auth/google",
        { method: "POST", json: { idToken } },
      );
      login(token, user);
      router.push(next);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 my-2">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-500">OR</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() =>
            setErr(
              `Google sign-in blocked. Add this site (${origin || "your domain"}) to "Authorized JavaScript origins" in Google Cloud Console.`,
            )
          }
          useOneTap={false}
          theme="outline"
          size="large"
          shape="rectangular"
          text="continue_with"
        />
      </div>
      {err && (
        <div className="text-red-600 text-xs text-center space-y-1">
          <p>{err}</p>
          {err.toLowerCase().includes("blocked") || err.toLowerCase().includes("origin") ? (
            <p className="text-gray-500">
              Admin: open{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Google Cloud Console
              </a>{" "}
              → OAuth Client → Authorized origins → add {origin}.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
