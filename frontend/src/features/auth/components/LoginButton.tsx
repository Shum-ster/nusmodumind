type LoginButtonProps = {
  onClick: () => void;
  disabled: boolean;
  isLogin?: boolean;
};

export function LoginButton({ onClick, disabled, isLogin = true }: LoginButtonProps) {
  return (
    <button
      className="w-full bg-orange-600 text-white font-semibold py-3 rounded-lg hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors"
      onClick={onClick}
      disabled={disabled}
      type={isLogin ? "submit" : "button"}
    >
      {isLogin ? "Login" : "Register"}
    </button>
  );
}
