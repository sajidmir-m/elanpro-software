import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Activity } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { loginContext } = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        loginContext(data.user);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Welcome back", description: "Successfully logged in." });
        setLocation("/");
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: err.error?.error || "Invalid credentials",
        });
      },
    },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data });
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground p-3 rounded-lg inline-flex items-center justify-center mb-4">
              <Activity className="size-8" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">ELANPRO Operations</h2>
            <p className="mt-2 text-sm text-muted-foreground font-mono uppercase tracking-widest">
              Service Command Center
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Email address</Label>
                      <FormControl>
                        <Input placeholder="name@elanpro.net" {...field} className="font-mono text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Password</Label>
                      <FormControl>
                        <Input type="password" {...field} className="font-mono text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Authenticating..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/40"></div>
        <div className="relative z-10 flex flex-col justify-end p-12 text-primary-foreground w-full">
          <blockquote className="space-y-2 max-w-xl">
            <p className="text-lg font-medium leading-relaxed">
              "Efficiency in service operations translates directly to equipment reliability. 
              Our command center ensures every field ticket is tracked, analyzed, and resolved 
              with absolute precision."
            </p>
            <footer className="text-sm font-mono text-primary-foreground/70">
              — Service Operations Protocol
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
