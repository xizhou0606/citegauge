import { adviceFields } from "./review-export.js";

export function ModuleAdvice({ actions }) {
  if (!actions?.length) return null;
  return (
    <div className="module-advice">
      <h4>具体修改清单</h4>
      <ol>
        {actions.map((action, index) => (
          <li key={index}>
            <h5>{action.target}</h5>
            <dl>
              {adviceFields.map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{action[key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
    </div>
  );
}
