# Frame to Movies

Simple dark-mode dashboard that generates a connected multi-scene movie from:

- one scenario prompt (up to 1000 chars),
- one uploaded frame-0 image,
- number of scenes (X),
- one aspect ratio used for all scenes.

The app uses Replicate (BLIP-2 + VEO 3.1) and FFmpeg to:

1. Describe the start frame,
2. Build scene prompt 0,
3. Generate scene 0 video,
4. Extract the last frame,
5. Repeat for all scenes while preserving context,
6. Concatenate all scene videos into one final movie.

## Requirements

- Node.js 20+
- FFmpeg and FFprobe installed and available in `PATH`
- Replicate API token

## Environment variables

Create `.env.local`:

```bash
REPLICATE_API_TOKEN=your_token_here
# (or REPLICATE_API_KEY)
```

## Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## API routes

- `POST /api/generate` - accepts multipart form: `scenario`, `scenes`, `aspectRatio`, `image`
- `POST /api/delete` - deletes generated movie from `/public/generated`
