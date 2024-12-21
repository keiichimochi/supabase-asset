import { useCallback, useState } from 'react'
import FileUpload from './components/FileUpload'
import FileList from './components/FileList'

function App() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadComplete = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            アセット管理ツール
          </h1>
        </div>
      </header>
      <main>
        <FileUpload onUploadComplete={handleUploadComplete} />
        <FileList key={refreshKey} />
      </main>
    </div>
  )
}

export default App
