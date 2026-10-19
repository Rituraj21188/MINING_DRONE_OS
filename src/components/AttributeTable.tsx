import React, { useState } from 'react';
import { 
  Table, 
  Trash2, 
  Download, 
  ChevronUp, 
  ChevronDown, 
  Maximize2, 
  Filter, 
  Eye, 
  Search,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { VectorFeature } from '../types/gis';

interface AttributeTableProps {
  features: VectorFeature[];
  setFeatures: React.Dispatch<React.SetStateAction<VectorFeature[]>>;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  theme: 'dark' | 'light';
  onQuickExportCSV: () => void;
}

export const AttributeTable: React.FC<AttributeTableProps> = ({
  features,
  setFeatures,
  selectedFeatureId,
  setSelectedFeatureId,
  isOpen,
  setIsOpen,
  theme,
  onQuickExportCSV
}) => {
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredFeatures = features.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.fid.toString().includes(searchTerm);
    const matchesType = filterType === 'ALL' || f.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDeleteFeature = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    if (selectedFeatureId === id) {
      setSelectedFeatureId(null);
    }
  };

  const handleUpdateName = (id: string, newName: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  if (!isOpen) {
    return (
      <div className={`absolute bottom-3 right-20 z-20`}>
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-mono-tech border-t border-l border-r shadow-lg transition-all ${
            isDark 
              ? 'bg-[#101612] border-[#223124] text-[#c6ff00] hover:bg-[#151f18]' 
              : 'bg-white border-neutral-300 text-emerald-800 hover:bg-neutral-50'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>ATTRIBUTE TABLE ({features.length})</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`absolute bottom-0 left-0 right-0 max-h-72 border-t z-20 flex flex-col transition-all shadow-2xl ${
      isDark ? 'bg-[#0a0d0b] border-[#1d271e] text-neutral-200' : 'bg-white border-neutral-300 text-neutral-800'
    }`}>
      {/* Table Toolbar Header */}
      <div className={`px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b text-xs font-mono-tech ${
        isDark ? 'border-[#1b251c] bg-[#0e130f]' : 'border-neutral-200 bg-neutral-50'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1.5 font-bold text-[#c6ff00]">
            <Table className="w-4 h-4" />
            <span>SHAPEFILE ATTRIBUTE TABLE (QGIS SPEC)</span>
          </div>
          <span className="text-[11px] text-neutral-500">
            {filteredFeatures.length} of {features.length} features selected
          </span>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search FID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-7 pr-2 py-1 rounded text-[11px] border outline-none ${
                isDark 
                  ? 'bg-[#141b16] border-[#243527] text-white focus:border-[#c6ff00]' 
                  : 'bg-white border-neutral-300 text-neutral-800'
              }`}
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-2 py-1 rounded text-[11px] border outline-none ${
              isDark ? 'bg-[#141b16] border-[#243527] text-white' : 'bg-white border-neutral-300'
            }`}
          >
            <option value="ALL">All Layers</option>
            <option value="PIT_BOUNDARY">PIT_BOUNDARY</option>
            <option value="BENCH_CREST">BENCH_CREST</option>
            <option value="HAUL_ROAD">HAUL_ROAD</option>
            <option value="BLAST_ZONE">BLAST_ZONE</option>
          </select>

          <button
            onClick={onQuickExportCSV}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] transition-colors ${
              isDark ? 'bg-[#141b16] border-[#253627] hover:bg-[#1b271e] text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300'
            }`}
            title="Export Table as CSV"
          >
            <Download className="w-3 h-3 text-[#c6ff00]" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:opacity-75 transition-opacity"
            title="Minimize Table"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto overflow-y-auto flex-1 font-mono-tech text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b text-[11px] ${
              isDark ? 'bg-[#0f1410] border-[#1e2a1f] text-neutral-400' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
            }`}>
              <th className="py-2 px-3 w-14">FID</th>
              <th className="py-2 px-3">NAME</th>
              <th className="py-2 px-3">TYPE</th>
              <th className="py-2 px-3">GEOM</th>
              <th className="py-2 px-3">AREA (HA)</th>
              <th className="py-2 px-3">PERIMETER (M)</th>
              <th className="py-2 px-3">VOLUME (M³)</th>
              <th className="py-2 px-3">STATE</th>
              <th className="py-2 px-3">DATE</th>
              <th className="py-2 px-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {filteredFeatures.map((f) => {
              const isSelected = f.id === selectedFeatureId;
              return (
                <tr
                  key={f.id}
                  onClick={() => setSelectedFeatureId(f.id)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-[#172319] text-[#c6ff00]'
                        : 'bg-emerald-50 text-emerald-900'
                      : isDark
                      ? 'hover:bg-[#121814]'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <td className="py-2 px-3 font-bold">{f.fid.toString().padStart(3, '0')}</td>
                  <td className="py-2 px-3 font-semibold text-white">
                    <input
                      type="text"
                      value={f.name}
                      onChange={(e) => handleUpdateName(f.id, e.target.value)}
                      className={`bg-transparent outline-none w-full border-b border-transparent focus:border-[#c6ff00] ${
                        isSelected ? 'font-bold' : ''
                      }`}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <span 
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ 
                        backgroundColor: `${f.color}20`, 
                        color: f.color, 
                        border: `1px solid ${f.color}40` 
                      }}
                    >
                      {f.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-neutral-400">{f.geometryType}</td>
                  <td className="py-2 px-3 font-bold text-white">
                    {f.areaHa > 0 ? f.areaHa.toFixed(1) : '-'}
                  </td>
                  <td className="py-2 px-3 text-neutral-300">
                    {f.perimeterM.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-sky-400">
                    {f.volumeM3 ? f.volumeM3.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-[10px] font-bold ${
                      f.state === 'EDITING' ? 'text-[#c6ff00]' : 'text-emerald-400'
                    }`}>
                      {f.state}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-neutral-400 text-[10px]">{f.createdDate}</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={(e) => handleDeleteFeature(f.id, e)}
                      className="p-1 text-red-400 hover:text-red-300 rounded transition-colors"
                      title="Delete Vector"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
