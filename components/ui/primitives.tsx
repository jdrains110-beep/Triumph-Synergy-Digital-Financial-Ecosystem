// Re-export all Radix UI primitives used across the application
export * as AlertDialog from "@radix-ui/react-alert-dialog";
export * as Avatar from "@radix-ui/react-avatar";
export * as Collapsible from "@radix-ui/react-collapsible";
export * as Dialog from "@radix-ui/react-dialog";
export * as DropdownMenu from "@radix-ui/react-dropdown-menu";
export * as HoverCard from "@radix-ui/react-hover-card";
export * as Label from "@radix-ui/react-label";
export * as Progress from "@radix-ui/react-progress";
export * as ScrollArea from "@radix-ui/react-scroll-area";
export * as Select from "@radix-ui/react-select";
export * as Separator from "@radix-ui/react-separator";

// Export Slot as both namespace and named export for compatibility
import * as SlotPrimitive from "@radix-ui/react-slot";
export { SlotPrimitive as Slot };
export { Slot as SlotComponent } from "@radix-ui/react-slot";
