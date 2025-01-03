import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import SpriteEditor from './SpriteEditor'

export default function FileList() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTags, setNewTags] = useState({})
  const [showSpriteEditor, setShowSpriteEditor] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      // ストレージからファイル一覧を取得
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('asset')
        .list()

      if (storageError) throw storageError

      // メタデータを取得
      const { data: metadataFiles, error: metadataError } = await supabase
        .from('file_metadata')
        .select('*')

      if (metadataError) throw metadataError

      // ファイル情報とメタデータをマージ
      const filesWithUrls = await Promise.all(storageFiles.map(async (file) => {
        const { data: { publicUrl } } = supabase.storage
          .from('asset')
          .getPublicUrl(file.name)
        
        // file_nameで一致するメタデータを探す
        const metadata = metadataFiles.find(m => m.file_name === file.name)
        
        return {
          ...file,
          id: metadata?.id, // UUIDを保持
          tags: metadata?.tags || [], // タグ情報を確実に取得
          publicUrl,
          isImage: file.metadata?.mimetype?.startsWith('image/'),
          isAudio: file.metadata?.mimetype?.startsWith('audio/'),
          file_type: metadata?.file_type || 'unknown',
          file_extension: metadata?.file_extension || ''
        }
      }))

      setFiles(filesWithUrls)
    } catch (error) {
      console.error('Error loading files:', error)
      alert('ファイルの読み込みに失敗したナリ！')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url)
    alert('URLをコピーしたナリ！')
  }

  const handleAddTag = async (file) => {
    const newTag = newTags[file.id] || ''
    if (!newTag.trim()) return

    try {
      const updatedTags = [...(file.tags || []), newTag.trim()]
      
      const { error } = await supabase
        .from('file_metadata')
        .upsert({
          id: file.id,
          file_name: file.name,
          file_path: file.name,
          tags: updatedTags,
          file_type: file.file_type,
          file_extension: file.file_extension
        }, {
          onConflict: 'id'
        })

      if (error) throw error

      setNewTags(prev => ({
        ...prev,
        [file.id]: ''
      }))
      loadFiles()
    } catch (error) {
      console.error('Error adding tag:', error)
      alert('タグの追加に失敗したナリ！')
    }
  }

  const handleTagInputChange = (fileId, value) => {
    setNewTags(prev => ({
      ...prev,
      [fileId]: value
    }))
  }

  const handleRemoveTag = async (file, tagToRemove) => {
    try {
      const updatedTags = (file.tags || []).filter(tag => tag !== tagToRemove)
      
      const { error } = await supabase
        .from('file_metadata')
        .upsert({
          id: file.id,
          file_name: file.name,
          file_path: file.name,
          tags: updatedTags,
          file_type: file.file_type,        // 既存の値を保持
          file_extension: file.file_extension // 既存の値を保持
        }, {
          onConflict: 'id'
        })

      if (error) throw error

      loadFiles()
    } catch (error) {
      console.error('Error removing tag:', error)
      alert('タグの削除に失敗したナリ！')
    }
  }

  const handleDelete = async (file) => {
    if (!confirm('本当に削除してもよろしいナリか？')) return

    try {
      // ストレージからファイルを削除
      const { error: storageError } = await supabase.storage
        .from('asset')
        .remove([file.name])

      if (storageError) throw storageError

      // メタデータを削除
      const { error: metadataError } = await supabase
        .from('file_metadata')
        .delete()
        .match({ id: file.id })

      if (metadataError) throw metadataError
      
      alert('ファイルを削除したナリ！')
      loadFiles() // リストを更新
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('ファイルの削除に失敗したナリ！')
    }
  }

  const handleDownload = async (file) => {
    try {
      const response = await fetch(file.publicUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('ダウンロードに失敗したナリ！');
    }
  };

  if (loading) {
    return <div className="text-center p-4">読み込み中...</div>
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">アップロード済みファイル</h2>
          <button
            onClick={() => setShowSpriteEditor(true)}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            スプライトエディタを開く
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.name} className="border rounded-lg p-4 bg-white shadow">
              {file.isImage ? (
                <img
                  src={file.publicUrl}
                  alt={file.name}
                  className="w-full h-48 object-contain rounded mb-2 bg-white p-2"
                />
              ) : file.isAudio ? (
                <audio
                  controls
                  className="w-full mb-2"
                >
                  <source src={file.publicUrl} type={file.metadata?.mimetype} />
                  お使いのブラウザは音声再生に対応し��いないナリ
                </audio>
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded mb-2">
                  <span className="text-gray-500">No Preview</span>
                </div>
              )}
              <div className="text-sm truncate mb-2 flex items-center justify-between">
                <div>
                  <span>{file.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {file.file_type} / {file.file_extension}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(file)}
                    className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 border border-blue-500 rounded flex items-center gap-1"
                    title="ダウンロード"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>DL</span>
                  </button>
                  <button
                    onClick={() => handleCopyUrl(file.publicUrl)}
                    className="text-green-500 hover:text-green-700 text-sm px-2 py-1 border border-green-500 rounded flex items-center gap-1"
                    title="URLをコピー"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>URL</span>
                  </button>
                </div>
              </div>
              
              <div className="mb-2">
                {file.tags?.map(tag => (
                  <span
                    key={tag}
                    className="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs mr-1 mb-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(file, tag)}
                      className="ml-1 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="flex items-center mt-1">
                  <input
                    type="text"
                    value={newTags[file.id] || ''}
                    onChange={(e) => handleTagInputChange(file.id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag(file)
                      }
                    }}
                    className="border rounded px-2 py-1 text-sm mr-1"
                    placeholder="新しいタグを入力..."
                  />
                  <button
                    onClick={() => handleAddTag(file)}
                    className="text-green-500 hover:text-green-700 text-sm px-2 py-1"
                  >
                    追加
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {(file.metadata?.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button
                  onClick={() => handleDelete(file)}
                  className="text-red-500 hover:text-red-700 text-sm px-2 py-1 border border-red-500 rounded"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>

        {showSpriteEditor && (
          <SpriteEditor
            onSave={() => {
              loadFiles();  // ファイル一覧を更新
            }}
            onClose={() => setShowSpriteEditor(false)}
          />
        )}
      </div>
    </div>
  )
} 