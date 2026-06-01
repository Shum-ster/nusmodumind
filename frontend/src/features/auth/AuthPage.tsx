"use client";

import { useCallback, useEffect, useState } from "react";
import { LoginForm } from "./components/LoginForm";
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
    <main className="block">
      <h1 className="block">Login</h1>
      <LoginForm
        email={email}
        password={password}
        isLoading={isLoading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      <p className="block">{status}</p>
    </main>
  );
}
