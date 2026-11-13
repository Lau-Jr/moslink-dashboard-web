import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLogin } from "@/api/hooks";
import { Notice, Spinner } from "@/components/ui";

export function LoginPage() {
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ username, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6 shadow-pop">
        <div className="flex flex-col items-center gap-2 pb-2 text-center">
          <img src="/logo.png" alt="" className="h-14 w-14 rounded-xl object-contain" />
          <h1 className="text-xl font-bold tracking-wide">MOSLINK Admin</h1>
          <p className="text-sm text-muted">Sign in to manage your hotspot sites</p>
        </div>
        {login.error && <Notice kind="error">{(login.error as Error).message}</Notice>}
        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input id="username" className="input" autoComplete="username" autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
          {login.isPending ? <Spinner /> : <LogIn className="h-4 w-4" />}
          Sign in
        </button>
      </form>
    </div>
  );
}
