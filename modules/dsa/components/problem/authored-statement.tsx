import { ArticleMarkdown } from "@/modules/news/components/article-markdown";
import type { AuthoredStatement } from "@/modules/dsa/domain/extra-problems";

export interface StatementExample {
  input: string;
  output: string;
}

/** A statement written for PrepOS: markdown body, worked examples (from the visible test cases) and constraints. */
export function AuthoredStatementView({ statement, examples }: { statement: AuthoredStatement; examples: readonly StatementExample[] }) {
  return (
    <div className="space-y-4">
      <ArticleMarkdown markdown={statement.statementMd} />
      {examples.map((ex, i) => (
        <div key={i} className="space-y-1">
          <p className="text-sm font-medium">Example {i + 1}</p>
          <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            <span className="text-muted-foreground">Input: </span>
            {ex.input}
            {"\n"}
            <span className="text-muted-foreground">Output: </span>
            {ex.output}
          </pre>
        </div>
      ))}
      {statement.constraints.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Constraints</p>
          <ul className="list-disc space-y-0.5 pl-5 font-mono text-xs text-muted-foreground">
            {statement.constraints.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Written for PrepOS. Run checks the examples; Submit also runs the hidden tests.</p>
    </div>
  );
}
