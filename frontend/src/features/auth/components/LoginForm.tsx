import type { FormEvent } from "react";

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
    <form className="block" onSubmit={submitLogin}>
      <p className="block">
        <label className="inline" htmlFor="email">
          Email
        </label>
        <br />
        <input
          className="inline-block border border-gray-400 bg-white px-1"
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          required
        />
      </p>

      <p className="block">
        <label className="inline" htmlFor="password">
          Password
        </label>
        <br />
        <input
          className="inline-block border border-gray-400 bg-white px-1"
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          minLength={6}
          required
        />
      </p>

      <p className="block">
        <button
          className="inline-block border border-gray-400 bg-gray-100 px-2"
          type="submit"
          disabled={isLoading}
        >
          Login
        </button>{" "}
        <button
          className="inline-block border border-gray-400 bg-gray-100 px-2"
          type="button"
          onClick={onRegister}
          disabled={isLoading}
        >
          Register
        </button>
      </p>
    </form>
  );
}
