import { useState } from 'react';
import { ChevronLeft, ChevronRight, Layers as LayersIcon, Box, MessageSquare } from 'lucide-react';
import Draggable from 'react-draggable';
import type { Layer, Scenario, Comment } from '../types';

interface SidebarProps {
  side: 'left' | 'right';
  layers: Layer[];
  scenarios: Scenario[];
  comments: Comment[];
  onLayerToggle: (layerId: string) => void;
  onScenarioSelect: (scenarioId: string) => void;
}

export const Sidebar = ({ side, layers, scenarios, comments, onLayerToggle, onScenarioSelect }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'scenarios' | 'comments'>('layers');

  const tabs = [
    { id: 'layers' as const, label: 'Layers', icon: LayersIcon },
    { id: 'scenarios' as const, label: 'Scenarios', icon: Box },
    { id: 'comments' as const, label: 'Comments', icon: MessageSquare }
  ];

  return (
    <Draggable handle=".drag-handle" bounds="parent">
      <div
        className={`absolute ${side === 'left' ? 'left-4' : 'right-4'} top-20 z-10 transition-all duration-300 ${
          isCollapsed ? 'w-12' : 'w-80'
        }`}
      >
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="drag-handle flex items-center justify-between p-3 bg-gradient-to-r from-slate-700 to-slate-800 cursor-move">
            {!isCollapsed && (
              <div className="flex gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-white text-slate-800'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4 inline mr-1" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {isCollapsed ? (
                side === 'left' ? <ChevronRight className="w-4 h-4 text-white" /> : <ChevronLeft className="w-4 h-4 text-white" />
              ) : (
                side === 'left' ? <ChevronLeft className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          {!isCollapsed && (
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {activeTab === 'layers' && (
                <div className="space-y-3">
                  {layers.map((layer) => (
                    <div
                      key={layer.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={layer.enabled}
                            onChange={() => onLayerToggle(layer.id)}
                            className="w-4 h-4 text-slate-700 rounded focus:ring-2 focus:ring-slate-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-800">{layer.name}</span>
                        </label>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">{layer.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'scenarios' && (
                <div className="space-y-3">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      onClick={() => onScenarioSelect(scenario.id)}
                      className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                        scenario.active
                          ? 'bg-slate-700 text-white border-slate-800 shadow-lg'
                          : 'bg-gray-50 text-gray-800 border-gray-200 hover:border-slate-400 hover:shadow-md'
                      }`}
                    >
                      <h3 className="font-semibold text-sm mb-1">{scenario.name}</h3>
                      <p className={`text-xs ${scenario.active ? 'text-gray-300' : 'text-gray-600'}`}>
                        {scenario.description}
                      </p>
                      <div className={`text-xs mt-2 font-medium ${scenario.active ? 'text-gray-300' : 'text-slate-600'}`}>
                        Year: {scenario.year}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {comment.author.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">{comment.author}</span>
                            <span className="text-xs text-gray-500">
                              {comment.timestamp.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.text}</p>
                        </div>
                      </div>
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-11 mt-3 space-y-2">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="bg-white rounded p-2 border border-gray-200">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs text-gray-900">{reply.author}</span>
                                <span className="text-xs text-gray-500">
                                  {reply.timestamp.toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700">{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
};
