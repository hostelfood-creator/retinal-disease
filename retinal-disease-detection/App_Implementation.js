import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend, CartesianGrid
} from 'recharts';
import {
  Upload, FileImage, Activity, Download, Trash2, Eye,
  AlertTriangle, CheckCircle, Loader2, BarChart3, PieChart as PieChartIcon,
  TrendingUp, Shield
} from 'lucide-react';
import './App.css';

const SEVERITY_COLORS = {
  Normal: '#22c55e',
  Mild: '#eab308',
  Moderate: '#f97316',
  Severe: '#ef4444',
  Proliferative: '#dc2626'
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const SEVERITY_BADGES = {
  Normal: 'bg-green-100 text-green-800 border-green-200',
  Mild: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Moderate: 'bg-orange-100 text-orange-800 border-orange-200',
  Severe: 'bg-red-100 text-red-800 border-red-200',
  Proliferative: 'bg-red-200 text-red-900 border-red-300'
};

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');

  const onDrop = useCallback(acceptedFiles => {
    const validFiles = acceptedFiles.slice(0, 10);
    setFiles(validFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    })));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpeg', '.jpg'] }
  });

  const handleUpload = async () => {
    setLoading(true);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await axios.post('http://localhost:8000/api/v1/predict/batch', formData);
      setResults(res.data.results);
      setActiveTab('results');
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDownloadReport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await axios.post('http://localhost:8000/api/v1/report/generate', formData, {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Patient_Report_${file.name}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setResults([]);
    setSelectedResult(null);
    setActiveTab('upload');
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (results.length === 0) return null;
    const counts = {};
    results.forEach(r => {
      counts[r.diagnosis] = (counts[r.diagnosis] || 0) + 1;
    });
    const abnormalCount = results.filter(r => r.diagnosis !== 'Normal').length;
    const highRisk = results.filter(r => r.diagnosis === 'Severe' || r.diagnosis === 'Proliferative').length;
    const pieData = Object.entries(counts).map(([name, value]) => ({ name, value }));

    return { counts, abnormalCount, highRisk, total: results.length, pieData };
  }, [results]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Retinal Disease Detection
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-Powered Diabetic Retinopathy Screening
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                AI Model Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {[
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'results', label: 'Results', icon: BarChart3, disabled: results.length === 0 },
            { id: 'analytics', label: 'Analytics', icon: PieChartIcon, disabled: results.length === 0 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-foreground shadow-sm'
                  : tab.disabled
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Dropzone Card */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-primary" />
                  Upload Fundus Images
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload up to 10 retinal fundus images for AI-powered disease detection
                </p>
              </div>
              <div className="p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-slate-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-foreground font-medium">
                    {isDragActive ? 'Drop images here...' : 'Drag & drop fundus images here'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse (PNG, JPEG, JPG)
                  </p>
                </div>

                {/* Image Previews */}
                {files.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-foreground">
                        {files.length} image{files.length > 1 ? 's' : ''} selected
                      </p>
                      <button
                        onClick={handleClear}
                        className="text-sm text-destructive hover:text-destructive/80 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear all
                      </button>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                      {files.map((file, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={file.preview}
                            alt={`preview-${i}`}
                            className="w-full aspect-square object-cover rounded-lg border border-border"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleUpload}
                    disabled={files.length === 0 || loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium text-sm shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        Analyze Images
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && results.length > 0 && (
          <div className="space-y-6">
            {/* Summary Cards */}
            {summaryStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={FileImage}
                  label="Total Scans"
                  value={summaryStats.total}
                  color="blue"
                />
                <StatCard
                  icon={CheckCircle}
                  label="Normal"
                  value={summaryStats.total - summaryStats.abnormalCount}
                  color="green"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Abnormal"
                  value={summaryStats.abnormalCount}
                  color="orange"
                />
                <StatCard
                  icon={Shield}
                  label="High Risk"
                  value={summaryStats.highRisk}
                  color="red"
                />
              </div>
            )}

            {/* Results Table */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Diagnosis Results
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">File Name</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Diagnosis</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Confidence</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Probability Distribution</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((row, idx) => {
                      const chartData = Object.keys(row.probabilities).map(key => ({
                        name: key,
                        value: row.probabilities[key]
                      }));
                      const maxProb = Math.max(...Object.values(row.probabilities));

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedResult(idx)}
                        >
                          <td className="px-6 py-4 text-sm text-muted-foreground">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {files[idx] && (
                                <img
                                  src={files[idx].preview}
                                  alt=""
                                  className="w-10 h-10 rounded-md object-cover border border-border"
                                />
                              )}
                              <span className="text-sm font-medium text-foreground">{row.filename}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${SEVERITY_BADGES[row.diagnosis] || 'bg-gray-100 text-gray-800'}`}>
                              {row.diagnosis}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-muted rounded-full h-2">
                                <div
                                  className="h-2 rounded-full"
                                  style={{
                                    width: `${maxProb}%`,
                                    backgroundColor: SEVERITY_COLORS[row.diagnosis]
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium text-foreground">{maxProb.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4" style={{ minWidth: '280px' }}>
                            <ResponsiveContainer width="100%" height={60}>
                              <BarChart data={chartData} layout="vertical">
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 10 }} />
                                <Tooltip
                                  formatter={(val) => `${val}%`}
                                  contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(214.3 31.8% 91.4%)' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                  {chartData.map((entry, i) => (
                                    <Cell key={i} fill={SEVERITY_COLORS[entry.name] || PIE_COLORS[i]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadReport(files[idx]); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF Report
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed View Modal */}
            {selectedResult !== null && results[selectedResult] && (
              <DetailPanel
                result={results[selectedResult]}
                file={files[selectedResult]}
                onClose={() => setSelectedResult(null)}
              />
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && results.length > 0 && summaryStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Diagnosis Distribution Pie Chart */}
              <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-primary" />
                    Diagnosis Distribution
                  </h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={summaryStats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                      >
                        {summaryStats.pieData.map((entry, i) => (
                          <Cell key={i} fill={SEVERITY_COLORS[entry.name] || PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Average Probabilities Radar */}
              <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Average Risk Profile
                  </h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={getAverageRadarData(results)}>
                      <PolarGrid stroke="hsl(214.3 31.8% 91.4%)" />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="Avg Probability"
                        dataKey="value"
                        stroke="hsl(221.2 83.2% 53.3%)"
                        fill="hsl(221.2 83.2% 53.3%)"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                      <Tooltip formatter={(val) => `${val.toFixed(1)}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Severity Comparison Bar Chart */}
              <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden lg:col-span-2">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Per-Image Severity Breakdown
                  </h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={results.map((r, i) => ({
                      name: r.filename.length > 12 ? r.filename.substring(0, 12) + '...' : r.filename,
                      ...r.probabilities
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val) => `${val}%`}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(214.3 31.8% 91.4%)' }}
                      />
                      <Legend />
                      {Object.keys(SEVERITY_COLORS).map(key => (
                        <Bar key={key} dataKey={key} stackId="a" fill={SEVERITY_COLORS[key]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Retinal Disease Detection System &middot; Powered by DenseNet121 AI Model &middot; For Clinical Research Use
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---- Helper Components ----

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ result, file, onClose }) {
  const radarData = Object.entries(result.probabilities).map(([key, val]) => ({
    category: key,
    value: val
  }));

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Detailed Analysis: {result.filename}
        </h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm px-3 py-1 rounded-md border border-border hover:bg-muted transition-colors"
        >
          Close
        </button>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Image */}
        <div className="flex flex-col items-center">
          {file && (
            <img
              src={file.preview}
              alt={result.filename}
              className="w-full max-w-[224px] rounded-lg border border-border shadow-sm"
            />
          )}
          <span className={`mt-3 inline-flex px-3 py-1.5 rounded-full text-sm font-semibold border ${SEVERITY_BADGES[result.diagnosis]}`}>
            {result.diagnosis} Retinopathy
          </span>
        </div>

        {/* Probability Bars */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Probability Breakdown</h4>
          {Object.entries(result.probabilities).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">{key}</span>
                <span className="font-medium text-foreground">{val}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${val}%`, backgroundColor: SEVERITY_COLORS[key] }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Radar Chart */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Risk Radar</h4>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(214.3 31.8% 91.4%)" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar
                dataKey="value"
                stroke="hsl(221.2 83.2% 53.3%)"
                fill="hsl(221.2 83.2% 53.3%)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip formatter={(val) => `${val}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function getAverageRadarData(results) {
  if (results.length === 0) return [];
  const sums = {};
  const categories = Object.keys(results[0].probabilities);
  categories.forEach(c => { sums[c] = 0; });
  results.forEach(r => {
    categories.forEach(c => {
      sums[c] += r.probabilities[c];
    });
  });
  return categories.map(c => ({
    category: c,
    value: sums[c] / results.length
  }));
}

export default App;
