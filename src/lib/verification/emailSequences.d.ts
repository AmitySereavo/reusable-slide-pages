export function enrollEmailSequencesForTrigger(input: {
  triggerEvent: string;
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
  email?: string | null;
  name?: string | null;
  context?: Record<string, unknown> | null;
}): Promise<{
  enrolled: number;
  jobsCreated: number;
}>;

export function sendDueEmailSequenceJobs(input?: {
  limit?: number;
}): Promise<{
  processed: number;
  results: Array<Record<string, unknown>>;
}>;
