type MainAppPageProps = {
  status: string;
  onLogout: () => void;
};

export function MainAppPage({ status, onLogout }: MainAppPageProps) {
  return (
    <main className="block">
      <h1 className="block">Main</h1>
      <p className="block">{status}</p>
      <p className="block">
        <button
          className="inline-block border border-gray-400 bg-gray-100 px-2"
          type="button"
          onClick={onLogout}
        >
          Logout
        </button>
      </p>
    </main>
  );
}
