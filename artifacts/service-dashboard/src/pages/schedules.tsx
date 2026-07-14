import { useState } from "react";
import { 
  useListSchedules, 
  useCreateSchedule, 
  useUpdateSchedule, 
  useDeleteSchedule,
  useGetFilterOptions,
  getListSchedulesQueryKey,
  Schedule,
  ScheduleInputFrequency,
  ScheduleUpdateFrequency
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarDays, Plus, MoreHorizontal, Pencil, Trash2, Clock, Send, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const REPORT_TYPES = [
  { id: "dashboard_summary", label: "Dashboard Summary" },
  { id: "active_tickets", label: "Active Tickets" },
  { id: "closed_tickets", label: "Closed Tickets" },
  { id: "product_failure", label: "Product Failure Report" },
  { id: "component_failure", label: "Component Failure Report" },
  { id: "warranty", label: "Warranty Analysis" },
  { id: "sales_complaint", label: "Sales vs Complaint" },
  { id: "tat_analysis", label: "TAT Analysis" },
  { id: "mrf_analysis", label: "MRF Analysis" },
];

const AUDIENCES = [
  { id: "management", label: "Management" },
  { id: "rsh", label: "Regional Service Heads (RSH)" },
  { id: "ash", label: "Area Service Heads (ASH)" },
  { id: "service_partner", label: "Service Partners" },
];

const scheduleSchema = z.object({
  name: z.string().min(2, "Name is required"),
  reportTypes: z.array(z.string()).min(1, "Select at least one report type"),
  frequency: z.enum(["daily", "weekly", "monthly", "custom"]),
  weekDay: z.coerce.number().min(0).max(6).optional().nullable(),
  monthDay: z.coerce.number().min(1).max(31).optional().nullable(),
  customCron: z.string().optional().nullable(),
  audiences: z.array(z.enum(["service_partner", "ash", "rsh", "management"])).min(1, "Select at least one audience"),
  productCategories: z.array(z.string()).default([]),
  filters: z.object({
    dateRangeDays: z.coerce.number().optional().nullable(),
    servicePartner: z.string().optional().nullable(),
    ash: z.string().optional().nullable(),
    rsh: z.string().optional().nullable(),
  }).optional(),
  isActive: z.boolean().default(true),
});

export default function Schedules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const { data: schedules, isLoading } = useListSchedules({
    query: { queryKey: getListSchedulesQueryKey() }
  });

  const { data: options } = useGetFilterOptions();

  const createMutation = useCreateSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
        toast({ title: "Schedule created successfully" });
        setIsCreateOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create schedule", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const updateMutation = useUpdateSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
        toast({ title: "Schedule updated successfully" });
        setEditingSchedule(null);
      },
      onError: (err: any) => {
        toast({ title: "Failed to update schedule", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeleteSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
        toast({ title: "Schedule deleted" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete schedule", description: err.error?.error || "Unknown error", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof scheduleSchema>>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      name: "",
      reportTypes: [],
      frequency: "daily",
      audiences: [],
      productCategories: [],
      filters: {},
      isActive: true,
    },
  });

  const watchFrequency = form.watch("frequency");

  const openEdit = (s: Schedule) => {
    setEditingSchedule(s);
    form.reset({
      name: s.name,
      reportTypes: s.reportTypes,
      frequency: s.frequency as any,
      weekDay: s.weekDay,
      monthDay: s.monthDay,
      customCron: s.customCron,
      audiences: s.audiences as any,
      productCategories: s.productCategories || [],
      filters: s.filters || {},
      isActive: s.isActive,
    });
  };

  const onSubmit = (data: z.infer<typeof scheduleSchema>) => {
    if (editingSchedule) {
      updateMutation.mutate({ 
        id: editingSchedule.id, 
        data: {
          ...data,
          frequency: data.frequency as ScheduleUpdateFrequency,
        } 
      });
    } else {
      createMutation.mutate({ 
        data: {
          ...data,
          frequency: data.frequency as ScheduleInputFrequency,
        } 
      });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatFrequency = (s: Schedule) => {
    switch (s.frequency) {
      case "daily": return "Daily";
      case "weekly": return `Weekly (Day ${s.weekDay})`;
      case "monthly": return `Monthly (Date ${s.monthDay})`;
      case "custom": return `Cron: ${s.customCron}`;
      default: return s.frequency;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Report Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure automated data exports and distribution.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (open) form.reset({ name: "", reportTypes: [], frequency: "daily", audiences: [], productCategories: [], filters: {}, isActive: true });
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure Report Schedule</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Schedule Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Daily Management Summary" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-2 border rounded-md p-4 bg-muted/20">
                    <FormLabel className="text-sm font-medium mb-3 block">Reports to Include</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {REPORT_TYPES.map((type) => (
                        <FormField
                          key={type.id}
                          control={form.control}
                          name="reportTypes"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), type.id])
                                      : field.onChange((field.value || []).filter((value) => value !== type.id))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-xs">{type.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    {form.formState.errors.reportTypes && (
                      <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.reportTypes.message}</p>
                    )}
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="custom">Custom (Cron)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchFrequency === "weekly" && (
                      <FormField
                        control={form.control}
                        name="weekDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Week (0-6, 0=Sun)</FormLabel>
                            <FormControl><Input type="number" min={0} max={6} {...field} value={field.value || ""} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {watchFrequency === "monthly" && (
                      <FormField
                        control={form.control}
                        name="monthDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Month (1-31)</FormLabel>
                            <FormControl><Input type="number" min={1} max={31} {...field} value={field.value || ""} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {watchFrequency === "custom" && (
                      <FormField
                        control={form.control}
                        name="customCron"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cron Expression</FormLabel>
                            <FormControl><Input placeholder="0 0 * * *" {...field} value={field.value || ""} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="col-span-2 border rounded-md p-4 bg-muted/20">
                    <FormLabel className="text-sm font-medium mb-3 block">Target Audiences</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      {AUDIENCES.map((audience) => (
                        <FormField
                          key={audience.id}
                          control={form.control}
                          name="audiences"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(audience.id as any)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), audience.id])
                                      : field.onChange((field.value || []).filter((value) => value !== audience.id))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-xs">{audience.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    {form.formState.errors.audiences && (
                      <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.audiences.message}</p>
                    )}
                  </div>

                  <div className="col-span-2 border rounded-md p-4 bg-muted/20">
                    <FormLabel className="text-sm font-medium mb-3 block">Data Filters</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="filters.dateRangeDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Lookback Days (e.g. 7)</FormLabel>
                            <FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {options && (
                        <FormField
                          control={form.control}
                          name="productCategories"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Categories</FormLabel>
                              <Select 
                                onValueChange={(val) => {
                                  if (val && !field.value.includes(val)) {
                                    field.onChange([...field.value, val]);
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Add category filter..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {options.categories.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {field.value.map(cat => (
                                  <Badge key={cat} variant="secondary" className="text-[10px]">
                                    {cat}
                                    <button 
                                      type="button" 
                                      className="ml-1 hover:text-destructive"
                                      onClick={() => field.onChange(field.value.filter(c => c !== cat))}
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Save Schedule"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-medium text-sm">Schedule Status</h4>
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

              {/* Exact same form fields as create, omitted for brevity but they are rendered via the same structure */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Schedule Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 border rounded-md p-4 bg-muted/20">
                  <FormLabel className="text-sm font-medium mb-3 block">Reports to Include</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {REPORT_TYPES.map((type) => (
                      <FormField
                        key={type.id}
                        control={form.control}
                        name="reportTypes"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(type.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), type.id])
                                    : field.onChange((field.value || []).filter((value) => value !== type.id))
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-xs">{type.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="custom">Custom (Cron)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchFrequency === "custom" && (
                    <FormField
                      control={form.control}
                      name="customCron"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cron Expression</FormLabel>
                          <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="col-span-2 border rounded-md p-4 bg-muted/20">
                  <FormLabel className="text-sm font-medium mb-3 block">Target Audiences</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {AUDIENCES.map((audience) => (
                      <FormField
                        key={audience.id}
                        control={form.control}
                        name="audiences"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(audience.id as any)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), audience.id])
                                    : field.onChange((field.value || []).filter((value) => value !== audience.id))
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-xs">{audience.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingSchedule(null)}>Cancel</Button>
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
      ) : schedules ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedules.length === 0 ? (
            <Card className="col-span-full p-8 text-center border-dashed">
              <CalendarDays className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No schedules configured</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1 mb-4">
                Automate your reporting workflow by creating schedules that distribute data to the right people.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} variant="outline">Create your first schedule</Button>
            </Card>
          ) : (
            schedules.map((schedule) => (
              <Card key={schedule.id} className={`overflow-hidden transition-colors ${!schedule.isActive ? 'opacity-60 bg-muted/30' : ''}`}>
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${schedule.isActive ? 'bg-chart-3' : 'bg-muted-foreground'}`} />
                        <CardTitle className="text-base">{schedule.name}</CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-1 font-mono text-[10px] uppercase">
                        <Clock className="size-3" />
                        {formatFrequency(schedule)}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(schedule)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Schedule
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => handleDelete(schedule.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="size-3" /> Reports
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {schedule.reportTypes.slice(0, 4).map(r => (
                        <Badge key={r} variant="secondary" className="text-[10px] font-normal">{REPORT_TYPES.find(t => t.id === r)?.label || r}</Badge>
                      ))}
                      {schedule.reportTypes.length > 4 && (
                        <Badge variant="outline" className="text-[10px] font-normal">+{schedule.reportTypes.length - 4}</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Send className="size-3" /> Audiences
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {schedule.audiences.map(a => (
                        <Badge key={a} variant="outline" className="text-[10px] font-normal uppercase tracking-wider">{a.replace('_', ' ')}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground pt-4 border-t flex justify-between">
                    <span>Last run: {schedule.lastRunAt ? format(new Date(schedule.lastRunAt), "MMM d, HH:mm") : "Never"}</span>
                    <span>Next: {schedule.nextRunAt ? format(new Date(schedule.nextRunAt), "MMM d, HH:mm") : "-"}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
