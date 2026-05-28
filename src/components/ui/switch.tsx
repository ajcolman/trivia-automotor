"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-[18px] w-[32px] shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        "data-[unchecked]:bg-input data-[checked]:bg-primary",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-[14px] rounded-full bg-background shadow-sm ring-0 transition-transform",
          "data-[unchecked]:translate-x-[1px] data-[checked]:translate-x-[15px]",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
