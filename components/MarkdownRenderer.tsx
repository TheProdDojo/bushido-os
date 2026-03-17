import React, { useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// --- Components ---

const MermaidBlock: React.FC<{ chart: string }> = React.memo(({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`).current;

  useEffect(() => {
    if (containerRef.current && (window as any).mermaid) {
      try {
        (window as any).mermaid.render(chartId, chart).then((result: any) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = result.svg;
          }
        });
      } catch (e) {
        console.error("Mermaid render error:", e);
        if (containerRef.current) {
          containerRef.current.innerText = "Error rendering diagram. Please check syntax.";
        }
      }
    }
  }, [chart, chartId]);

  return (
    <div className="w-full my-5 p-6 rounded-xl border border-[rgba(230,57,70,0.15)] bg-[#0d0d12] flex justify-center shadow-lg shadow-black/30">
      <div ref={containerRef} id={`container-${chartId}`} className="w-full text-center overflow-x-auto" />
    </div>
  );
});

interface SectionCardProps {
  title: string | null;
  content: string;
  onRefineSection?: (title: string, content: string) => void;
  isWide?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = React.memo(({ title, content, onRefineSection, isWide }) => {
  // Custom renderers for ReactMarkdown
  const components: Components = useMemo(() => ({
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const isMermaid = match && match[1] === 'mermaid';

      if (!inline && isMermaid) {
        return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
      }

      return !inline && match ? (
        <pre className="bg-[#0d0d12] p-4 rounded-lg overflow-x-auto mb-4 text-[13px] leading-relaxed border border-zinc-800/60">
          <code className={`${className} text-zinc-300 font-mono`} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-[#1a1a22] px-1.5 py-0.5 rounded text-[13px] font-mono text-[#E63946]" {...props}>
          {children}
        </code>
      );
    },
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-5 border border-zinc-800/60 rounded-xl shadow-sm">
        <table className="w-full text-sm text-left">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="text-xs uppercase tracking-wider text-zinc-400 bg-[#0d0d12] border-b border-zinc-800/60">
        {children}
      </thead>
    ),
    th: ({ children }: any) => (
      <th className="px-5 py-3.5 font-semibold whitespace-nowrap text-zinc-300">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-5 py-3 min-w-[150px] text-zinc-400">
        {children}
      </td>
    ),
    tr: ({ children }: any) => (
      <tr className="hover:bg-[rgba(230,57,70,0.04)] border-b border-zinc-800/30 last:border-0 transition-colors">
        {children}
      </tr>
    ),
    a: ({ href, children }: any) => (
      <a href={href} className="text-[#E63946] hover:text-[#ff4f5e] underline underline-offset-2 decoration-[#E63946]/30 hover:decoration-[#E63946]/60 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>
    ),
    p: ({ children }: any) => (
      <p className="mb-4 leading-[1.75] text-zinc-300/90 text-[15px]">
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-none pl-0 mb-5 space-y-2 text-zinc-300/90">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-none pl-0 mb-5 space-y-2 text-zinc-300/90 counter-reset-item">
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="flex items-start gap-3 text-[15px] leading-[1.7]" {...props}>
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#E63946] mt-[10px]" />
        <span>{children}</span>
      </li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-2 border-[#E63946] pl-5 py-3 my-5 bg-[rgba(230,57,70,0.05)] rounded-r-lg text-zinc-400 italic">
        {children}
      </blockquote>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-bold text-zinc-100 mt-6 mb-3 tracking-tight">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-sm font-semibold text-zinc-200 mt-5 mb-2 uppercase tracking-wider">
        {children}
      </h4>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-zinc-100">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="text-zinc-400 not-italic font-medium">{children}</em>
    ),
    hr: () => <hr className="my-8 border-t border-zinc-800/50" />,
  }), []);

  return (
    <div className={`
            flex flex-col rounded-xl overflow-hidden transition-all duration-300
            bg-[#111118] border border-zinc-800/40 hover:border-zinc-700/60
            shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30
            ${isWide ? 'xl:col-span-2' : ''}
        `}>
      {/* Card Header */}
      {title && (
        <div className="px-6 py-4 border-b border-zinc-800/40 bg-gradient-to-r from-[rgba(230,57,70,0.06)] to-transparent flex items-center justify-between group relative overflow-hidden">
          {/* Subtle accent line */}
          <div className="absolute top-0 left-0 w-12 h-[2px] bg-gradient-to-r from-[#E63946] to-transparent" />
          <h2 className="text-[15px] font-bold text-zinc-100 tracking-tight">{title}</h2>
          {onRefineSection && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onRefineSection(title, content)}
                className="p-1.5 text-zinc-500 hover:text-[#E63946] hover:bg-[rgba(230,57,70,0.1)] rounded-lg transition-all"
                title="Refine this specific section"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card Content */}
      <div className="p-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
});

// --- Main Renderer ---

interface Section {
  title: string | null;
  content: string;
  isWide: boolean;
}

interface MarkdownRendererProps {
  content: string;
  onRefineSection?: (title: string, currentContent: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onRefineSection }) => {
  // Split content into sections based on H2 (## )
  const sections = useMemo(() => {
    if (!content) return [];

    const lines = content.split('\n');
    const result: Section[] = [];
    let currentSection: Section = { title: null, content: '', isWide: false };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('## ')) {
        // Push current section if it has content or title
        if (currentSection.content.trim() || currentSection.title) {
          // Check width heuristic (tables or mermaid make it wide)
          currentSection.isWide = currentSection.content.includes('|') || currentSection.content.includes('```mermaid');
          result.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: line.replace(/^##\s+/, '').trim(),
          content: '', // Reset content
          isWide: false
        };
      } else {
        currentSection.content += line + '\n';
      }
    }

    // Push last section
    if (currentSection.content.trim() || currentSection.title) {
      currentSection.isWide = currentSection.content.includes('|') || currentSection.content.includes('```mermaid');
      result.push(currentSection);
    }

    return result;
  }, [content]);

  if (!content) return null;

  return (
    <div className="flex flex-col gap-5 w-full animate-fade-in">
      {sections.map((section, idx) => (
        <SectionCard
          key={section.title || idx}
          title={section.title}
          content={section.content}
          onRefineSection={onRefineSection}
          isWide={section.isWide || idx === 0}
        />
      ))}
    </div>
  );
};