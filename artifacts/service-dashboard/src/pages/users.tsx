import { useState } from "react";
import { 
  useListUsers, 
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser,
  useUpdateUserPermissions,
  getListUsersQueryKey,
  User,
  UserInputRole,
  UserUpdateRole
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const SECTIONS = [
  { id: "active_tickets", label: "Active Tickets" },
  { id: "closed_tickets", label: "Closed Tickets" },
  { id: "product_failure", label: "Product Failure Report" },
  { id: "component_failure", label: "Component Failure Report" },
  { id: "warranty", label: "Warranty Analysis" },
  { id: "sales_complaint", label: "Sales vs Complaint" },
  { id: "tat_analysis", label: "TAT Analysis" },
  { id: "mrf_analysis", label: "MRF Analysis" },
  { id: "schedules", label: "Report Schedules" },
];

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(["admin", "manager", "ash", "rsh", "service_partner"]),
  managerId: z.coerce.number().optional().nullable(),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).default([]),
});

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User created successfully" });
        setIsCreateOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create user", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User updated successfully" });
        setEditingUser(null);
      },
      onError: (err: any) => {
        toast({ title: "Failed to update user", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User deleted" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete user", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "service_partner",
      managerId: null,
      isActive: true,
      permissions: [],
    },
  });

  const openEdit = (u: User) => {
    setEditingUser(u);
    form.reset({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role as any,
      managerId: u.managerId,
      isActive: u.isActive,
      permissions: u.permissions || [],
    });
  };

  const onSubmit = (data: z.infer<typeof userSchema>) => {
    if (editingUser) {
      updateMutation.mutate({ 
        id: editingUser.id, 
        data: {
          name: data.name,
          email: data.email,
          role: data.role as UserUpdateRole,
          isActive: data.isActive,
          managerId: data.managerId,
          permissions: data.permissions
        } 
      });
    } else {
      if (!data.password) {
        form.setError("password", { message: "Password is required for new users" });
        return;
      }
      createMutation.mutate({ 
        data: {
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role as UserInputRole,
          managerId: data.managerId,
          permissions: data.permissions
        } 
      });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage system access, roles, and dashboard permissions.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (open) form.reset({ name: "", email: "", password: "", role: "service_partner", managerId: null, isActive: true, permissions: [] });
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isAdmin && <SelectItem value="admin">Administrator</SelectItem>}
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="rsh">RSH</SelectItem>
                            <SelectItem value="ash">ASH</SelectItem>
                            <SelectItem value="service_partner">Service Partner</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="border rounded-md p-4 bg-muted/20">
                  <FormLabel className="text-sm font-medium mb-3 block">Dashboard Access Permissions</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {SECTIONS.map((section) => (
                      <FormField
                        key={section.id}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => {
                          return (
                            <FormItem key={section.id} className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(section.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), section.id])
                                      : field.onChange((field.value || []).filter((value) => value !== section.id))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-xs">{section.label}</FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div>
                  <h4 className="font-medium text-sm">Account Status</h4>
                  <p className="text-xs text-muted-foreground">Disable user to revoke access.</p>
                </div>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-mono text-xs">{field.value ? 'ACTIVE' : 'INACTIVE'}</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isAdmin && <SelectItem value="admin">Administrator</SelectItem>}
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="rsh">RSH</SelectItem>
                          <SelectItem value="ash">ASH</SelectItem>
                          <SelectItem value="service_partner">Service Partner</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border rounded-md p-4 bg-muted/20">
                <FormLabel className="text-sm font-medium mb-3 block">Dashboard Access Permissions</FormLabel>
                <div className="grid grid-cols-2 gap-3">
                  {SECTIONS.map((section) => (
                    <FormField
                      key={section.id}
                      control={form.control}
                      name="permissions"
                      render={({ field }) => {
                        return (
                          <FormItem key={section.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(section.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), section.id])
                                    : field.onChange((field.value || []).filter((value) => value !== section.id))
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-xs">{section.label}</FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Card>
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      ) : users ? (
        <Card className="overflow-hidden border-border shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[250px]">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="group hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{u.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : u.role === 'manager' ? 'secondary' : 'outline'} className="uppercase text-[10px] tracking-wider font-mono">
                      {u.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-chart-3' : 'bg-destructive'}`} />
                      <span className="text-xs font-medium">{u.isActive ? 'Active' : 'Disabled'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-muted-foreground italic">Full Access</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.permissions?.slice(0, 3).map(p => (
                          <span key={p} className="text-[10px] bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded-sm">
                            {SECTIONS.find(s => s.id === p)?.label || p}
                          </span>
                        ))}
                        {(u.permissions?.length || 0) > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                            +{u.permissions!.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Details
                        </DropdownMenuItem>
                        {currentUser?.id !== u.id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => handleDelete(u.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}
