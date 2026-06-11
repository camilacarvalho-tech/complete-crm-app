import logo from "../../../assets/LOGO RECOMECE.png";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../firebase";

interface LoginProps {
  onLogin: () => void;
}

function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );

      onLogin();
    } catch (error: any) {
      console.error(error);
      alert(error.code || "Erro ao fazer login");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-96"
      >
        <div className="flex flex-col items-center mb-6">
          <img
            src={logo}
            alt="Recomece Cred"
            className="w-32 mb-4"
          />

          <h1 className="text-2xl font-bold text-center">
            Login CRM
          </h1>
        </div>

        <input
          type="email"
          placeholder="Seu email"
          className="w-full border p-3 rounded mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Sua senha"
          className="w-full border p-3 rounded mb-4"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

export default Login;