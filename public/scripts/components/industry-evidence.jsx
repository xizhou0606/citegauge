import { Disclosure } from "./controls.jsx";
import { Expand, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function PageShot({ image, label, url }) {
  if (!image) return null;
  const src = "data:image/jpeg;base64," + image;
  return <figure className="industry-shot">
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={"放大" + label}>
          <img src={src} alt={label} loading="lazy" />
          <span><Expand size={15} /></span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-h-[92dvh] overflow-auto" aria-describedby={undefined}>
        <DialogTitle>{label}</DialogTitle>
        <img src={src} alt={label} />
      </DialogContent>
    </Dialog>
    <figcaption><strong>{label}</strong><a href={url} target="_blank" rel="noreferrer">来源页 <ArrowUpRight size={14} /></a></figcaption>
  </figure>;
}

export function Source({ row }) {
  return <Disclosure className="industry-source" title="对照依据">
    <blockquote>{row.quote}</blockquote>
    {row.provenance && <span>{row.provenance} · </span>}
    <a href={row.url} target="_blank" rel="noreferrer">{row.title || row.url} ↗</a>
  </Disclosure>;
}
