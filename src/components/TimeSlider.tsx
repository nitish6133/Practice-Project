import { useState } from 'react';
import { Calendar, Play, Pause } from 'lucide-react';
import Draggable from 'react-draggable';

interface TimeSliderProps {
  minYear: number;
  maxYear: number;
  currentYear: number;
  onYearChange: (year: number) => void;
}

export const TimeSlider = ({ minYear, maxYear, currentYear, onYearChange }: TimeSliderProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSlider, setShowSlider] = useState(true);

  return (
    <Draggable handle=".drag-handle" bounds="parent">
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50 overflow-hidden min-w-[500px]">
          <div className="drag-handle flex items-center justify-between p-3 bg-gradient-to-r from-slate-700 to-slate-800 cursor-move">
            <div className="flex items-center gap-2 text-white">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-semibold">Time Slider</span>
            </div>
            <button
              onClick={() => setShowSlider(!showSlider)}
              className="text-xs text-white/70 hover:text-white transition-colors"
            >
              {showSlider ? 'Hide' : 'Show'}
            </button>
          </div>

          {showSlider && (
            <div className="p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 bg-slate-700 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600 font-medium">{minYear}</span>
                    <span className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                      {currentYear}
                    </span>
                    <span className="text-xs text-gray-600 font-medium">{maxYear}</span>
                  </div>

                  <input
                    type="range"
                    min={minYear}
                    max={maxYear}
                    value={currentYear}
                    onChange={(e) => onYearChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #334155 0%, #334155 ${
                        ((currentYear - minYear) / (maxYear - minYear)) * 100
                      }%, #e5e7eb ${((currentYear - minYear) / (maxYear - minYear)) * 100}%, #e5e7eb 100%)`
                    }}
                  />

                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    {[...Array(5)].map((_, i) => {
                      const year = minYear + Math.floor((i * (maxYear - minYear)) / 4);
                      return (
                        <button
                          key={i}
                          onClick={() => onYearChange(year)}
                          className="hover:text-slate-700 transition-colors"
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
};
