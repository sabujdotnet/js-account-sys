/**
 * Photos Page - Receipt & Handwriting Note Uploads
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  PenTool,
  Trash2,
  Download,
  Search,
  X,
  Eye,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatDate, formatBytes } from '../utils/formatters';

// Photo Type Badge
function PhotoTypeBadge({ type }) {
  const configs = {
    receipt: { icon: FileText, label: 'Receipt', color: 'bg-blue-100 text-blue-800' },
    handwriting_note: { icon: PenTool, label: 'Handwriting Note', color: 'bg-amber-100 text-amber-800' },
    site_photo: { icon: ImageIcon, label: 'Site Photo', color: 'bg-emerald-100 text-emerald-800' },
    document: { icon: FileText, label: 'Document', color: 'bg-gray-100 text-gray-800' },
  };

  const config = configs[type] || configs.document;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
}

// Upload Modal
function UploadModal({ isOpen, onClose, onUpload }) {
  const [type, setType] = useState('receipt');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('photos', file);
    });
    formData.append('type', type);
    formData.append('description', description);

    try {
      await onUpload(formData);
      setFiles([]);
      setDescription('');
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload Photos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Photo Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'receipt', label: 'Receipt', icon: FileText },
                { value: 'handwriting_note', label: 'Handwriting Note', icon: PenTool },
                { value: 'site_photo', label: 'Site Photo', icon: ImageIcon },
                { value: 'document', label: 'Document', icon: FileText },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`flex items-center space-x-2 p-3 rounded-lg border transition ${
                    type === option.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <option.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              rows={3}
              placeholder="Add a description..."
            />
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
              isDragActive
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
            </p>
            <p className="text-sm text-gray-500 mt-2">Supports: JPEG, PNG, WebP, PDF (Max 10MB)</p>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Selected Files ({files.length})</h4>
              <div className="space-y-2 max-h-40 overflow-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={files.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
            >
              Upload {files.length > 0 && `(${files.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Photo Preview Modal
function PhotoPreviewModal({ photo, onClose }) {
  if (!photo) return null;

  const isPdf = photo.mime_type === 'application/pdf';
  const imageUrl = `${process.env.REACT_APP_API_URL || ''}${photo.file_path}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="max-w-4xl max-h-[90vh] w-full">
        {isPdf ? (
          <iframe src={imageUrl} className="w-full h-[80vh] bg-white rounded-lg" title={photo.original_name} />
        ) : (
          <img
            src={imageUrl}
            alt={photo.original_name}
            className="max-w-full max-h-[80vh] mx-auto object-contain rounded-lg"
          />
        )}

        <div className="mt-4 text-white text-center">
          <p className="font-medium">{photo.original_name}</p>
          <p className="text-sm text-gray-300">
            {photo.type} • {formatDate(photo.created_at)}
          </p>
          {photo.description && <p className="text-sm mt-2">{photo.description}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Photos() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch photos
  const { data: photos, isLoading } = useQuery({
    queryKey: ['photos', filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      const response = await api.get(`/photos?${params.toString()}`);
      return response.data.data.photos;
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (formData) => api.post('/photos/upload', formData),
    onSuccess: () => {
      toast.success('Photos uploaded successfully');
      queryClient.invalidateQueries(['photos']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Upload failed');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/photos/${id}`),
    onSuccess: () => {
      toast.success('Photo deleted');
      queryClient.invalidateQueries(['photos']);
    },
    onError: () => {
      toast.error('Failed to delete photo');
    },
  });

  // Filter photos
  const filteredPhotos = photos?.filter((photo) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      photo.original_name?.toLowerCase().includes(query) ||
      photo.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photos</h1>
          <p className="text-gray-500">Manage receipts, handwriting notes, and site photos</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Upload className="w-5 h-5" />
          <span>Upload Photos</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            <option value="">All Types</option>
            <option value="receipt">Receipts</option>
            <option value="handwriting_note">Handwriting Notes</option>
            <option value="site_photo">Site Photos</option>
            <option value="document">Documents</option>
          </select>
        </div>
      </div>

      {/* Photos Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredPhotos?.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No photos found</h3>
          <p className="text-gray-500">Upload your first photo to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos?.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
            >
              {/* Thumbnail */}
              <div
                className="aspect-square bg-gray-100 cursor-pointer"
                onClick={() => setPreviewPhoto(photo)}
              >
                {photo.mime_type === 'application/pdf' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                ) : (
                  <img
                    src={`${process.env.REACT_APP_API_URL || ''}${photo.file_path}`}
                    alt={photo.original_name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPreviewPhoto(photo)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-emerald-600"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <a
                    href={`${process.env.REACT_APP_API_URL || ''}${photo.file_path}`}
                    download
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-emerald-600"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this photo?')) {
                        deleteMutation.mutate(photo.id);
                      }
                    }}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <PhotoTypeBadge type={photo.type} />
                <p className="text-sm font-medium text-gray-900 truncate mt-1">{photo.original_name}</p>
                <p className="text-xs text-gray-500">{formatDate(photo.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={uploadMutation.mutateAsync}
      />

      <PhotoPreviewModal
        photo={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
      />
    </div>
  );
}
