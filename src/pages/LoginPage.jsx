import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../services/authService";

export default function LoginPage() {
  const { user, saveSession } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await login(email, password);
      saveSession(session);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No fue posible iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border border-white/50 bg-white/80 shadow-2xl shadow-sky-100 backdrop-blur">
        <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Acceso</p>
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">Bienvenido</h1>
            <p className="text-sm text-slate-500">Usa el usuario admin sembrado para entrar.</p>
          </div>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onValueChange={setEmail}
              variant="bordered"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onValueChange={setPassword}
              variant="bordered"
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button color="primary" type="submit" isLoading={loading}>
              Ingresar
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
