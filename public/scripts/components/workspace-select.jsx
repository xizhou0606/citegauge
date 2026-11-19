import { Tooltip } from "radix-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function WorkspaceSelect({ id, name, value, options, onChange, placeholder, wide = false }) {
  const selected = options.find((option) => option.value === value);
  const trigger = (
    <SelectTrigger id={id} className="min-w-0 max-w-full text-left">
      <SelectValue placeholder={placeholder}>{selected?.label}</SelectValue>
    </SelectTrigger>
  );
  return (
    <Select name={name} value={value || ""} onValueChange={onChange} disabled={!options.length}>
      {selected?.label.length > 18 ? (
        <Tooltip.Provider delayDuration={500}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>{trigger}</Tooltip.Trigger>
            <Tooltip.Portal><Tooltip.Content sideOffset={6} collisionPadding={8} className="field-hint">
              {selected.label}
            </Tooltip.Content></Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      ) : trigger}
      <SelectContent
        collisionPadding={8}
        className={wide ? "workspace-select-menu monitor-options" : "workspace-select-menu"}
      >
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} textValue={option.label}>
            {option.description ? (
              <>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
                <span className="block leading-snug">{option.text}</span>
              </>
            ) : (
              option.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
