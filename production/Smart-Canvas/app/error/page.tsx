export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-zinc-900/80 backdrop-blur-lg border border-zinc-700 rounded-xl p-8 shadow-xl flex flex-col items-center">
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-zinc-300">Please try again or contact support.</p>
      </div>
    </div>
  )
} 