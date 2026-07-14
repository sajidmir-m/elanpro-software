import { useEffect, useState } from "react";
import { useGetFilterOptions } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export type FilterState = {
  dateRangeDays?: number | null;
  category?: string | null;
  product?: string | null;
  servicePartner?: string | null;
  ash?: string | null;
  rsh?: string | null;
  state?: string | null;
  ticketType?: string | null;
  warrantyType?: string | null;
};

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  showFields?: (keyof FilterState)[];
}

const DATE_RANGES = [
  { label: "Last 7 Days", value: "7" },
  { label: "Last 15 Days", value: "15" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 90 Days", value: "90" },
  { label: "Last 6 Months", value: "180" },
  { label: "Last 1 Year", value: "365" },
];

export function FilterPanel({ filters, onChange, showFields = ["dateRangeDays", "category", "product", "servicePartner", "ash", "rsh", "state"] }: FilterPanelProps) {
  const { data: options, isLoading } = useGetFilterOptions();
  
  const handleSelect = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value === "all" ? null : value === "date-all" ? null : key === 'dateRangeDays' ? parseInt(value) : value });
  };

  const clearFilters = () => {
    onChange({});
  };

  const activeCount = Object.values(filters).filter(v => v !== null && v !== undefined).length;

  if (isLoading) return <div className="h-10 bg-muted animate-pulse rounded-md w-full max-w-sm mb-6"></div>;
  if (!options) return null;

  return (
    <div className="mb-6 flex items-center gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="border-dashed h-9">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal lg:hidden">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium leading-none">Filter Data</h4>
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0 text-muted-foreground hover:text-foreground">
                  Reset
                </Button>
              )}
            </div>
            
            {showFields.includes("dateRangeDays") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Date Range</Label>
                <Select value={filters.dateRangeDays?.toString() || "date-all"} onValueChange={(v) => handleSelect("dateRangeDays", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-all">All Time</SelectItem>
                    {DATE_RANGES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showFields.includes("category") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={filters.category || "all"} onValueChange={(v) => handleSelect("category", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {options.categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showFields.includes("product") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Product</Label>
                <Select value={filters.product || "all"} onValueChange={(v) => handleSelect("product", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {options.products.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showFields.includes("servicePartner") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Service Partner</Label>
                <Select value={filters.servicePartner || "all"} onValueChange={(v) => handleSelect("servicePartner", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Partners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Partners</SelectItem>
                    {options.servicePartners.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {showFields.includes("ash") && (
              <div className="space-y-1.5">
                <Label className="text-xs">ASH</Label>
                <Select value={filters.ash || "all"} onValueChange={(v) => handleSelect("ash", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All ASH" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ASH</SelectItem>
                    {options.ashList.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showFields.includes("rsh") && (
              <div className="space-y-1.5">
                <Label className="text-xs">RSH</Label>
                <Select value={filters.rsh || "all"} onValueChange={(v) => handleSelect("rsh", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All RSH" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All RSH</SelectItem>
                    {options.rshList.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showFields.includes("state") && (
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Select value={filters.state || "all"} onValueChange={(v) => handleSelect("state", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {options.states.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {showFields.includes("ticketType") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Ticket Type</Label>
                <Select value={filters.ticketType || "all"} onValueChange={(v) => handleSelect("ticketType", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Ticket Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ticket Types</SelectItem>
                    {options.ticketTypes?.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showFields.includes("warrantyType") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Warranty Type</Label>
                <Select value={filters.warrantyType || "all"} onValueChange={(v) => handleSelect("warrantyType", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Warranty Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warranty Types</SelectItem>
                    {options.warrantyTypes?.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Active filters display */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(filters).map(([key, value]) => {
          if (value === null || value === undefined) return null;
          
          let displayValue = value;
          if (key === 'dateRangeDays') {
            displayValue = DATE_RANGES.find(r => r.value === String(value))?.label || value;
          }
          
          return (
            <Badge key={key} variant="secondary" className="px-2 py-0.5 h-7 rounded-sm flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider bg-card border">
              <span className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="font-medium text-foreground">{displayValue}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent hover:text-destructive"
                onClick={() => handleSelect(key as keyof FilterState, "all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
