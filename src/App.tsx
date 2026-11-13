import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useMe } from "@/api/hooks";
import { UNAUTHORIZED_EVENT } from "@/api/client";
import { Layout } from "@/components/Layout";
import { Spinner } from "@/components/ui";
import { LoginPage } from "@/features/auth/LoginPage";
import { OverviewPage } from "@/features/overview/OverviewPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { SessionsPage } from "@/features/sessions/SessionsPage";
import { SitesPage } from "@/features/sites/SitesPage";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { VouchersPage } from "@/features/vouchers/VouchersPage";

export default function App() {
  const qc = useQueryClient();
  const { data: user, isPending } = useMe();

  // Session expired mid-use: any 401 drops back to the login screen.
  useEffect(() => {
    const onUnauthorized = () => {
      qc.setQueryData(["me"], null); // shows the login page; data queries unmount with the layout
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [qc]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="vouchers" element={<VouchersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
