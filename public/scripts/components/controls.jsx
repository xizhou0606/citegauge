import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Table, TableHeader, TableBody, TableRow, TableHead } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { status } from "../core/ui.js";

export function Panel({ className = "", ...props }) {
  return <Card className={"surface gap-0 " + className} {...props} />;
}
export function SmallButton(props) {
  return <Button size="sm" variant="outline" type="button" {...props} />;
}
export function AsyncButton({ run, disabled, ...props }) {
  const [busy, setBusy] = useState(false);
  return (
    <SmallButton
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        try {
          status("");
          await run();
        } catch (e) {
          status(e.message);
        } finally {
          setBusy(false);
        }
      }}
      {...props}
    />
  );
}
export function Disclosure({ title, children }) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <SmallButton>{title}</SmallButton>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
export function DataTable({ headings, children }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headings.map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
export function FormDialog({ title, label, triggerId, disabled, children, save, canSubmit = true, onOpen }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await save(event.currentTarget);
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          setError("");
          if (value) onOpen?.();
        }
      }}
    >
      <DialogTrigger asChild>
        <SmallButton id={triggerId} disabled={disabled}>
          {title}
        </SmallButton>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle>{title}</DialogTitle>
        <form onSubmit={submit} className="grid gap-4">
          {children}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={!canSubmit || busy}>
            {label}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
