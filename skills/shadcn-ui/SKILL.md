---
name: shadcn-ui
description: "shadcn/ui patterns for Next.js App Router — NOT a library, it's copy-paste components you OWN. Covers setup, cn() utility, cva variants, react-hook-form + zod forms, data tables with tanstack, command menus, dialogs, toasts, theming, dark mode, and building custom components. Use when: shadcn, forms, data table, command palette, dialog, toast, theme, dark mode, component variants."
---

# shadcn/ui — Senior Patterns

> shadcn/ui is **NOT** an npm component library. You run `npx shadcn add button` and the source is copied into `components/ui/`. You own it, you modify it.

Stack: **shadcn/ui · Next.js 15 App Router · Tailwind CSS v4 · react-hook-form · zod · @tanstack/react-table**

## 1. Setup

```bash
npx shadcn@latest init
```

`components.json` config:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsx": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

Add components:
```bash
npx shadcn@latest add button card form input label textarea select badge
npx shadcn@latest add dialog alert-dialog sheet drawer
npx shadcn@latest add table command sonner toast tabs
npx shadcn@latest add data-table  # if available, else build manually
```

## 2. cn() Utility

The `cn()` function merges Tailwind classes intelligently — later classes win, no conflicts.

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```tsx
// Usage — conditional classes, no conflicts
<div className={cn(
  "rounded-lg border p-4",
  isActive && "border-primary bg-primary/5",
  isDisabled && "opacity-50 cursor-not-allowed",
  className  // always allow override from parent
)} />

// Merges correctly (twMerge handles Tailwind conflicts)
cn("px-4 py-2", "p-6")      // → "p-6" (p-6 wins over px-4 py-2)
cn("text-red-500", "text-blue-500")  // → "text-blue-500"
```

## 3. Component Customization with cva

`cva` (class-variance-authority) creates type-safe variant systems. It's how shadcn components are built.

```tsx
// components/ui/button.tsx — customized with new variant
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // ← ADD NEW VARIANTS HERE
        gradient: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow hover:opacity-90",
        success: "bg-green-600 text-white shadow hover:bg-green-700",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        xl: "h-12 rounded-lg px-10 text-base",  // ← new size
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"
export { Button, buttonVariants }
```

## 4. Form Patterns

### Basic Form (react-hook-form + zod + shadcn)

```tsx
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Must be at least 8 characters"),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginForm() {
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginForm) {
    const result = await signIn(values)
    if (result?.error) form.setError("root", { message: result.error })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" type="email" {...field} />
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="••••••••" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Form>
  )
}
```

### Field Arrays

```tsx
import { useFieldArray } from "react-hook-form"

const schema = z.object({
  members: z.array(z.object({ email: z.string().email(), role: z.string() })).min(1),
})

export function TeamForm() {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { members: [{ email: "", role: "member" }] } })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "members" })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-end">
            <FormField control={form.control} name={`members.${index}.email`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  {index === 0 && <FormLabel>Email</FormLabel>}
                  <FormControl><Input placeholder="team@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => append({ email: "", role: "member" })}>
          Add member
        </Button>
        <Button type="submit">Invite Team</Button>
      </form>
    </Form>
  )
}
```

## 5. Data Table

```tsx
// components/data-table.tsx
"use client"
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender,
  type ColumnDef, type SortingState, type ColumnFiltersState, type RowSelectionState,
} from "@tanstack/react-table"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
}

export function DataTable<TData, TValue>({ columns, data, searchKey }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, rowSelection },
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div className="space-y-4">
      {searchKey && (
        <Input
          placeholder="Search..."
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
          onChange={e => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
          className="max-w-sm"
        />
      )}
      {Object.keys(rowSelection).length > 0 && (
        <p className="text-sm text-muted-foreground">{Object.keys(rowSelection).length} row(s) selected</p>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">No results</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Sortable column helper
export function sortableHeader(label: string) {
  return ({ column }: { column: any }) => (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
      {label} <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

// Selection column
export const selectionColumn: ColumnDef<any> = {
  id: "select",
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected()}
      onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
    />
  ),
  cell: ({ row }) => (
    <Checkbox checked={row.getIsSelected()} onCheckedChange={v => row.toggleSelected(!!v)} />
  ),
}
```

