import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import { Upload, ImagePlus, X, Sparkles, CheckCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MAX_SIZE_MB = 10;
const CAPTION_MAX = 2200;

export default function UploadPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`File must be under ${MAX_SIZE_MB}MB`); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
    setSuccess(false);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select an image'); return; }
    setLoading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('caption', caption.trim());

      const { data } = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      if (data.success) {
        setSuccess(true);
        toast.success('Post published! 🎉');
        setTimeout(() => navigate('/feed'), 1500);
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload post');
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setSuccess(false);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-20 md:pt-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
            <ImagePlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
              New Post
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Share a moment with your followers</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => !preview && fileRef.current?.click()}
            className="glass-card relative overflow-hidden cursor-pointer transition-all"
            style={{
              minHeight: preview ? 'auto' : '280px',
              border: dragging ? '2px dashed #8b5cf6' : '2px dashed var(--border-subtle)',
              background: dragging ? 'rgba(139,92,246,0.08)' : 'var(--bg-card)',
            }}
          >
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full max-h-[500px] object-contain rounded-2xl" />
                {!loading && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); clearFile(); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {success && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="text-center text-white">
                      <CheckCircle className="w-16 h-16 mx-auto mb-2" style={{ color: '#10b981' }} />
                      <p className="font-bold text-lg">Published!</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}
                >
                  <Upload className="w-9 h-9" style={{ color: '#8b5cf6' }} />
                </div>
                <p className="text-lg font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Drag & drop or click to upload
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  PNG, JPG, WEBP up to {MAX_SIZE_MB}MB
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </div>

          {/* Upload progress bar */}
          {loading && (
            <div className="w-full rounded-full overflow-hidden h-2" style={{ background: 'var(--bg-input)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                }}
              />
            </div>
          )}

          {/* Caption */}
          <div className="glass-card p-4">
            <label className="label flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
              Caption
            </label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value.slice(0, CAPTION_MAX))}
              placeholder="Write a caption… (optional)"
              rows={3}
              className="input-field resize-none"
              style={{ borderRadius: '10px' }}
              disabled={loading}
            />
            <div className="text-right mt-1">
              <span className="text-xs" style={{ color: caption.length > CAPTION_MAX * 0.9 ? '#ec4899' : 'var(--text-muted)' }}>
                {caption.length}/{CAPTION_MAX}
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || loading || success}
            className="btn-brand w-full py-4 text-base rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="spinner" /> Uploading… {progress}%</>
            ) : success ? (
              <><CheckCircle className="w-5 h-5" /> Posted!</>
            ) : (
              <><ImagePlus className="w-5 h-5" /> Share Post</>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="btn-outline w-full py-3 text-sm rounded-xl"
            disabled={loading}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
