const REPLICATE_API_BASE = "https://api.replicate.com/v1";

function getApiKey() {
  const apiKey = process.env.REPLICATE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing REPLICATE_API_TOKEN (or REPLICATE_API_KEY) environment variable.");
  }

  return apiKey;
}

type PredictionResponse = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string;
};

export async function createPrediction(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${REPLICATE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Replicate create prediction failed (${response.status}): ${text}`);
  }

  return (await response.json()) as PredictionResponse;
}

export async function getPrediction(predictionId: string) {
  const response = await fetch(`${REPLICATE_API_BASE}/predictions/${predictionId}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Replicate fetch prediction failed (${response.status}): ${text}`);
  }

  return (await response.json()) as PredictionResponse;
}

export async function waitForPrediction(
  predictionId: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
) {
  console.log("waitForPrediction", predictionId);
  const timeoutMs = options.timeoutMs ?? 12 * 60 * 1000; // 12 minutes
  const intervalMs = options.intervalMs ?? 5000; // 5 seconds
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const prediction = await getPrediction(predictionId);

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(prediction.error || `Prediction ${prediction.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Prediction timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
}

export async function runPrediction(path: string, body: Record<string, unknown>) {
  const created = await createPrediction(path, body);

  if (created.status === "succeeded") {
    return created;
  }

  if (created.status === "failed" || created.status === "canceled") {
    throw new Error(created.error || `Prediction ${created.status}`);
  }

  return waitForPrediction(created.id);
}
