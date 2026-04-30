# Ki Rush

Ki Rush is a deployable browser tower-defense game inspired by anime energy battles. It uses original generated art assets instead of copyrighted Dragon Ball characters, so the project is safer to publish publicly.

## Game

- Build energy towers on glowing pads.
- Start waves of alien raiders and boss enemies.
- Earn ki from defeated enemies.
- Upgrade built towers by clicking them.
- Survive 8 waves to defend the valley.

## Local Development

```bash
npm install
npm run dev
```

## Deploy To Vercel

1. Push this folder to GitHub.
2. In Vercel, import the GitHub repository.
3. Use these settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy.

## Assets

Generated with the built-in image generation skill:

- `public/assets/map.png`
- `public/assets/hero.png`
- `public/assets/enemy.png`
- `public/assets/boss.png`

The character prompts intentionally describe original anime-inspired fighters and enemies, not direct Dragon Ball characters, logos, or symbols.
