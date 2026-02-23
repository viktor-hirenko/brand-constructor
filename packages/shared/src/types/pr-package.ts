export interface PrPackage {
  id: string;
  number: number;
  name: string;
  description: string;
  teams_involved: string;
  goals: string;
  components_list: string;
  timeline: string;
  expenses: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePrPackagePayload {
  number: number;
  name: string;
  description: string;
  teams_involved: string;
  goals: string;
  components_list: string;
  timeline: string;
  expenses: string;
}

export interface UpdatePrPackagePayload {
  name?: string;
  description?: string;
  teams_involved?: string;
  goals?: string;
  components_list?: string;
  timeline?: string;
  expenses?: string;
  status?: string;
}
