import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function WorkspaceSelect({ id, value, options, onChange, placeholder, wide = false }) {
  const selected = options.find((option) => option.value === value);
  return (
    <Select value={value || ""} onValueChange={onChange} disabled={!options.length}>
      <SelectTrigger id={id} className="min-w-0 max-w-full text-left" title={selected?.label}>
        <SelectValue placeholder={placeholder}>{selected?.label}</SelectValue>
      </SelectTrigger>
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
