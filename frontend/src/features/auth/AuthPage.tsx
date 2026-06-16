"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "./components/LoginPage";
import { getCurrentUser, login, register } from "./lib/auth-api";
import { clearToken, getToken, saveToken } from "./lib/token-storage";
import type { AuthCredentials } from "./types";

export function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Checking saved login...");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      Promise.resolve().then(() => {
        setStatus("Not logged in");
        setIsLoading(false);
      });
      return;
    }

    getCurrentUser(token)
      .then(() => {
        setIsAuthenticated(true);
        setStatus("Logged in");
      })
      .catch((error: Error) => {
        clearToken();
        setIsAuthenticated(false);
        setStatus(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const credentials: AuthCredentials = {
    email,
    password,
  };

  async function handleRegister() {
    setIsLoading(true);
    setStatus("Registering...");

    try {
      await register(credentials);
      setStatus("Registered. You can log in now.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin() {
    setIsLoading(true);
    setStatus("Logging in...");

    try {
      const token = await login(credentials);

      saveToken(token);
      await getCurrentUser(token);
      setIsAuthenticated(true);
      setStatus("Logged in");
    } catch (error) {
      clearToken();
      setIsAuthenticated(false);
      setStatus(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-800 text-gray-300 font-sans">
        Opening dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-800 text-gray-50 font-sans">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-orange-600 mb-2">
              Modumind
            </h1>
            <p className="text-gray-400 text-sm">
              NUS Module Management Platform
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-8 shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-50 mb-6 text-center">
              Login
            </h2>
            <LoginForm
              email={email}
              password={password}
              isLoading={isLoading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onLogin={handleLogin}
              onRegister={handleRegister}
            />
            {status && (
              <p
                className={`text-center text-[0.65rem] mt-4 ${status.includes("failed") || status.includes("Error") ? "text-red-400" : "text-gray-300"}`}
              >
                {status}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
