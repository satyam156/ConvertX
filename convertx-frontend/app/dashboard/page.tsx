'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/utils/api';
import { toast, Toaster } from 'react-hot-toast';
import { UploadCloud, FileText, CheckCircle2, XCircle, RefreshCw, LogOut, Download } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [targetFormat, setTargetFormat] = useState('pdf');
  const [uploading, setUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [jobFiles, setJobFiles] = useState<any[]>([]); // 🔥 Holds individual processed files

  const formats = ['pdf', 'png', 'jpg', 'webp', 'mp3', 'docx'];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  // 🔥 Smart Polling Engine: Pulls job details AND files every 2 seconds
  useEffect(() => {
    let interval: any;
    if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
      interval = setInterval(async () => {
        try {
          const res = await API.get(`/jobs/${currentJob.id}`);
          setCurrentJob(res.data.job);
          setJobFiles(res.data.files); // Update files array with live download states

          const status = res.data.job.status;
          if (status === 'completed' || status === 'failed' || status === 'partial_success') {
            toast.success(`Job completed with status: ${status}`);
            clearInterval(interval);
          }
        } catch (err) {
          clearInterval(interval);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [currentJob]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return toast.error('Please add at least one file, bro!');

    setUploading(true);
    setJobFiles([]); // Clear old files display
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('targetFormat', targetFormat);

    try {
      const res = await API.post('/jobs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Files uploaded to cluster queue successfully!');
      setCurrentJob({ id: res.data.jobId, status: 'pending' });
      setFiles([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // 🔥 Triggers the secure stream download from backend storage node
  const handleDownloadFile = async (fileId: string, originalName: string, targetExt: string) => {
    try {
      const response = await API.get(`/files/download/${fileId}`, {
        responseType: 'blob', // Crucial configuration rule to handle raw binary file streams
      });

      // Create dummy link element in virtual memory to force browser trigger download prompt
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const cleanName = originalName.split('.')[0];
      link.setAttribute('download', `${cleanName}.${targetExt}`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup browser cache memory
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Download failed. File might have expired, bro.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Workspace...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      <Toaster position="top-center" />
      
      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex justify-between items-center max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">ConvertX</h1>
          <p className="text-xs text-slate-400">Welcome back, <span className="text-indigo-400 font-medium">{user.name}</span></p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition text-sm font-medium">
          <LogOut size={16} /> Logout
        </button>
      </nav>

      {/* Main Container Grid */}
      <main className="max-w-6xl mx-auto px-6 mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Dropzone Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUploadSubmit} className="bg-slate-800 border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-slate-200">Upload Bulk Files</h3>
            
            <label className="border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-900/40 cursor-pointer transition-all group">
              <UploadCloud size={40} className="text-slate-400 group-hover:text-indigo-400 transition" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-300">Click to select file batches</p>
                <p className="text-xs text-slate-500 mt-1">Images, Audio, Documents up to 50MB</p>
              </div>
              <input type="file" multiple onChange={handleFileChange} className="hidden" />
            </label>

            {files.length > 0 && (
              <div className="bg-slate-900/60 rounded-xl p-4 space-y-2 border border-slate-700 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Selected Batch Stack ({files.length})</p>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-slate-800 px-3 py-2 rounded border border-slate-700">
                    <span className="truncate max-w-[250px] text-slate-300">{f.name}</span>
                    <span className="text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Output Extension</label>
                <select value={targetFormat} onChange={(e) => setTargetFormat(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 transition mt-1">
                  {formats.map(fmt => <option key={fmt} value={fmt}>.{fmt.toUpperCase()}</option>)}
                </select>
              </div>

              <button type="submit" disabled={uploading || files.length === 0} className="w-full sm:w-auto self-end px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none transition flex items-center justify-center gap-2">
                {uploading ? 'Uploading Bundle...' : 'Convert Batch 🚀'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Status Tracker + Downloads Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-6 shadow-xl h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700/60 pb-3">Live Status Radar</h3>
            
            {!currentJob ? (
              <div className="my-auto text-center py-12 flex flex-col items-center gap-2">
                <FileText size={32} className="text-slate-600" />
                <p className="text-sm text-slate-500 font-medium">No active processing queue running right now, bro.</p>
              </div>
            ) : (
              <div className="mt-6 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Job Reference ID</span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded truncate max-w-[120px]">{currentJob.id}</span>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
                    {currentJob.status === 'pending' && <RefreshCw className="animate-spin text-amber-400" size={24} />}
                    {currentJob.status === 'processing' && <RefreshCw className="animate-spin text-indigo-400" size={24} />}
                    {currentJob.status === 'completed' && <CheckCircle2 className="text-emerald-400" size={24} />}
                    {currentJob.status === 'failed' && <XCircle className="text-rose-400" size={24} />}
                    
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cluster Status</p>
                      <p className="text-md font-black capitalize mt-0.5 text-slate-200">{currentJob.status}</p>
                    </div>
                  </div>
                </div>

                {/* 🔥 DYNAMIC INDIVIDUAL FILE DOWNLOAD STREAM SECTIONS */}
                {jobFiles.length > 0 && (
                  <div className="flex-1 space-y-2 mt-2 max-h-64 overflow-y-auto pr-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Processed Output Pipeline</p>
                    {jobFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs">
                        <div className="truncate max-w-[140px] space-y-0.5">
                          <p className="truncate font-medium text-slate-300">{file.original_name}</p>
                          <p className="text-[10px] uppercase font-bold text-indigo-400">{file.source_format} ➡️ {file.target_format}</p>
                        </div>

                        {file.status === 'completed' ? (
                          <button onClick={() => handleDownloadFile(file.id, file.original_name, file.target_format)} className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition duration-200 shadow-sm flex items-center justify-center" title="Download file to local drive">
                            <Download size={14} />
                          </button>
                        ) : file.status === 'failed' ? (
                          <span className="text-rose-400 font-medium text-[10px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">Failed</span>
                        ) : (
                          <RefreshCw className="animate-spin text-indigo-400" size={14} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-center pt-4 text-xs text-slate-500 border-t border-slate-700/50">
                  Ready to stream outputs securely.
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}