import { useEffect, useRef } from "react";

export function TrafficTrend({rows,format}) {
  const ref = useRef(null);
  useEffect(()=>{
    if (!window.Chart) return;
    const theme = getComputedStyle(document.documentElement);
    const chart = new window.Chart(ref.current,{
      type:"bar",
      data:{labels:rows.map(row=>format(row.at)),datasets:["pv","uv"].map((key,i)=>({
        label:key.toUpperCase(),data:rows.map(row=>row[key]),
        backgroundColor:theme.getPropertyValue("--chart-"+(i+1)).trim(),borderRadius:3,maxBarThickness:22,
      }))},
      options:{responsive:true,maintainAspectRatio:false,
        animation:matchMedia("(prefers-reduced-motion: reduce)").matches ? false : {duration:220},
        interaction:{mode:"index",intersect:false},
        scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{beginAtZero:true,ticks:{precision:0}}},
        plugins:{legend:{position:"top",align:"end",labels:{boxWidth:10,boxHeight:10}}},
      },
    });
    return ()=>chart.destroy();
  },[rows,format]);
  return <div className="traffic-plot"><canvas ref={ref} role="img" aria-label="PV 与 UV 趋势，详细数值见时段明细" /></div>;
}
