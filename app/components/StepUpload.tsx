'use client'

import React, { useCallback, useRef, useState } from 'react'
import styled from 'styled-components'

interface StepUploadProps {
  onNext: (files: File[]) => void
}

const Container = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 24px;
`

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #111;
`

const Subtitle = styled.p`
  color: #555;
  margin-bottom: 24px;
  font-size: 0.95rem;
`

interface DropZoneProps {
  $isDragging: boolean
  $hasFiles: boolean
}

const DropZone = styled.div<DropZoneProps>`
  border: 2px dashed ${p => (p.$isDragging ? '#0070f3' : p.$hasFiles ? '#22c55e' : '#d1d5db')};
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  background: ${p => (p.$isDragging ? '#eff6ff' : '#fafafa')};
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: #0070f3;
    background: #eff6ff;
  }
`

const DropText = styled.p`
  color: #444;
  margin: 0 0 12px;
  font-size: 1rem;
`

const BrowseButton = styled.button`
  background: #0070f3;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 0.9rem;
  cursor: pointer;
  &:hover { background: #005fd1; }
`

const FileList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 20px 0 0;
`

const FileChip = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  font-size: 0.875rem;
`

const FileInfo = styled.span`
  color: #333;
`

const FileSize = styled.span`
  color: #888;
  margin-left: 8px;
  font-size: 0.8rem;
`

const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0 4px;
  &:hover { color: #e11d48; }
`

const NextButton = styled.button`
  margin-top: 24px;
  width: 100%;
  padding: 12px;
  background: #0070f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }
  &:not(:disabled):hover { background: #005fd1; }
`

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function StepUpload({ onNext }: StepUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...arr.filter(f => !names.has(f.name))]
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
  }

  const removeFile = (name: string) =>
    setFiles(prev => prev.filter(f => f.name !== name))

  return (
    <Container>
      <Title>Step 1 — Upload transaction files</Title>
      <Subtitle>
        Drag and drop your CSV or XLS/XLSX bank export files, or click to browse.
        TD, Amex, and Scotia formats are supported.
      </Subtitle>

      <DropZone
        $isDragging={isDragging}
        $hasFiles={files.length > 0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <DropText>
          {isDragging
            ? 'Release to add files'
            : 'Drag & drop files here'}
        </DropText>
        <BrowseButton
          type="button"
          onClick={e => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
        >
          Browse files
        </BrowseButton>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          multiple
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </DropZone>

      {files.length > 0 && (
        <FileList>
          {files.map(f => (
            <FileChip key={f.name}>
              <FileInfo>
                {f.name}
                <FileSize>({formatBytes(f.size)})</FileSize>
              </FileInfo>
              <RemoveBtn onClick={() => removeFile(f.name)} title="Remove">
                ×
              </RemoveBtn>
            </FileChip>
          ))}
        </FileList>
      )}

      <NextButton disabled={files.length === 0} onClick={() => onNext(files)}>
        Next →
      </NextButton>
    </Container>
  )
}
