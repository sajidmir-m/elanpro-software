import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DesktopTitleBar } from '@/components/desktop-title-bar';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider, ProtectedRoute } from '@/lib/auth';
import { AppLayout } from '@/components/layout';

import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import ActiveTickets from '@/pages/active-tickets';
import CallAge from '@/pages/call-age';
import ClosedTickets from '@/pages/closed-tickets';
import ProductFailure from '@/pages/reports/product-failure';
import ComponentFailure from '@/pages/reports/component-failure';
import WarrantyAnalysis from '@/pages/reports/warranty';
import SalesComplaint from '@/pages/reports/sales-complaint';
import TatAnalysis from '@/pages/reports/tat';
import MrfAnalysis from '@/pages/reports/mrf';
import Schedules from '@/pages/schedules';
import Uploads from '@/pages/uploads';
import Users from '@/pages/users';
import Settings from '@/pages/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/active-tickets" component={() => <ProtectedRoute allowedRoles={['admin', 'manager', 'ash', 'rsh', 'service_partner']}><ActiveTickets /></ProtectedRoute>} />
        <Route path="/call-age" component={() => <ProtectedRoute allowedRoles={['admin', 'manager', 'ash', 'rsh', 'service_partner']}><CallAge /></ProtectedRoute>} />
        <Route path="/closed-tickets" component={() => <ProtectedRoute allowedRoles={['admin', 'manager', 'ash', 'rsh', 'service_partner']}><ClosedTickets /></ProtectedRoute>} />
        
        {/* Reports */}
        <Route path="/reports/product-failure" component={() => <ProtectedRoute allowedRoles={['admin', 'manager', 'ash', 'rsh']}><ProductFailure /></ProtectedRoute>} />
        <Route path="/reports/component-failure" component={() => <ProtectedRoute allowedRoles={['admin', 'manager', 'ash', 'rsh']}><ComponentFailure /></ProtectedRoute>} />
        <Route path="/reports/warranty" component={() => <ProtectedRoute allowedRoles={['admin', 'manager', 'ash', 'rsh']}><WarrantyAnalysis /></ProtectedRoute>} />
        <Route path="/reports/sales-complaint" component={() => <ProtectedRoute allowedRoles={['admin', 'manager', 'ash', 'rsh']}><SalesComplaint /></ProtectedRoute>} />
        <Route path="/reports/tat" component={() => <ProtectedRoute allowedRoles={['admin', 'manager', 'ash', 'rsh', 'service_partner']}><TatAnalysis /></ProtectedRoute>} />
        <Route path="/reports/mrf" component={() => <ProtectedRoute allowedRoles={['admin', 'manager', 'ash', 'rsh', 'service_partner']}><MrfAnalysis /></ProtectedRoute>} />
        
        {/* Management */}
        <Route path="/schedules" component={() => <ProtectedRoute allowedRoles={['admin', 'manager']}><Schedules /></ProtectedRoute>} />
        <Route path="/uploads" component={() => <ProtectedRoute allowedRoles={['admin', 'manager']}><Uploads /></ProtectedRoute>} />
        <Route path="/users" component={() => <ProtectedRoute allowedRoles={['admin', 'manager']}><Users /></ProtectedRoute>} />
        <Route path="/settings" component={() => <ProtectedRoute><Settings /></ProtectedRoute>} />
        
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route component={ProtectedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          <DesktopTitleBar />
          <div className="flex-1 min-h-0">
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <AuthProvider>
                <Router />
              </AuthProvider>
            </WouterRouter>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
