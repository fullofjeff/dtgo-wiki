export type AppFeatureStatus = 'planned' | 'in-development' | 'live' | 'deprecated';

export interface AppFeature {
  id: string;
  name: string;
  description: string;
  status: AppFeatureStatus;
  category: string;
  priority: string;
}

export interface ExperienceTechnology {
  id: string;
  name: string;
  description: string;
  type: string;
  vendor: string;
  status: string;
  costEstimate: number;
  zone: string;
  location: string;
}
