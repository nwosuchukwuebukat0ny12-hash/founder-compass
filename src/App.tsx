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
const EventsPage = lazy(() => import("./pages/EventsPage"));

const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

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
                  <DashboardLayout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Routes>
                        <Route path="/" element={<OverviewPage />} />
                        <Route path="/startups" element={<StartupsPage />} />
                        <Route path="/startups/:id" element={<StartupDetailPage />} />
                        <Route path="/founder-portal" element={<FounderPortalPage />} />
                        <Route path="/events" element={<EventsPage />} />
                        <Route path="/documents" element={<DocumentsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </DashboardLayout>
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
