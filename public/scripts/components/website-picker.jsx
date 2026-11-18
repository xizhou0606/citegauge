import { Label } from "@/components/ui/label";
import { WorkspaceSelect } from "./workspace-select.jsx";

export function websiteOptions(catalog) {
  const sites = new Map((catalog.sites || []).map(s => [s.domain,s]));
  for (const {domain, brand} of catalog.monitors) {
    if (!sites.has(domain)) sites.set(domain,{domain,brand,url:"https://"+domain});
  }
  return [...sites.values()];
}
export function WebsitePicker({sites,domain,change}) {
  return <div className="monitor-picker flex-wrap border-b pb-3 mb-4">
    <Label htmlFor="website-picker">监测网站</Label>
    <WorkspaceSelect id="website-picker" value={domain} placeholder="暂无网站" onChange={change}
      options={sites.map(s => ({value:s.domain,label:[s.brand,s.url].filter(Boolean).join(" · ")}))} />
  </div>;
}
