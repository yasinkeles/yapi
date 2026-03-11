import { useRef, useState } from 'react';
import api from '../../services/api';

const PropertiesPanel = ({ block, onChange }) => {
  const fileInputRef = useRef(null);
  const [uploadingKey, setUploadingKey] = useState(null);

  const triggerUpload = (key) => {
    setUploadingKey(key);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !uploadingKey) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/admin/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = data?.data?.url;
      if (url) {
        onChange({ [uploadingKey]: url });
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  if (!block) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Properties</h3>
        <p className="text-slate-500 text-sm">Select a block to edit its properties.</p>
      </div>
    );
  }

  const handle = (key, value) => {
    onChange({ [key]: value });
  };

  const input = (label, key, type = 'text') => (
    <label className="text-xs text-slate-600 space-y-1">
      <span className="block">{label}</span>
      <input
        type={type}
        className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-sm text-slate-900"
        value={block.props?.[key] || ''}
        onChange={(e) => handle(key, type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </label>
  );

  const select = (label, key, options) => (
    <label className="text-xs text-slate-600 space-y-1">
      <span className="block">{label}</span>
      <select
        className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-sm text-slate-900"
        value={block.props?.[key] ?? ''}
        onChange={(e) => handle(key, e.target.value === '' ? '' : isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Properties</h3>
      <p className="text-xs text-slate-500">{block.type} block</p>

      {block.type === 'header' && (
        <>
          {input('Title', 'text')}
          {input('Subtitle', 'subtitle')}
          {input('CTA Text', 'cta')}
          {input('CTA URL', 'href')}
        </>
      )}

      {block.type === 'text' && (
        <>
          {input('Text', 'text')}
          {input('Size (rem)', 'size', 'number')}
        </>
      )}

      {block.type === 'image' && (
        <>
          {input('Image URL', 'src')}
          <button
            type="button"
            className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 hover:bg-slate-200"
            onClick={() => triggerUpload('src')}
          >
            {uploadingKey === 'src' ? 'Uploading...' : 'Upload Image'}
          </button>
          {input('Alt', 'alt')}
        </>
      )}

      {block.type === 'card' && (
        <>
          {input('Title', 'title')}
          {input('Body', 'text')}
          {input('Price', 'price')}
          {input('Badge', 'badge')}
          {input('Image URL', 'image')}
          <button
            type="button"
            className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-sm text-slate-800 hover:bg-slate-200"
            onClick={() => triggerUpload('image')}
          >
            {uploadingKey === 'image' ? 'Uploading...' : 'Upload Image'}
          </button>
          {input('Button Label', 'buttonLabel')}
          {input('Button Href', 'href')}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {block.type === 'button' && (
        <>
          {input('Label', 'label')}
          {input('Href', 'href')}
        </>
      )}

      {block.type === 'grid' && (
        <>
          {select('Columns', 'columns', [
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' }
          ])}
          {select('Gap (px)', 'gap', [
            { value: 12, label: '12' },
            { value: 16, label: '16' },
            { value: 24, label: '24' }
          ])}
        </>
      )}

      {block.type === 'section' && (
        <>
          {select('Background', 'background', [
            { value: '#ffffff', label: 'White' },
            { value: '#f8fafc', label: 'Gray 50' },
            { value: '#0f172a', label: 'Slate 900' }
          ])}
          {select('Padding (px)', 'padding', [
            { value: 16, label: '16' },
            { value: 24, label: '24' },
            { value: 32, label: '32' }
          ])}
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="bg-white border-slate-300"
              checked={!!block.props?.rounded}
              onChange={(e) => handle('rounded', e.target.checked)}
            />
            <span>Rounded corners</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="bg-white border-slate-300"
              checked={!!block.props?.shadow}
              onChange={(e) => handle('shadow', e.target.checked)}
            />
            <span>Shadow</span>
          </label>
        </>
      )}
    </div>
  );
};

export default PropertiesPanel;
