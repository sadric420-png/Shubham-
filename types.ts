
export interface MasterRecord {
  "Party Name": string;
  "Number": string;
  "Address": string;
}

export interface SalesRecord {
  "Party Name": string;
  "Phone No.": string;
}

export interface TemplateRow {
  "Name": string;
  "Latitude": string | number;
  "Longitude": string | number;
  "Address": string;
  "Phone": string;
  "Group": string;
  "Notes": string;
}

export interface MissingParty {
  name: string;
  phone: string;
  address: string;
}

export enum AppStep {
  UPLOAD_INITIAL = 1,
  VERIFY_MISSING = 2,
  UPLOAD_TEMPLATE = 3,
  COMPLETE = 4
}
