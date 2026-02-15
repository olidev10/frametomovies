export function buildScenePrompt(params: {
  scenario: string;
  frameDescription: string;
  sceneIndex: number;
  totalScenes: number;
  previousPrompt?: string;
}) {
  const { scenario, frameDescription, sceneIndex, totalScenes, previousPrompt } = params;

  return [
    `You are generating scene ${sceneIndex + 1} of ${totalScenes} for a coherent cinematic sequence.`,
    `Global scenario: ${scenario}`,
    `Current start frame description: ${frameDescription}`,
    previousPrompt
      ? `Continuity from previous scene prompt: ${previousPrompt}`
      : "This is the opening scene, establish setting and character motion clearly.",
    "Write one compact action prompt (max 80 words) describing camera movement, subject action, environment continuity, and sound-relevant events.",
  ].join("\n");
}
