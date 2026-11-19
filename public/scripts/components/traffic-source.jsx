import { TableRow, TableCell } from "@/components/ui/table";
import { TrafficTrend } from "../charts/traffic.jsx";
import { Disclosure, DataTable } from "./controls.jsx";

const deviceNames = {phone:"手机",desktop:"电脑",tablet:"平板",unknown:"未识别",legacy:"历史未记录"};
const date = new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",month:"numeric",day:"numeric"});
const hour = new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
const formatDay = at=>date.format(at);
const formatHour = at=>hour.format(at);

export function TrafficSource({title,data,days}) {
  const seen = data.lastSeen != null;
  const average = data.uv ? (data.pv / data.uv).toLocaleString("zh-CN",{maximumFractionDigits:2}) : "—";
  const format = days===1 ? formatHour : formatDay;
  const stats = [["页面浏览量（PV）",data.pv],["访客数（UV）",data.uv],["人均浏览次数",average]];
  const frequency = [["1 次",data.once],["2–4 次",data.few],["5 次及以上",data.frequent]];
  return <section className="traffic-source">
    <header><h3>{title}</h3>
      {seen && <small>最近上报 {new Date(data.lastSeen).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false})}</small>}
    </header>
    <dl className="traffic-kpis">{stats.map(([label,value])=><div key={label}><dt>{label}</dt>
      <dd><strong>{seen ? value?.toLocaleString() : "—"}</strong></dd></div>)}</dl>
    {!seen ? <p>{data.enabled || data.configured ? "已启用，等待网站首次上报。" :
      <a href="#traffic?section=sdk">接入 SDK 后查看访问统计</a>}</p> :
      data.trend && <>
        <div className="traffic-breakdown">
          <div><h4>{days===1 ? "分时访问" : "每日访问"}</h4><TrafficTrend rows={data.trend} format={format}/></div>
          <div><h4>访客浏览频次</h4>
            <p>按每位访客在所选期间的浏览次数分组</p>
            <dl className="traffic-frequency">{frequency.map(([label,count])=><div key={label}>
              <dt>{label}</dt><dd>{count.toLocaleString()} 人</dd>
            </div>)}</dl>
          </div>
        </div>
        {!!data.devices?.length && <div className="traffic-devices"><h4>设备分布 · 浏览量占比</h4>
          <p>依据浏览器标识估算</p>
          <ul>{data.devices.map(({device,pv})=><li key={device}><span>{deviceNames[device]}</span>
            <strong>{pv.toLocaleString()} PV</strong><small>{(100*pv/data.pv).toFixed(1)}%</small></li>)}</ul>
        </div>}
        <Disclosure title="时段明细"><DataTable headings={[days===1 ? "小时" : "日期","PV","UV"]}>
          {data.trend.map(row=><TableRow key={row.at}><TableCell>{format(row.at)}</TableCell>
            <TableCell>{row.pv}</TableCell><TableCell>{row.uv}</TableCell></TableRow>)}
        </DataTable></Disclosure>
      </>}
  </section>;
}
