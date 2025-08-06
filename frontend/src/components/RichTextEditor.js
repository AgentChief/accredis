import React, { useState, useRef, useEffect } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Start writing your document...",
  readOnly = false,
  className = "",
  height = "400px"
}) => {
  const quillRef = useRef(null)

  // Custom toolbar configuration for healthcare documents
  const modules = {
    toolbar: readOnly ? false : [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  }

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'blockquote', 'code-block',
    'link', 'image'
  ]

  // Custom styles for healthcare document formatting
  const editorStyle = {
    height: height,
    backgroundColor: readOnly ? '#f8fafc' : 'white'
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      <style jsx>{`
        .rich-text-editor .ql-editor {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #1f2937;
        }
        
        .rich-text-editor .ql-editor h1 {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 24px 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .rich-text-editor .ql-editor h2 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 20px 0 12px 0;
        }
        
        .rich-text-editor .ql-editor h3 {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin: 16px 0 8px 0;
        }
        
        .rich-text-editor .ql-editor h4 {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin: 12px 0 6px 0;
        }
        
        .rich-text-editor .ql-editor p {
          margin: 8px 0;
          line-height: 1.7;
        }
        
        .rich-text-editor .ql-editor ul, 
        .rich-text-editor .ql-editor ol {
          margin: 12px 0;
          padding-left: 24px;
        }
        
        .rich-text-editor .ql-editor li {
          margin: 4px 0;
          line-height: 1.6;
        }
        
        .rich-text-editor .ql-editor blockquote {
          border-left: 4px solid #3b82f6;
          margin: 16px 0;
          padding: 12px 16px;
          background-color: #f8fafc;
          font-style: italic;
        }
        
        .rich-text-editor .ql-editor table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        
        .rich-text-editor .ql-editor table td,
        .rich-text-editor .ql-editor table th {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          text-align: left;
        }
        
        .rich-text-editor .ql-editor table th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        
        .rich-text-editor .ql-toolbar {
          border-top: 1px solid #e5e7eb;
          border-left: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          background-color: #f9fafb;
        }
        
        .rich-text-editor .ql-container {
          border-bottom: 1px solid #e5e7eb;
          border-left: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          font-family: inherit;
        }
        
        .rich-text-editor.read-only .ql-container {
          border: none;
        }
      `}</style>
      
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={editorStyle}
        className={readOnly ? 'read-only' : ''}
      />
    </div>
  )
}

export default RichTextEditor