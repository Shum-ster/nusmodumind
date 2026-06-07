"use client";

import { useCallback, useEffect, useState } from "react";
import { LoginForm } from "./components/LoginPage";
import { MainAppPage } from "./components/MainAppPage";
import { getCurrentUser, login, register } from "./lib/auth-api";
import { clearToken, getToken, saveToken } from "./lib/token-storage";
import type { AuthCredentials } from "./types";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Checking saved login...");

  const verifyToken = useCallback(async (token: string) => {
    await getCurrentUser(token);
    setIsAuthenticated(true);
    setStatus("Logged in");
  }, []);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setStatus("Not logged in");
      setIsLoading(false);
      return;
    }

    verifyToken(token)
      .catch((error: Error) => {
        clearToken();
        setIsAuthenticated(false);
        setStatus(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [verifyToken]);

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
      await verifyToken(token);
    } catch (error) {
      clearToken();
      setIsAuthenticated(false);
      setStatus(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setIsAuthenticated(false);
    setStatus("Logged out");
  }

  if (isAuthenticated) {
    return <MainAppPage status={status} onLogout={handleLogout} />;
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
