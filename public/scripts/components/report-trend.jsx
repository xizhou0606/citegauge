import { useMemo } from "react";
import { TrafficTrend } from "../charts/traffic.jsx";
import { Disclosure } from "./controls.jsx";

const counts=[{key:"amount",label:"事件次数"}],seconds=[{key:"amount",label:"可见秒数"}];
const hour=new Intl.DateTimeFormat("zh-CN",{hour:"2-digit",hour12:false,timeZone:"Asia/Shanghai"});
const date=new Intl.DateTimeFormat("zh-CN",{month:"numeric",day:"numeric",timeZone:"Asia/Shanghai"});

export function ReportTrend({data,metric,title}) {
  const rows=useMemo(()=>{
    const samples=data.trend?.filter(r=>r.kind===metric);
    if (!samples?.length || !data.step) return [];
    const buckets=new Map(samples.map(r=>[r.bucket,metric==="engagement" ? Math.round(r.total/100)/10 : r.samples]));
    return Array.from({length:Math.floor((data.end-data.start)/data.step)+1},(_,i)=>({
      at:data.start+i*data.step,amount:buckets.get(i) ?? 0,
    }));
  },[data,metric]);
  if (!rows.length) return null;
  const format=data.days===1 ? hour.format : date.format;
  return <section className="report-trend"><h4>{title} · {data.days===1 ? "分时趋势" : "每日趋势"}</h4>
    <TrafficTrend rows={rows} format={format} series={metric==="engagement" ? seconds : counts} description={title+"趋势，详细数值见趋势明细"}/>
    <Disclosure title="趋势明细"><dl className="traffic-frequency">{rows.map(r=>
      <div key={r.at}><dt>{format(r.at)}</dt><dd>{r.amount} {metric==="engagement" ? "秒" : "次"}</dd></div>)}</dl></Disclosure>
  </section>;
}
