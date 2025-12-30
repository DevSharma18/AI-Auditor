import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import ModelManager from "@/pages/model-manager";
import Audits from "@/pages/audits";
import Settings from "@/pages/settings";
import DriftAnalytics from "@/pages/analytics/drift";
import BiasAnalytics from "@/pages/analytics/bias";
import HallucinationAnalytics from "@/pages/analytics/hallucination";
import PIIAnalytics from "@/pages/analytics/pii";
import ComplianceAnalytics from "@/pages/analytics/compliance";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/model-manager" component={ModelManager} />
      <Route path="/audits" component={Audits} />
      <Route path="/settings" component={Settings} />
      <Route path="/drift" component={DriftAnalytics} />
      <Route path="/bias" component={BiasAnalytics} />
      <Route path="/hallucination" component={HallucinationAnalytics} />
      <Route path="/pii" component={PIIAnalytics} />
      <Route path="/compliance" component={ComplianceAnalytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ai-auditor-theme">
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <SidebarInset className="flex flex-col flex-1">
                <header className="flex items-center justify-between gap-2 h-14 px-4 border-b border-border bg-background sticky top-0 z-50">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto bg-background">
                  <Router />
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
