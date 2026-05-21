/* eslint-disable react/no-unstable-nested-components */
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { memo, useMemo } from "react";

type MarkdownContentProps = {
  children: string;
  className?: string;
  compact?: boolean;
};

const MarkdownContent = memo(function MarkdownContent({
  children,
  className = "",
  compact = false,
}: MarkdownContentProps) {
  const components = useMemo(
    () => ({
      // Paragraphs
      p: ({ ...props }) => (
        <p
          className={compact ? "mb-2 last:mb-0 leading-relaxed" : "mb-3 last:mb-0 leading-relaxed"}
          {...props}
        />
      ),
      // Headings
      h1: ({ ...props }) => (
        <h1
          className={compact ? "text-lg font-bold mb-2 mt-3 first:mt-0" : "text-xl font-bold mb-3 mt-4 first:mt-0"}
          {...props}
        />
      ),
      h2: ({ ...props }) => (
        <h2
          className={compact ? "text-base font-semibold mb-2 mt-2 first:mt-0" : "text-lg font-semibold mb-2 mt-3 first:mt-0"}
          {...props}
        />
      ),
      h3: ({ ...props }) => (
        <h3
          className={compact ? "text-sm font-semibold mb-1 mt-2 first:mt-0" : "text-base font-semibold mb-2 mt-3 first:mt-0"}
          {...props}
        />
      ),
      h4: ({ ...props }) => (
        <h4
          className={compact ? "text-sm font-medium mb-1 mt-1 first:mt-0" : "text-base font-medium mb-1 mt-2 first:mt-0"}
          {...props}
        />
      ),
      h5: ({ ...props }) => (
        <h5
          className={compact ? "text-xs font-medium mb-1 mt-1 first:mt-0" : "text-sm font-medium mb-1 mt-2 first:mt-0"}
          {...props}
        />
      ),
      h6: ({ ...props }) => (
        <h6
          className={compact ? "text-xs font-medium mb-1 mt-1 first:mt-0" : "text-sm font-medium mb-1 mt-2 first:mt-0"}
          {...props}
        />
      ),
      // Code
      code: ({ inline, children: codeChildren, ...props }: {
        inline?: boolean;
        className?: string;
        children?: React.ReactNode;
      }) => {
        if (inline) {
          return (
            <code
              className="bg-surface-hover px-1.5 py-0.5 rounded text-[0.9em] font-mono"
              {...props}
            >
              {codeChildren}
            </code>
          );
        }
        return (
          <code
            className="block bg-surface-hover p-3 rounded text-sm font-mono overflow-x-auto"
            {...props}
          >
            {codeChildren}
          </code>
        );
      },
      pre: ({ ...props }) => (
        <pre className={compact ? "mb-2 overflow-x-auto" : "mb-3 overflow-x-auto"} {...props} />
      ),
      // Lists
      ul: ({ ...props }) => (
        <ul className={compact ? "list-disc pl-4 mb-2 space-y-0.5" : "list-disc pl-5 mb-3 space-y-1"} {...props} />
      ),
      ol: ({ ...props }) => (
        <ol className={compact ? "list-decimal pl-4 mb-2 space-y-0.5" : "list-decimal pl-5 mb-3 space-y-1"} {...props} />
      ),
      li: ({ ...props }) => (
        <li className="leading-relaxed" {...props} />
      ),
      // Blockquote
      blockquote: ({ ...props }) => (
        <blockquote
          className={compact ? "border-l-2 border-edge pl-2 italic text-muted mb-2" : "border-l-2 border-edge pl-3 italic text-muted mb-3"}
          {...props}
        />
      ),
      // Links
      a: ({ href, ...props }: { href?: string }) => (
        <a
          href={href}
          className="text-accent hover:text-accent-hover underline"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        />
      ),
      // Horizontal rule
      hr: ({ ...props }) => (
        <hr className={compact ? "border-edge my-2" : "border-edge my-4"} {...props} />
      ),
      // Strong and emphasis
      strong: ({ ...props }) => (
        <strong className="font-semibold" {...props} />
      ),
      em: ({ ...props }) => (
        <em className="italic" {...props} />
      ),
      // Tables (from remark-gfm)
      table: ({ ...props }) => (
        <div className={compact ? "mb-2 overflow-x-auto" : "mb-3 overflow-x-auto"}>
          <table className="min-w-full border-collapse border border-edge text-sm" {...props} />
        </div>
      ),
      thead: ({ ...props }) => (
        <thead className="bg-surface-hover" {...props} />
      ),
      tbody: ({ ...props }) => <tbody {...props} />,
      tr: ({ ...props }) => (
        <tr className="border-b border-edge last:border-b-0" {...props} />
      ),
      th: ({ ...props }) => (
        <th className="border border-edge px-2 py-1 text-left font-semibold" {...props} />
      ),
      td: ({ ...props }) => (
        <td className="border border-edge px-2 py-1" {...props} />
      ),
      // Strikethrough (from remark-gfm)
      del: ({ ...props }) => (
        <del className="line-through opacity-75" {...props} />
      ),
    }),
    [compact]
  );

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownContent;
