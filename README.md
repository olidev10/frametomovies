# Frame to Movies

> Generate a full multi-scene AI movie from a single image and a text prompt.

Frame to Movies is an AI-powered web app that turns a starting frame and a scenario 
into a complete, concatenated video — scene by scene, preserving visual continuity 
throughout the entire movie.

## How it works

1. Upload a **starting frame** (image)
2. Write a **scenario prompt** (up to 1000 chars)
3. Choose the **number of scenes** and **aspect ratio**
4. The app automatically:
   - Describes the starting frame (BLIP-2)
   - Generates scene 0 video (VEO 3.1 via Replicate)
   - Extracts the last frame of each scene
   - Uses it as the starting frame for the next scene
   - Concatenates all scenes into one final movie (FFmpeg)

## Tech Stack

- **Next.js** (App Router) + **TypeScript**
- **Replicate API** — BLIP-2 (image captioning) + VEO 3.1 (video generation)
- **FFmpeg** — video concatenation
- **Tailwind CSS** — dark mode UI

## Getting Started

**Requirements:** Node.js 20+, FFmpeg in PATH, Replicate API token
```bash
git clone https://github.com/olidev10/frametomovies.git
cd frametomovies
pnpm install
pnpm dev
```

Create `.env.local`:
```
REPLICATE_API_TOKEN=your_token_here
```

Open `http://localhost:3000`

## API Routes

- `POST /api/generate` — accepts `scenario`, `scenes`, `aspectRatio`, `image`
- `POST /api/delete` — removes generated movie from `/public/generated`
