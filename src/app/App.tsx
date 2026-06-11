import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { RouterProvider } from "react-router-dom";

import { auth } from "../firebase";
import { router } from "./routes";

import Login from "./components/auth/Login";

function App() {

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
      auth,
      (usuario) => {

        setUser(usuario);
        setLoading(false);

      }
    );

    return () => unsubscribe();

  }, []);

  if (loading) {

    return (
      <div className="flex items-center justify-center h-screen">
        Carregando...
      </div>
    );

  }

  if (!user) {

    return (
      <Login onLogin={() => {}} />
    );

  }

  return (
    <RouterProvider router={router} />
  );
}

export default App;