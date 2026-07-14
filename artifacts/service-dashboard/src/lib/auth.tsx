import { createContext, useContext, useEffect, useState } from 'react';
import { useGetMe, User } from '@workspace/api-client-react';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginContext: (user: User) => void;
  logoutContext: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  loginContext: () => {},
  logoutContext: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [, setLocation] = useLocation();
  const [localUser, setLocalUser] = useState<User | null>(null);

  const { data: user, isLoading: queryLoading, error } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  });

  useEffect(() => {
    if (user) {
      setLocalUser(user);
    }
  }, [user]);

  const loginContext = (newUser: User) => setLocalUser(newUser);
  const logoutContext = () => setLocalUser(null);

  const isLoading = queryLoading && !localUser && !error;
  const isAuthenticated = !!localUser;

  return (
    <AuthContext.Provider value={{ user: localUser, isLoading, isAuthenticated, loginContext, logoutContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== '/login') {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-sm text-muted-foreground font-mono">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center">
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
};
