import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const CURSOR_STEP = 8;
const MAX_SIZE = 64;

export default function SpriteEditor({ onSave, onClose }) {
  const [image, setImage] = useState(null);
  const [gridSize, setGridSize] = useState({ width: 8, height: 8 });
  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tags, setTags] = useState(['sprite']);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          drawImage(img);
        };
        img.src = e.target?.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const drawImage = (img) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  };

  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // グリッドを描画
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += CURSOR_STEP) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += CURSOR_STEP) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 選択枠を描画
    const x = Math.floor(mousePos.x / CURSOR_STEP) * CURSOR_STEP;
    const y = Math.floor(mousePos.y / CURSOR_STEP) * CURSOR_STEP;
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.strokeRect(x, y, gridSize.width, gridSize.height);
  };

  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;

    setMousePos({ x, y });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSpriteExtract = async () => {
    if (!image || !canvasRef.current) return;
    setSaving(true);

    const canvas = canvasRef.current;
    const x = Math.floor(mousePos.x / CURSOR_STEP) * CURSOR_STEP;
    const y = Math.floor(mousePos.y / CURSOR_STEP) * CURSOR_STEP;

    // スプライトを切り出す
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridSize.width;
    tempCanvas.height = gridSize.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      canvas,
      x, y, gridSize.width, gridSize.height,
      0, 0, gridSize.width, gridSize.height
    );

    // Supabaseに保存
    try {
      const blob = await new Promise(resolve => tempCanvas.toBlob(resolve));
      const fileName = `sprite_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('asset')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('asset')
        .getPublicUrl(fileName);

      // メタデータを保存（タグも含める）
      const { error: metadataError } = await supabase
        .from('file_metadata')
        .insert({
          file_name: fileName,
          file_path: fileName,
          file_type: 'image',
          file_extension: 'png',
          tags: tags
        });

      if (metadataError) throw metadataError;

      if (onSave) {
        onSave({ fileName, publicUrl });
      }

      // 成功メッセージを表示
      const message = document.createElement('div');
      message.textContent = 'スプライトを保存したナリ！';
      message.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 2000);

      // 元のイメージとグリッドを再描画（イメージはクリアしない）
      drawGrid();

    } catch (error) {
      console.error('Error saving sprite:', error);
      alert('スプライトの保存に失敗したナリ！');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (image) {
      drawGrid();
    }
  }, [mousePos, gridSize, image]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">スプライトエディタ</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="border p-2 rounded"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setGridSize({ width: 8, height: 8 })}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                8x8
              </button>
              <button
                onClick={() => setGridSize({ width: 16, height: 16 })}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                16x16
              </button>
              <button
                onClick={() => setGridSize({ width: 32, height: 32 })}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                32x32
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-bold mb-2">タグ設定</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag();
                  }
                }}
                placeholder="新しいタグを入力..."
                className="border rounded px-2 py-1 flex-1"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                追加
              </button>
            </div>
          </div>

          <div className="relative overflow-auto max-h-[60vh]">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onClick={handleSpriteExtract}
              className={`border border-gray-300 rounded ${saving ? 'cursor-wait' : 'cursor-crosshair'}`}
            />
            {saving && (
              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                <div className="bg-white px-4 py-2 rounded shadow">
                  保存中...
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600 flex items-center gap-2">
            <span>クリックでスプライトを切り出して保存するナリ！</span>
            {saving && <span className="text-blue-500">保存中...</span>}
          </div>
        </div>
      </div>
    </div>
  );
} 