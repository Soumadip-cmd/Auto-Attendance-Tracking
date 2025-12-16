import { useState, useRef } from 'react';
import { Camera, X, Upload, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const ImageUpload = ({ currentImage, onImageChange, userName }) => {
  const [preview, setPreview] = useState(currentImage);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      uploadImage(file);
    };
    reader.readAsDataURL(file);
  };

const uploadImage = async (file) => {
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    // Your API call
    const response = await usersAPI.uploadProfilePicture(userId, formData);
    
    onImageChange(response.data.imageUrl);
    toast.success('✅ Profile picture updated!');
  } catch (error) {
    console.error('Upload error:', error);
    toast.error('❌ Failed to upload image');
    setPreview(currentImage);
  } finally {
    setUploading(false);
  }
};

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer. files[0];
    handleFileSelect(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageChange(null);
    toast.success('Profile picture removed');
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col sm:flex-row items-start gap-6">
      {/* Profile Picture Display */}
      <div className="relative group">
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <button
              onClick={handleRemoveImage}
              disabled={uploading}
              className="absolute -top-2 -right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors disabled:opacity-50"
              title="Remove picture"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-32 h-32 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center border-4 border-gray-200 dark:border-gray-700">
            <span className="text-4xl font-bold text-primary-700 dark:text-primary-400">
              {userName}
            </span>
          </div>
        )}
        
        {/* Camera Button */}
        <button
          onClick={triggerFileInput}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg transition-colors disabled:opacity-50"
          title="Change picture"
        >
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* Upload Area */}
      <div className="flex-1 w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark: border-gray-700 hover:border-primary-400 dark:hover:border-primary-600'
          }`}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${
            isDragging ? 'text-primary-600' : 'text-gray-400'
          }`} />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {isDragging ? 'Drop your image here' : 'Upload Profile Picture'}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Drag and drop or click to browse
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            PNG, JPG, GIF up to 5MB
          </p>
        </div>

        {/* Tips */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Check className="w-4 h-4 text-green-500" />
            <span>Best size: 400x400 pixels</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Check className="w-4 h-4 text-green-500" />
            <span>Square images work best</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;