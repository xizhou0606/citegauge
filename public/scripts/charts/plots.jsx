import { useEffect } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Panel, Disclosure, DataTable } from "../components/controls.jsx";
import { percent } from "../core/ui.js";
import { mountPlots, clearPlots } from "./plots.js";
import { metrics } from "./trends.js";

export function Plots({ report }) {
  useEffect(() => {
    mountPlots(report);
    return clearPlots;
  }, [report]);
  const c = report.summary;
  return (
    <div className="plot-grid">
      <Panel>
        <div className="section-head">
          <h2>{report.days.length === 1 ? "单日可见度对比" : "可见度趋势"}</h2>
          <span className="caption">最近 30 天 · UTC</span>
        </div>
        <div className="legend">
          {metrics.map((m, i) => (
            <span key={m.name}>
              <i className={"swatch s" + i} />
              {m.name}
            </span>
          ))}
        </div>
        {report.days.length ? (
          <div className="plot">
            <canvas id="trend-chart" role="img" aria-label="品牌提及、官网引用与明确推荐率，数据见下方明细" />
          </div>
        ) : (
          <p className="empty">尚无采样记录</p>
        )}
        <div className="chart-data">
          <Disclosure title={`查看每日明细（${report.days.length} 天有样本）`}>
            <DataTable headings={["日期", "有效", "提及率", "引用率", "推荐率"]}>
              {report.days.map((d) => (
                <TableRow key={d.day}>
                  <TableCell>{d.day}</TableCell>
                  <TableCell>{d.valid}</TableCell>
                  {metrics.map((m) => (
                    <TableCell key={m.name}>{percent(d[m.hit], d[m.base])}</TableCell>
                  ))}
                </TableRow>
              ))}
            </DataTable>
          </Disclosure>
        </div>
      </Panel>
      <Panel>
        <div className="section-head">
          <h2>引用分布</h2>
          <span className="caption">按有效回答</span>
        </div>
        <div className="donut">
          <canvas id="citation-chart" role="img" aria-label="引用状态分布，数据见下方列表" />
          <div>
            <strong>{c.valid}</strong>
            <span>有效样本</span>
          </div>
        </div>
        <ul className="distribution">
          {[
            ["官网被引", c.citations],
            ["已核对无官网", c.observable - c.citations],
            ["来源不可观测", c.valid - c.observable],
          ].map(([label, n], i) => (
            <li key={label}>
              <span>
                <i className={"swatch d" + i} />
                {label}
              </span>
              <b>{n} 条</b>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
