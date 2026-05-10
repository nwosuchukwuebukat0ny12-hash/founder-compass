import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const StartupsPage = lazy(() => import("./pages/StartupsPage"));
const StartupDetailPage = lazy(() => import("./pages/StartupDetailPage"));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FounderPortalPage = lazy(() => import("./pages/FounderPortalPage"));
const FounderTargetsPage = lazy(() => import("./pages/FounderTargetsPage"));
const FounderFinancialsPage = lazy(() => import("./pages/FounderFinancialsPage"));
const FounderProfilePage = lazy(() => import("./pages/FounderProfilePage"));
const FounderDocumentsPage = lazy(() => import("./pages/FounderDocumentsPage"));
const FounderUpdatesPage = lazy(() => import("./pages/FounderUpdatesPage"));
const FounderEventsPage = lazy(() => import("./pages/FounderEventsPage"));
const CustomMetricsPage = lazy(() => import("./pages/CustomMetricsPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const GradingSystemPage = lazy(() => import("./pages/GradingSystemPage"));
const UpdatesHistoryPage = lazy(() => import("./pages/UpdatesHistoryPage"));

const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { FounderLayout } from "@/components/FounderLayout";

const FounderOnboardingPage = lazy(() => import("./pages/FounderOnboardingPage"));

const FounderTeamPage = lazy(() => import("./pages/FounderTeamPage"));

const RoleRouter = () => {
  const { user } = useAuth();
  
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) return <LoadingScreen />;

  const role = profile?.role;
  const hasStartup = !!profile?.startup_id;

  if (role === 'admin') {
    return (
      <DashboardLayout>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/startups" element={<StartupsPage />} />
            <Route path="/startups/:id" element={<StartupDetailPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/grading" element={<GradingSystemPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    );
  }

  // If they are a founder but haven't finished onboarding, send them to onboarding
  if (role === 'founder' && hasStartup) {
    return (
      <FounderLayout>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<FounderPortalPage />} />
            <Route path="/targets" element={<FounderTargetsPage />} />
            <Route path="/financials" element={<FounderFinancialsPage />} />
            <Route path="/profile" element={<FounderProfilePage />} />
            <Route path="/documents" element={<FounderDocumentsPage />} />
            <Route path="/updates" element={<FounderUpdatesPage />} />
            <Route path="/history" element={<UpdatesHistoryPage />} />
            <Route path="/custom-metrics" element={<CustomMetricsPage />} />
            <Route path="/events" element={<FounderEventsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </FounderLayout>
    );
  }

  // No role or No startup (New user)
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/onboarding" element={<FounderOnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={
              <Suspense fallback={<LoadingScreen />}>
                <AuthPage />
              </Suspense>
            } />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <RoleRouter />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
