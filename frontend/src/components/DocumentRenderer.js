import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const DocumentRenderer = ({ content, className = "" }) => {
  // Custom components for better healthcare document styling
  const components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-6">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-4">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold text-gray-800 mb-2 mt-3">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="text-gray-700 mb-3 leading-relaxed">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="ml-4 leading-relaxed">
        {children}
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 my-4 italic">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full border-collapse border border-gray-300">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-50">
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-300 px-4 py-2 text-gray-700">
        {children}
      </td>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-gray-800">
        {children}
      </em>
    ),
    code: ({ children }) => (
      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        {children}
      </pre>
    )
  }

  return (
    <div className={`document-renderer prose prose-gray max-w-none ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default DocumentRenderer