## 6. Command Menu

```tsx
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command"
import { LayoutDashboard, Settings, Users, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <Button variant="outline" className="text-muted-foreground w-64 justify-start" onClick={() => setOpen(true)}>
        <Search className="mr-2 h-4 w-4" />
        Search...
        <kbd className="ml-auto text-xs bg-muted px-1 rounded">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => navigate("/dashboard")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
              <CommandShortcut>⌘D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Team">
            <CommandItem onSelect={() => navigate("/team")}>
              <Users className="mr-2 h-4 w-4" />
              Team Members
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
```

## 7. Sheet / Drawer

```tsx
// Mobile nav sheet
"use client"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-1">
          {links.map(l => (
            <a key={l.href} href={l.href} className="flex items-center rounded-md px-3 py-2 text-sm hover:bg-accent">
              {l.label}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

## 8. Dialog / AlertDialog

```tsx
// Confirmation dialog
"use client"
import { useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteProject(id)
      onDeleted()
      toast.success("Project deleted")
    } catch {
      toast.error("Failed to delete project")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All project data will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

## 9. Toast / Sonner

```tsx
// app/layout.tsx — add Toaster once
import { Toaster } from "@/components/ui/sonner"
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}

// Usage
import { toast } from "sonner"

// Basic
toast.success("Saved!")
toast.error("Something went wrong")
toast.info("New message received")

// Promise toast — auto updates based on promise state
toast.promise(saveProject(data), {
  loading: "Saving project...",
  success: "Project saved!",
  error: "Failed to save project",
})

// Custom action
toast("File exported", {
  description: "Your data has been exported.",
  action: { label: "Download", onClick: () => downloadFile() },
})
```

## 10. Tabs with URL State

```tsx
"use client"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Suspense } from "react"

const TABS = ["overview", "activity", "settings"] as const

export function ProjectTabs({ projectId }: { projectId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get("tab") ?? "overview") as typeof TABS[number]

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("tab", tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded" />}>
          <ProjectOverview id={projectId} />
        </Suspense>
      </TabsContent>
      <TabsContent value="activity">
        <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded" />}>
          <ProjectActivity id={projectId} />
        </Suspense>
      </TabsContent>
      <TabsContent value="settings">
        <ProjectSettings id={projectId} />
      </TabsContent>
    </Tabs>
  )
}
```

## 11. Theming

```css
/* app/globals.css — CSS variable theming */
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    /* ... */
  }
}
```

## 12. Building Custom shadcn-Style Components

```tsx
// components/ui/stat-card.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

const statCardVariants = cva(
  "rounded-lg border p-6 transition-colors",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        positive: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
        negative: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
        neutral: "bg-muted",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof statCardVariants> {
  label: string
  value: string | number
  change?: string
  asChild?: boolean
}

export function StatCard({ label, value, change, variant, className, asChild, ...props }: StatCardProps) {
  const Comp = asChild ? Slot : "div"
  return (
    <Comp className={cn(statCardVariants({ variant }), className)} {...props}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {change && <p className="mt-1 text-sm text-muted-foreground">{change}</p>}
    </Comp>
  )
}
```

## 13. Charts (shadcn + Recharts)

```tsx
// Recharts via shadcn — install: npx shadcn@latest add chart
"use client"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

export function RevenueChart({ data }: { data: { month: string; revenue: number; expenses: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={v => `$${v / 1000}k`} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.1} />
        <Area type="monotone" dataKey="expenses" stroke="var(--color-expenses)" fill="var(--color-expenses)" fillOpacity={0.1} />
      </AreaChart>
    </ChartContainer>
  )
}
```

**Version:** 1.0.0
**Last Updated:** 2026-03-23
