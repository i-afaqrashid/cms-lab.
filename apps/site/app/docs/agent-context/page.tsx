import type { Metadata } from "next";
import { CodeBlock, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Agent Context",
  description:
    "Generate cms-lab context files for coding agents before they work on CMS diagnostics.",
};

export default function AgentContextPage() {
  return (
    <DocsShell
      active="/docs/agent-context"
      toc={[
        { href: "#generate", label: "Generate" },
        { href: "#files", label: "Files" },
        { href: "#agents", label: "Agents" },
        { href: "#safety", label: "Safety" },
      ]}
    >
      <div className="breadcrumb">Docs / CLI / agent-context</div>
      <h1>Agent context</h1>
      <p className="lede">
        Generate small markdown handoff files that tell coding agents how this
        project uses cms-lab before they try to fix CMS diagnostics.
      </p>

      <h2 id="generate">Generate files</h2>
      <p>
        Run the command from the Next.js project that has a{" "}
        <code>cms-lab.config.ts</code> file.
      </p>
      <CodeBlock>{`npx @cms-lab/cli agent-context`}</CodeBlock>
      <p>
        Use flags when you need a custom config path or an intentional rewrite.
      </p>
      <CodeBlock>{`npx @cms-lab/cli agent-context --config ./cms-lab.config.ts
npx @cms-lab/cli agent-context --force
npx @cms-lab/cli agent-context --no-agents-md
npx @cms-lab/cli agent-context --out .cms-lab`}</CodeBlock>

      <h2 id="files">Generated files</h2>
      <table className="table">
        <thead>
          <tr>
            <th>File</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>AGENTS.md</code>
            </td>
            <td>
              Root handoff file for agents that read repository instructions.
            </td>
          </tr>
          <tr>
            <td>
              <code>.cms-lab/agent-context.md</code>
            </td>
            <td>
              Safe project scan facts: framework, CMS provider, route patterns,
              check groups, and cms-lab reference links.
            </td>
          </tr>
          <tr>
            <td>
              <code>.cms-lab/agent-prompt.md</code>
            </td>
            <td>
              A starter prompt for asking an agent to reproduce and investigate
              cms-lab diagnostics.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="agents">Agent usage</h2>
      <p>
        The generated files are plain markdown, so they work as shared context
        for tools such as Codex, Claude Code, Gemini CLI, Antigravity, OpenCode,
        and similar coding agents. If a tool prefers a different project memory
        filename, copy or import the generated content instead of duplicating it
        by hand.
      </p>

      <h2 id="safety">Safety defaults</h2>
      <p>
        Existing files are not overwritten unless <code>--force</code> is
        passed. Generated content avoids CMS tokens, raw CMS payloads, private
        URLs, webhook URLs, and local absolute paths.
      </p>
    </DocsShell>
  );
}
