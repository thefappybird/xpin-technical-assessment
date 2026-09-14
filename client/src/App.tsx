import { QueryClientProvider } from '@tanstack/react-query'

import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Dynamic Engine — scaffold ready.
        </p>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  )
}

export default App
