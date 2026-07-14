export interface VercelRequest {
  method?: string;
  body: any;
  query: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}

export interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): unknown;
  end(): unknown;
}
