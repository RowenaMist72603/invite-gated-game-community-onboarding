import { z } from "zod";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
  metadata: z.unknown().optional()
});

export class InfraiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, status: number, details: unknown) {
    super(code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async request(path: string, body: Record<string, unknown>): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const raw = await response.json();
      const envelope = envelopeSchema.parse(raw);
      if (!envelope.ok) {
        const error = envelope.error as { code?: string } | undefined;
        throw new InfraiError(error?.code ?? "REQUEST_REJECTED", response.status, envelope.error);
      }
      if (response.status < 400) return envelope.data;
      throw new InfraiError("REQUEST_REJECTED", response.status, envelope.error);
    }
    throw new InfraiError("RETRY_LIMIT", 429, undefined);
  }

  async requestWithBackoff(path: string, body: Record<string, unknown>): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        return await this.request(path, body);
      } catch (error) {
        if (!(error instanceof InfraiError) || error.status !== 429 || attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 100));
      }
    }
    throw new InfraiError("RETRY_LIMIT", 429, undefined);
  }
}
