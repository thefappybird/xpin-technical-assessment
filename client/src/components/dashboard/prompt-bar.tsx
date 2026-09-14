import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpIcon, SparkleIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PromptBarProps {
  onSubmit: (prompt: string) => void
  isPending: boolean
}

/**
 * The bottom-docked natural-language prompt bar (per the assignment's
 * reference screenshot). Each submission is a fresh `POST
 * /api/generate-dashboard` call — this is the one place user input drives
 * the schema itself, not just widget data (see PRODUCT.md's positioning
 * claim).
 */
export function PromptBar({ onSubmit, isPending }: PromptBarProps) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed || isPending) return
    onSubmit(trimmed)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-lg border bg-card p-2 shadow-overlay"
    >
      <SparkleIcon className="ml-1.5 size-4 shrink-0 text-ring" aria-hidden="true" />
      <Input
        aria-label="Describe the dashboard you want"
        placeholder="Ask for a dashboard — e.g. Which accounts are high-risk and need review?"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isPending}
        className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0"
      />
      <Button type="submit" size="icon" disabled={isPending || !prompt.trim()} aria-label="Generate dashboard">
        <ArrowUpIcon />
      </Button>
    </form>
  )
}
