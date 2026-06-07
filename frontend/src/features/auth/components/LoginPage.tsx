import type { FormEvent } from "react";
import { LoginButton } from "./LoginButton";

type LoginFormProps = {
  email: string;
  password: string;
  isLoading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onLogin: () => void;
  onRegister: () => void;
};

export function LoginForm({
  email,
  password,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onRegister,
}: LoginFormProps) {
  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLogin();
  }

  return (
    <form className="flex flex-col h-full" onSubmit={submitLogin}>
      <div className="flex-1 space-y-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">
            Email
          </label>
          <input
            className="w-full bg-gray-600 border border-gray-500 text-gray-50 px-4 py-3 rounded-lg focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">
            Password
          </label>
          <input
            className="w-full bg-gray-600 border border-gray-500 text-gray-50 px-4 py-3 rounded-lg focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            minLength={6}
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-3">
        <LoginButton onClick={onLogin} disabled={isLoading} isLogin={true} />
        <LoginButton onClick={onRegister} disabled={isLoading} isLogin={false} />
        <p className="text-center text-[0.65rem] text-gray-500 mt-2">* Login or register to continue</p>
      </div>
    </form>
  );
}
