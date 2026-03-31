<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/121M4Ah-OWXUpdNC-MGaEFF6V6VNo4rmG

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` (see `.env.example`) and set:
   - `VITE_USE_MOCK=true` (mock/localStorage) OR
   - `VITE_USE_MOCK=false` + `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (live Supabase)
3. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key (if using AI features)
4. Run the app:
   `npm run dev`
