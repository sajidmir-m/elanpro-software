import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
  User,
  UserInputRole,
  UserUpdateRole,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEPARTMENTS = [
  "Operations",
  "Service",
  "Technical",
  "Sales",
  "Logistics",
  "Quality",
  "Administration",
] as const;

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
  password: z.string().optional(),
  role: z.enum(["admin", "manager", "employee", "ash", "rsh", "service_partner"]),
  department: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean(),
  permissions: z.array(z.string()),
});

function canManageUser(current: User, target: User): boolean {
  if (current.id === target.id) return false;
  if (current.role === "admin") return target.role !== "admin";
  if (current.role === "manager") {
    return target.role === "employee" && target.managerId === current.id;
  }
  return false;
}

function defaultCreateValues(current: User | null) {
  const isAdmin = current?.role === "admin";
  return {
    name: "",
    email: "",
    password: "",
    role: (isAdmin ? "manager" : "employee") as "manager" | "employee",
    department: isAdmin ? "" : (current?.department ?? ""),
    managerId: null,
    isActive: true,
    permissions: [],
  };
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey(), enabled: isAdmin || isManager },
  });

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: isAdmin ? "Manager created" : "Employee created" });
        setIsCreateOpen(false);
      },
      onError: (err: { error?: { error?: string } }) => {
        toast({
          title: "Failed to create user",
          description: err.error?.error || "Unknown error",
          variant: "destructive",
        });
      },
    },
  });

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User updated successfully" });
        setEditingUser(null);
      },
      onError: (err: { error?: { error?: string } }) => {
        toast({
          title: "Failed to update user",
          description: err.error?.error || "Unknown error",
          variant: "destructive",
        });
      },
    },
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User deleted" });
      },
      onError: (err: { error?: { error?: string } }) => {
        toast({
          title: "Failed to delete user",
          description: err.error?.error || "Unknown error",
          variant: "destructive",
        });
      },
    },
  });

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: defaultCreateValues(currentUser),
  });

  const openEdit = (u: User) => {
    setEditingUser(u);
    form.reset({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role as z.infer<typeof userSchema>["role"],
      department: u.department ?? "",
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
          department: data.department || null,
          managerId: data.managerId,
          permissions: data.permissions,
        },
      });
    } else {
      if (!data.password) {
        form.setError("password", { message: "Password is required for new users" });
        return;
      }
      if (isAdmin && !data.department) {
        form.setError("department", { message: "Department is required for managers" });
        return;
      }
      createMutation.mutate({
        data: {
          name: data.name,
          email: data.email,
          password: data.password,
          role: (isAdmin ? "manager" : "employee") as UserInputRole,
          department: isAdmin ? data.department : currentUser?.department,
          managerId: isManager ? currentUser?.id : null,
          permissions: data.permissions,
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  };

  const createLabel = isAdmin ? "Add Department Manager" : "Add Employee";
  const pageSubtitle = isAdmin
    ? "Create managers for each department. Managers can then add employees to their team."
    : `Manage employees in the ${currentUser?.department ?? "your"} department.`;

  const UserFormFields = ({ isEdit }: { isEdit: boolean }) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
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
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isEdit && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormItem>
          <FormLabel>Role</FormLabel>
          <FormControl>
            <Input
              value={isAdmin ? "Department Manager" : "Employee"}
              disabled
              className="bg-muted"
            />
          </FormControl>
          <FormDescription className="text-xs">
            {isAdmin
              ? "Admins create managers who lead a department."
              : "Managers create employees in their department."}
          </FormDescription>
        </FormItem>
        {isAdmin ? (
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormItem>
            <FormLabel>Department</FormLabel>
            <FormControl>
              <Input value={currentUser?.department ?? ""} disabled className="bg-muted" />
            </FormControl>
            <FormDescription className="text-xs">Inherited from your manager profile.</FormDescription>
          </FormItem>
        )}
      </div>

      <div className="border rounded-md p-4 bg-muted/20">
        <FormLabel className="text-sm font-medium mb-3 block">Dashboard Access Permissions</FormLabel>
        <div className="grid grid-cols-2 gap-3">
          {SECTIONS.map((section) => (
            <FormField
              key={section.id}
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value?.includes(section.id)}
                      onCheckedChange={(checked) =>
                        checked
                          ? field.onChange([...(field.value || []), section.id])
                          : field.onChange((field.value || []).filter((v) => v !== section.id))
                      }
                    />
                  </FormControl>
                  <FormLabel className="font-normal text-xs">{section.label}</FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{pageSubtitle}</p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) form.reset(defaultCreateValues(currentUser));
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {createLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{createLabel}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <UserFormFields isEdit={false} />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create"}
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
                      <FormLabel className="font-mono text-xs">
                        {field.value ? "ACTIVE" : "INACTIVE"}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <UserFormFields isEdit={true} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
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
                <TableHead className="w-[220px]">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
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
                    <Badge
                      variant={
                        u.role === "admin"
                          ? "default"
                          : u.role === "manager"
                            ? "secondary"
                            : "outline"
                      }
                      className="uppercase text-[10px] tracking-wider font-mono"
                    >
                      {u.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{u.department ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${u.isActive ? "bg-chart-3" : "bg-destructive"}`}
                      />
                      <span className="text-xs font-medium">{u.isActive ? "Active" : "Disabled"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {u.role === "admin" ? (
                      <span className="text-xs text-muted-foreground italic">Full Access</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.permissions?.slice(0, 2).map((p) => (
                          <span
                            key={p}
                            className="text-[10px] bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded-sm"
                          >
                            {SECTIONS.find((s) => s.id === p)?.label || p}
                          </span>
                        ))}
                        {(u.permissions?.length || 0) > 2 && (
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                            +{u.permissions!.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {currentUser && canManageUser(currentUser, u) ? (
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10"
                            onClick={() => handleDelete(u.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
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
