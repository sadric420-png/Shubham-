
import React, { useState } from 'react';
import { 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ChevronRight, 
  MapPin, 
  Users,
  Database,
  RefreshCw,
  Plus
} from 'lucide-react';
import { AppStep, MasterRecord, SalesRecord, MissingParty, TemplateRow } from './types.ts';
import { readExcelFile, normalizeName, extractCoordinates, exportToExcel } from './excelUtils.ts';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD_INITIAL);
  const [masterData, setMasterData] = useState<MasterRecord[]>([]);
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [missingParties, setMissingParties] = useState<MissingParty[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [masterFileName, setMasterFileName] = useState<string>('');
  const [salesFileName, setSalesFileName] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'master' | 'sales') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const data = await readExcelFile(file);
      if (type === 'master') {
        setMasterData(data as MasterRecord[]);
        setMasterFileName(file.name);
      } else {
        setSalesData(data as SalesRecord[]);
        setSalesFileName(file.name);
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to read ${type} file. Please ensure it's a valid CSV or XLSX.`);
    }
  };

  const identifyMissingParties = () => {
    if (!masterData.length || !salesData.length) {
      setError("Please upload both Master and Sales files first.");
      return;
    }

    setIsProcessing(true);
    
    const masterNames = new Set(masterData.map(r => normalizeName(r["Party Name"])));
    const missing: MissingParty[] = [];

    salesData.forEach(sale => {
      const normName = normalizeName(sale["Party Name"]);
      if (!masterNames.has(normName)) {
        if (!missing.find(m => normalizeName(m.name) === normName)) {
          missing.push({
            name: sale["Party Name"],
            phone: sale["Phone No."] || '',
            address: ''
          });
        }
      }
    });

    setMissingParties(missing);
    setIsProcessing(false);
    
    if (missing.length > 0) {
      setCurrentStep(AppStep.VERIFY_MISSING);
    } else {
      setCurrentStep(AppStep.UPLOAD_TEMPLATE);
    }
  };

  const handleMissingPartyChange = (index: number, field: keyof MissingParty, value: string) => {
    const updated = [...missingParties];
    updated[index] = { ...updated[index], [field]: value };
    setMissingParties(updated);
  };

  const finalizeMissingParties = () => {
    const newMasterRecords: MasterRecord[] = missingParties.map(m => ({
      "Party Name": m.name,
      "Number": m.phone,
      "Address": m.address
    }));

    setMasterData(prev => [...prev, ...newMasterRecords]);
    setCurrentStep(AppStep.UPLOAD_TEMPLATE);
  };

  const processFinalReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const templateData = await readExcelFile(file) as TemplateRow[];
      
      const masterMap = new Map<string, MasterRecord>();
      masterData.forEach(m => masterMap.set(normalizeName(m["Party Name"]), m));

      const finalReport: TemplateRow[] = salesData.map(sale => {
        const normName = normalizeName(sale["Party Name"]);
        const master = masterMap.get(normName);
        const { lat, lng } = extractCoordinates(master?.Address || '');

        return {
          "Name": sale["Party Name"],
          "Latitude": lat || '',
          "Longitude": lng || '',
          "Address": master?.Address || '',
          "Phone": sale["Phone No."] || master?.Number || '',
          "Group": "",
          "Notes": ""
        };
      });

      exportToExcel(finalReport, "Updated_Route_Report.xlsx");
      setCurrentStep(AppStep.COMPLETE);
    } catch (err) {
      console.error(err);
      setError("Error generating final report.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <MapPin className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Excel Route Manager</h1>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className={currentStep >= AppStep.UPLOAD_INITIAL ? "text-blue-600" : ""}>Upload</span>
            <ChevronRight className="w-4 h-4" />
            <span className={currentStep >= AppStep.VERIFY_MISSING ? "text-blue-600" : ""}>Verify</span>
            <ChevronRight className="w-4 h-4" />
            <span className={currentStep >= AppStep.UPLOAD_TEMPLATE ? "text-blue-600" : ""}>Report</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Step {currentStep} of 4
            </h2>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div 
                  key={s} 
                  className={`h-1.5 w-12 rounded-full transition-colors duration-500 ${currentStep >= s ? 'bg-blue-600' : 'bg-slate-200'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {currentStep === AppStep.UPLOAD_INITIAL && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Database className="text-blue-600 w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Master Database</h3>
              <p className="text-slate-500 text-sm mb-6">Party Name, Number, Address</p>
              
              <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl py-8 px-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                {masterFileName ? (
                   <div className="flex items-center gap-2 text-blue-600 font-medium">
                     <CheckCircle2 className="w-5 h-5" />
                     <span className="truncate max-w-[200px]">{masterFileName}</span>
                   </div>
                ) : (
                  <>
                    <FileUp className="text-slate-400 mb-2 w-8 h-8" />
                    <span className="text-sm text-slate-600 font-medium">Click to upload Master File</span>
                  </>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => handleFileUpload(e, 'master')} 
                />
              </label>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <Users className="text-emerald-600 w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Current Sales File</h3>
              <p className="text-slate-500 text-sm mb-6">Party Name, Phone No.</p>

              <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl py-8 px-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                {salesFileName ? (
                   <div className="flex items-center gap-2 text-emerald-600 font-medium">
                     <CheckCircle2 className="w-5 h-5" />
                     <span className="truncate max-w-[200px]">{salesFileName}</span>
                   </div>
                ) : (
                  <>
                    <FileUp className="text-slate-400 mb-2 w-8 h-8" />
                    <span className="text-sm text-slate-600 font-medium">Click to upload Sales File</span>
                  </>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => handleFileUpload(e, 'sales')} 
                />
              </label>
            </div>

            <div className="md:col-span-2 flex justify-center mt-6">
              <button
                onClick={identifyMissingParties}
                disabled={!masterData.length || !salesData.length || isProcessing}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>Analyze Data <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === AppStep.VERIFY_MISSING && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Missing Parties Detected</h3>
                <p className="text-sm text-slate-500">Found {missingParties.length} parties in sales that are not in the master file.</p>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="text-amber-600 w-5 h-5" />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Party Name</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Address (Include GPS for Map)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {missingParties.map((party, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{party.name}</td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={party.phone}
                          onChange={(e) => handleMissingPartyChange(idx, 'phone', e.target.value)}
                          placeholder="0300-XXXXXXX"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={party.address}
                          onChange={(e) => handleMissingPartyChange(idx, 'address', e.target.value)}
                          placeholder="Main St, City (31.5 74.2)"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setCurrentStep(AppStep.UPLOAD_INITIAL)}
                className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800 transition-colors"
              >
                Back
              </button>
              <button 
                onClick={finalizeMissingParties}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold shadow-md shadow-blue-100 hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Update Master & Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === AppStep.UPLOAD_TEMPLATE && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-8">
                <FileUp className="text-indigo-600 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-800">Final Step: Upload Template</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Upload the route report template. The system will map all processed data and extract GPS coordinates from addresses to generate your final file.
              </p>
              
              <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl py-12 px-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group">
                <Plus className="text-slate-400 mb-3 w-10 h-10 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-semibold text-slate-700">Choose Template File</span>
                <span className="text-sm text-slate-400 mt-2">XLSX or CSV supported</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv, .xlsx, .xls"
                  onChange={processFinalReport} 
                  disabled={isProcessing}
                />
              </label>

              {isProcessing && (
                <div className="mt-8 flex items-center gap-3 text-indigo-600 font-medium">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating Report...
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === AppStep.COMPLETE && (
          <div className="max-w-xl mx-auto text-center">
            <div className="mb-10 inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-100">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Report Generated Successfully!</h2>
            <p className="text-slate-500 mb-10 text-lg">
              Your route report has been processed. All addresses were scanned for GPS coordinates and missing parties were integrated.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
