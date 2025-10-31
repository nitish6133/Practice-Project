import { Search, Download, Upload, Globe } from 'lucide-react';

interface TopBarProps {
  onSearch: (query: string) => void;
  onDownload: () => void;
  onUpload: () => void;
}

export const TopBar = ({ onSearch, onDownload, onUpload }: TopBarProps) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4">
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50 overflow-hidden">
        <div className="flex items-center">
          <div className="flex-1 flex items-center px-4 py-3 gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search address, location, or scenario..."
              onChange={(e) => onSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-1 px-3 py-2 border-l border-gray-200">
            <button
              onClick={onUpload}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
              title="Upload Data"
            >
              <Upload className="w-5 h-5 text-gray-600 group-hover:text-slate-700" />
            </button>
            <button
              onClick={onDownload}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
              title="Download Data"
            >
              <Download className="w-5 h-5 text-gray-600 group-hover:text-slate-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
