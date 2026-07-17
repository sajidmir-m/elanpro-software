import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Users,
  Upload,
  CalendarDays,
  BarChart3,
  LogOut,
  Wrench,
  Activity,
  BoxSelect,
  Percent,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { user, logoutContext } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { state } = useSidebar();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logoutContext();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    setLocation("/login");
  };

  if (!user) return null;

  const role = user.role;
  const permissions = user.permissions || [];
  
  const canAccess = (section: string) => {
    if (role === 'admin') return true;
    return permissions.includes(section);
  };

  const navItems = [
    {
      group: "Operations",
      items: [
        { label: "Dashboard", href: "/", icon: LayoutDashboard, show: true },
        { label: "Live Operations", href: "/active-tickets", icon: Ticket, show: canAccess('active_tickets') },
        { label: "Call Age", href: "/call-age", icon: Clock, show: canAccess('active_tickets') },
        { label: "Closure Analytics", href: "/closed-tickets", icon: CheckCircle2, show: canAccess('closed_tickets') },
      ],
    },
    {
      group: "Analysis Reports",
      items: [
        { label: "Product Failure", href: "/reports/product-failure", icon: AlertTriangle, show: canAccess('product_failure') },
        { label: "Parts & Consumption", href: "/reports/component-failure", icon: Wrench, show: canAccess('component_failure') },
        { label: "Warranty Analysis", href: "/reports/warranty", icon: Percent, show: canAccess('warranty') },
        { label: "Sales vs Complaint", href: "/reports/sales-complaint", icon: Activity, show: canAccess('sales_complaint') },
        { label: "TAT Deep-dive", href: "/reports/tat", icon: BarChart3, show: canAccess('tat_analysis') },
        { label: "Parts & MRF", href: "/reports/mrf", icon: BoxSelect, show: canAccess('mrf_analysis') },
      ],
    },
    {
      group: "Management",
      items: [
        { label: "Schedules", href: "/schedules", icon: CalendarDays, show: canAccess('schedules') },
        { label: "Data Uploads", href: "/uploads", icon: Upload, show: role === 'admin' || role === 'manager' },
        { label: "Users", href: "/users", icon: Users, show: role === 'admin' || role === 'manager' },
        { label: "Settings", href: "/settings", icon: Settings, show: true },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded flex items-center justify-center">
            <Activity className="size-5" />
          </div>
          {state === "expanded" && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight">ELANPRO</span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 font-mono">Service Ops</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {navItems.map((group, i) => {
          const visibleItems = group.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={i}>
              <SidebarGroupLabel className="text-[10px] font-mono tracking-widest text-sidebar-foreground/50 uppercase">
                {group.group}
              </SidebarGroupLabel>
              <SidebarMenu>
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))}
                      tooltip={item.label}
                    >
                      <Link href={item.href} className="flex items-center gap-2">
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {state === "expanded" && (
          <div className="mb-4">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60 font-mono">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn("w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground", state === "collapsed" && "justify-center px-0")}
          onClick={handleLogout}
        >
          <LogOut className="size-4 mr-2" />
          {state === "expanded" && "Log out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-sm text-muted-foreground font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <>{children}</>;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground selection:bg-primary/20">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 border-b bg-card/50 backdrop-blur shrink-0 flex items-center px-4 sticky top-0 z-10">
            <SidebarTrigger />
          </header>
          <div className="flex-1 overflow-auto p-6 lg:p-8">
            <div className="mx-auto max-w-7xl w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
