import { articles } from "../articles";

export function Article({ article }: { article: (typeof articles)[string] }) {
  return (
    <main className="article">
      <a href="/">← 引迹首页</a>
      <h1>{article.title}</h1>
      <p className="lead">{article.summary}</p>
      {article.sections.map(([heading, text]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{text}</p>
        </section>
      ))}
    </main>
  );
}
