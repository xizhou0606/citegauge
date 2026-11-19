import { ArrowDownUp, Gauge, Globe, MousePointer2, Route, Users } from "lucide-react";
import { Panel } from "./controls.jsx";

import { ReportTrend } from "./report-trend.jsx";

const reports=[
  {name:"获客来源",icon:Globe,hint:"哪些渠道带来了访问？",metrics:{
    channel:"引荐渠道",referrer:"引荐网站",utm_source:"推广来源",utm_medium:"推广媒介",utm_campaign:"推广活动"}},
  {name:"访问路径",icon:Route,hint:"访客从哪一页进入，又去了哪里？",metrics:{
    entry:"会话入口",transition:"页面流向",page:"热门页面",session:"新会话",navigation:"加载方式"}},
  {name:"页面互动",icon:MousePointer2,hint:"访客点击、阅读和使用了什么？",metrics:{
    click:"控件点击",engagement:"可见时长",scroll:"滚动深度",outbound:"外链",download:"下载",search:"站内搜索",media:"影音播放"}},
  {name:"目标转化",icon:ArrowDownUp,hint:"多少次访问走到了目标步骤？",metrics:{
    funnel:"有序漏斗",goal:"配置目标",form_start:"开始填写",form:"提交表单",custom:"业务事件"}},
  {name:"受众与留存",icon:Users,hint:"谁在访问，又有多少人回来？",metrics:{
    retention:"留存率",device:"设备类型",browser:"浏览器",os:"操作系统",language:"语言",country:"国家或地区",screen:"视口宽度"}},
  {name:"体验质量",icon:Gauge,hint:"页面速度和稳定性如何？",metrics:{
    vitals:"真实用户性能 · P75",error:"脚本错误",resource_error:"资源加载失败"}},
];
const deviceNames={desktop:"电脑",phone:"手机",tablet:"平板",unknown:"未识别"};
const regions=new Intl.DisplayNames(["zh-CN"],{type:"region"});
const notes={
  funnel:"按配置的路径顺序记录。每个标签页会话每步最多一次，按步骤发生时间计数，跨期各步样本可能不同。",
  goal:"达到配置的页面或点击指定控件，各计一次目标达成。",
  click:"按配置的控件名称或控件类型汇总。",transition:"统计同一标签页会话中，相邻两次页面浏览的流向。",
  engagement:"汇总页面处于前台可见状态的时间。",scroll:"每次浏览首次达到相应滚动深度时计一次。",
  entry:"标签页首次访问，或距上次页面浏览满 30 分钟时，记录入口页面。",
  form:"记录浏览器提交事件。",download:"按被点击的文件类型统计下载意向。",
  retention:"分母为所选期间首次出现、且已完整经过观察日的匿名访客。按北京时间计算。",
  vitals:"按浏览器实际报告计算第 75 百分位，每个指标独立统计样本数。",
};
function labelFor(row) {
  if (row.kind==="country" && /^[A-Z]{2}$/.test(row.label)) return regions.of(row.label);
  if (row.kind==="device") return deviceNames[row.label] ?? row.label;
  if (row.kind==="navigation") return ({navigate:"常规进入",reload:"刷新",back_forward:"前进或后退"})[row.label] ?? row.label;
  return row.label;
}
function Ranking({rows,metric}) {
  if (!rows.length) return <p className="report-empty">所选时段尚未收到这项事件。<a href="/docs/sdk/collection.html">查看触发条件与开关</a></p>;
  const sorted=metric==="funnel" ? [...rows].sort((a,b)=>a.label.localeCompare(b.label)) :
    [...rows].sort((a,b)=>b.total-a.total);
  const peak=Math.max(1,...sorted.map(r=>r.total));
  return <ol className="report-ranking">{sorted.map(row=><li key={row.label}>
    <span>{labelFor(row)}</span><strong>{metric==="engagement" ? (row.total/1000).toLocaleString("zh-CN",{maximumFractionDigits:1})+" 秒" : row.samples.toLocaleString()+" 次"}</strong>
    <i aria-hidden="true" style={{width:100*row.total/peak+"%"}}/></li>)}</ol>;
}
function Measures({metric,data}) {
  if (metric==="retention") return <dl className="report-values">{[1,7].map(day=>{
    const row=data.retention?.find(r=>r.days===day);
    return <div key={day}><dt>第 {day} 天留存</dt><dd>{row ? (100*row.retained/row.eligible).toFixed(1)+"%" : "—"}</dd>
      <small>{row ? row.retained+" / "+row.eligible+" 位访客回访" : "等待完整观察日的访客"}</small></div>;
  })}</dl>;
  if (metric==="vitals") return <dl className="report-values">{Object.entries({
    TTFB:"首字节",FCP:"首次内容绘制",LCP:"最大内容绘制",INP:"交互响应",CLS:"布局偏移",
  }).map(([k,name])=>{
    const row=data.vitals.find(r=>r.kind===k);
    return <div key={k}><dt>{name} · {k}</dt><dd>{row ? k==="CLS" ? row.p75.toFixed(3) : Math.round(row.p75)+" ms" : "—"}</dd>
      <small>{row ? row.samples+" 个样本" : "等待浏览器测量"}</small></div>;
  })}</dl>;
  return <Ranking metric={metric} rows={data.groups.filter(r=>r.kind===metric)}/>;
}
export function TrafficReports({data,selection,onSelect}) {
  const {index,metric}=selection;
  const report=reports[index];
  const available=new Set(data.groups.map(row=>row.kind));
  if (data.vitals.length) available.add("vitals");
  if (data.retention?.length) available.add("retention");
  return <div className="report-explorer">
    <nav aria-label="访问分析报表">{reports.map(({name,icon:Icon},i)=><button key={name} type="button"
      aria-label={name} aria-pressed={index===i} onClick={()=>onSelect({index:i,metric:Object.keys(reports[i].metrics)[0]})}>
      <Icon aria-hidden="true" size={16}/>{name}
      {Object.keys(reports[i].metrics).some(k=>available.has(k)) &&
        <span className="report-dot" aria-label="本期有样本"/>}</button>)}</nav>
    <Panel className="report-body"><header><h2>{report.name}</h2><p>{report.hint}</p></header>
      <div className="report-filters" role="group" aria-label="分析指标">{Object.entries(report.metrics).map(([k,title])=>
        <button type="button" key={k} aria-pressed={metric===k} onClick={()=>onSelect({index,metric:k})}>{title}</button>)}</div>
      <section aria-label={report.metrics[metric]}><header className="report-detail-heading"><h3>{report.metrics[metric]}</h3>
        <small>{available.has(metric) ? "本期有样本" : metric==="retention" ? "等待观察日" : "本期无样本"}</small></header>
        {notes[metric] && <p>{notes[metric]}</p>}<ReportTrend data={data} metric={metric} title={report.metrics[metric]}/>
        <Measures metric={metric} data={data}/></section>
    </Panel>
  </div>;
}
