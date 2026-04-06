export type ZoneStatus = string;

export interface Location {
  id: string;
  name: string;
  rsqFootage: number;
  startRentPerMonth: number;
  tiPerSqft: number;
  lossFactor: number;
  description?: string;
  indoor?: boolean;
  outdoor?: boolean;
  floor?: string;
}

export interface Zone {
  id: string;
  name: string;
  location: string;
  description: string;
  status: ZoneStatus;
  phase: string;
  sqft: number;
  buildCostPerSqft: number;
  personalization?: boolean;
  appIntegration?: boolean;
  configurableProgram?: boolean;
  potentialLocations?: string[];
}

export interface ZoneStatusOption {
  id: string;
  name: string;
}

export interface MerchItem {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  status: ZoneStatus;
}

export interface FnBItem {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  status: ZoneStatus;
}

export interface ProgramItem {
  id: string;
  name: string;
  location: string;
  phase: string;
  description: string;
  status: ZoneStatus;
  // Features
  content?: boolean;
  performers?: boolean;
  services?: boolean;
  personalization?: boolean;
  appIntegration?: boolean;
  configurableProgram?: boolean;
}
