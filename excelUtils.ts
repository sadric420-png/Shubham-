
import * as XLSX from 'xlsx';

/**
 * Normalizes party names for comparison
 */
export const normalizeName = (name: string): string => {
  return (name || '').trim().toLowerCase();
};

/**
 * Extract GPS coordinates from an address string
 * Matches patterns like "31.65 74.89" or "31.65, 74.89"
 */
export const extractCoordinates = (address: string): { lat: string; lng: string } => {
  if (!address) return { lat: '', lng: '' };
  
  // Regular expression to find pairs of decimal numbers
  const coordRegex = /(-?\d+\.\d+)\s*,?\s*(-?\d+\.\d+)/;
  const match = address.match(coordRegex);
  
  if (match) {
    return {
      lat: match[1],
      lng: match[2]
    };
  }
  
  return { lat: '', lng: '' };
};

/**
 * Read an Excel/CSV file and return JSON data
 */
export const readExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * Export data to an Excel file
 */
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Route Report");
  XLSX.writeFile(workbook, fileName);
};
