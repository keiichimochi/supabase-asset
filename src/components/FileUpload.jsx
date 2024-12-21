import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function FileUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('audio/')) return 'sound'
    return 'unknown'
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      
      const fileExt = file.name.split('.').pop().toLowerCase()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('asset')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { error: metadataError } = await supabase
        .from('file_metadata')
        .upsert({
          file_name: fileName,
          file_path: filePath,
          tags: [],
          file_type: getFileType(file.type),
          file_extension: fileExt
        }, {
          onConflict: 'file_name'
        })

      if (metadataError) throw metadataError

      alert('ファイルのアップロードに成功したナリ！')
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error) {
      alert('エラーが発生したナリ！: ' + error.message)
    } finally {
      setUploading(false)
      setFile(null)
    }
  }

  return (
    <div className="p-4">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">ファイルアップロード</h2>
        <input
          type="file"
          accept="image/*,audio/*"
          onChange={handleFileChange}
          className="mb-4"
          disabled={uploading}
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {uploading ? 'アップロード中...' : 'アップロード'}
        </button>
      </div>
    </div>
  )
} 