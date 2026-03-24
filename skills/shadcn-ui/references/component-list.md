# shadcn/ui Component Reference

Every component, what it does, and key props/usage notes.

## Layout

| Component | Description | Key Props / Notes |
|---|---|---|
| `Separator` | Horizontal or vertical divider line | `orientation="horizontal\|vertical"` |
| `AspectRatio` | Maintain a width/height ratio | `ratio={16/9}` |
| `ScrollArea` | Custom scrollbar overlay | `className="h-72"` to constrain height |
| `ResizablePanelGroup` | Draggable split panels | `direction="horizontal\|vertical"` |

## Feedback

| Component | Description | Key Props / Notes |
|---|---|---|
| `Alert` | Inline status message | `variant="default\|destructive"` |
| `AlertDialog` | Blocking confirmation modal | Requires `AlertDialogTrigger` + `AlertDialogContent` |
| `Dialog` | Non-blocking modal | `open`, `onOpenChange`; use `asChild` on trigger |
| `Drawer` | Slides up from bottom (mobile) | Built on Vaul, `direction="bottom\|top\|left\|right"` |
| `Sheet` | Slides from edge | `side="left\|right\|top\|bottom"` |
| `Tooltip` | Hover hint | Wrap trigger in `TooltipTrigger asChild` |
| `HoverCard` | Rich hover preview | Good for user profiles, link previews |
| `Popover` | Floating container | Good for date pickers, filters, settings |
| `Toast` | (deprecated in favor of Sonner) | Use `Sonner` instead |
| `Sonner` | Toast notifications | Import `toast` from `"sonner"` |
| `Progress` | Progress bar | `value={0-100}` |
| `Skeleton` | Loading placeholder | `className="h-4 w-32"` to size it |
| `Badge` | Inline label chip | `variant="default\|secondary\|outline\|destructive"` |

## Forms

| Component | Description | Key Props / Notes |
|---|---|---|
| `Form` | Context wrapper for react-hook-form | `<Form {...form}>` |
| `FormField` | Connects field to form control | `control`, `name`, `render` |
| `FormItem` | Wraps label + control + message | Container div |
| `FormLabel` | Label with error styling | Reads from FormItem context |
| `FormControl` | Wraps input, passes `id`/`aria-*` | Slot wrapper |
| `FormDescription` | Help text below input | `text-sm text-muted-foreground` |
| `FormMessage` | Validation error message | Reads from FormField context |
| `Input` | Text input | `type`, `placeholder`; spread `...field` from RHF |
| `Textarea` | Multi-line input | `rows`, `resize` via className |
| `Select` | Dropdown select | `SelectTrigger` + `SelectContent` + `SelectItem` |
| `Checkbox` | Boolean checkbox | `checked`, `onCheckedChange` |
| `RadioGroup` | Mutually exclusive options | `RadioGroupItem` for each option |
| `Switch` | Toggle on/off | `checked`, `onCheckedChange` |
| `Slider` | Range slider | `min`, `max`, `step`, `value`, `onValueChange` |
| `Label` | Accessible form label | `htmlFor` or wrap input |
| `Calendar` | Date picker grid | `mode="single\|range\|multiple"`, `selected`, `onSelect` |
| `DatePicker` | Calendar + Popover combo | Build from Calendar + Popover + Button |
| `InputOTP` | One-time password input | `maxLength`, `render` slot pattern |
| `Command` | Searchable command list | `CommandInput` + `CommandList` + `CommandItem` |

## Navigation

| Component | Description | Key Props / Notes |
|---|---|---|
| `NavigationMenu` | Top-level nav with dropdowns | Complex; good for marketing sites |
| `Menubar` | Desktop app-style menubar | `MenubarMenu` + `MenubarContent` |
| `DropdownMenu` | Context menu from trigger | `DropdownMenuTrigger` + `DropdownMenuContent` |
| `ContextMenu` | Right-click menu | Same structure as DropdownMenu |
| `Breadcrumb` | Path breadcrumb trail | `BreadcrumbItem` + `BreadcrumbLink` + `BreadcrumbSeparator` |
| `Pagination` | Page navigation controls | `PaginationPrevious`, `PaginationNext`, `PaginationLink` |
| `Tabs` | Tabbed content | `TabsList` + `TabsTrigger` + `TabsContent` |
| `Sidebar` | App sidebar with collapsing | Complex; uses SidebarProvider + cookie state |

## Data Display

| Component | Description | Key Props / Notes |
|---|---|---|
| `Table` | Semantic HTML table | `TableHeader`, `TableBody`, `TableRow`, `TableCell` |
| `Card` | Content container | `CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription` |
| `Avatar` | User avatar with fallback | `AvatarImage` + `AvatarFallback` |
| `Carousel` | Image/content carousel | `CarouselContent` + `CarouselItem`, `opts` for Embla options |
| `Accordion` | Expandable content | `type="single\|multiple"`, `collapsible` |
| `Collapsible` | Simple show/hide | `open`, `onOpenChange`; `CollapsibleTrigger` + `CollapsibleContent` |
| `Chart` | Recharts wrapper | `ChartContainer` config, all Recharts primitives work inside |

## Typography / Misc

| Component | Description | Key Props / Notes |
|---|---|---|
| `Button` | Primary action | `variant`, `size`, `asChild` for links |
| `Toggle` | On/off button | `pressed`, `onPressedChange`, `variant` |
| `ToggleGroup` | Group of toggles | `type="single\|multiple"` |

## Common Patterns

```tsx
// Dialog with form
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Form</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>Update your account details.</DialogDescription>
    </DialogHeader>
    <ProfileForm onSuccess={() => setOpen(false)} />
  </DialogContent>
</Dialog>

// Dropdown with icons
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
    <DropdownMenuItem onClick={onDelete} className="text-destructive">
      <Trash className="mr-2 h-4 w-4" />Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// Skeleton loading state
function PostCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  )
}
```
