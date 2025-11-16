export default function LoginPage() {
  const backend = import.meta.env.VITE_BACKEND_URL;

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-2xl font-bold mb-4">
        使用 LINE 登入以查看記帳 Dashboard
      </h1>

      <button
        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl text-lg shadow-lg"
        onClick={() => {
          window.location.href = `${backend}/auth/line/login`;
        }}
      >
        使用 LINE 登入
      </button>
    </div>
  );
}
