import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Camera, Upload, Trash2, Link as LinkIcon, Check, AlertCircle, Loader2 } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || null);
      setUrlInputValue(user.photoURL && !user.photoURL.startsWith('data:') ? user.photoURL : '');
      setShowUrlInput(false);
      setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  // Process & compress uploaded image file using HTML5 canvas
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large (max 5 MB).');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to max 256x256
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoURL(compressedDataUrl);
          setShowUrlInput(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input so user can pick the same file again if desired
    e.target.value = '';
  };

  const handleApplyUrl = () => {
    const trimmed = urlInputValue.trim();
    if (!trimmed) {
      setError('Please enter a valid image URL.');
      return;
    }
    setPhotoURL(trimmed);
    setError(null);
  };

  const handleRemovePhoto = () => {
    setPhotoURL(null);
    setUrlInputValue('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    if (!cleanName) {
      setError('Display name cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateProfile({
        displayName: cleanName,
        photoURL: photoURL, // can be string, or null to remove
      });

      if (onSuccess) {
        onSuccess('Profile updated successfully!');
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentInitials = (displayName || user.email?.split('@')[0] || 'TR')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 id="edit-profile-title" className="text-base font-extrabold text-white tracking-tight">
              Edit Profile
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize your profile name and avatar image
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Avatar Picture Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
            {/* Avatar Preview */}
            <div className="relative group flex-shrink-0">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Avatar Preview"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md bg-slate-800"
                  onError={() => {
                    setError('Unable to load image from URL. Please check the link.');
                    setPhotoURL(null);
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center font-extrabold text-2xl text-white shadow-md shadow-indigo-500/20">
                  {currentInitials}
                </div>
              )}

              {/* Quick file trigger overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                title="Change image"
              >
                <Camera className="w-5 h-5 text-indigo-300" />
              </button>
            </div>

            {/* Avatar Action Buttons */}
            <div className="flex-1 w-full space-y-2 text-center sm:text-left">
              <span className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
                Profile Photo
              </span>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>

                {/* URL Button */}
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Paste URL</span>
                </button>

                {/* Remove Photo Button */}
                {photoURL && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 text-xs font-semibold transition"
                    title="Remove custom photo and use letter avatar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* Optional URL input field */}
              {showUrlInput && (
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="url"
                    value={urlInputValue}
                    onChange={(e) => setUrlInputValue(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="flex-1 bg-slate-900 border border-indigo-500/50 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="edit-profile-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Display Name
            </label>
            <input
              id="edit-profile-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Abhijith M"
              maxLength={50}
              required
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Email (Read-Only) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <div className="w-full bg-slate-950/40 border border-slate-800/60 rounded-xl px-3.5 py-2 text-xs text-slate-400 flex items-center justify-between">
              <span className="truncate">{user.email}</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex-shrink-0">
                <Check className="w-3 h-3" /> Account
              </span>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
