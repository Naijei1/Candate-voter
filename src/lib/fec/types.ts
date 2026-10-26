/** Fields read from `GET /v1/efile/form2/`. Address fields are intentionally absent. */
export type FecForm2Filing = {
  candidate_id?: string | null;
  candidate_first_name?: string | null;
  candidate_middle_name?: string | null;
  candidate_last_name?: string | null;
  candidate_name?: string | null;
  candidate_office?: string | null;
  candidate_party?: string | null;
  candidate_district?: string | null;
  election_state?: string | null;
  election_year?: string | number | null;
  file_number?: number | string | null;
  image_number?: string | null;
  load_timestamp?: string | null;
  pdf_url?: string | null;
};

export type FecForm2Page = {
  api_version?: string;
  pagination?: {
    count?: number;
    page?: number;
    pages?: number;
    per_page?: number;
    is_count_exact?: boolean;
  };
  results?: FecForm2Filing[];
};

export type FecForm2Query = {
  minLoadTimestamp?: string | null;
  page?: number;
  perPage?: number;
  offices?: ReadonlyArray<"H" | "S" | "P">;
};
