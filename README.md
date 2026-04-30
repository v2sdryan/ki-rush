# Ki Rush v1.2

Ki Rush is a deployable browser tower-defense game inspired by anime energy battles. It uses original generated art assets instead of copyrighted Dragon Ball characters, so the project is safer to publish publicly.

## Game

- Build energy towers on glowing pads.
- Choose from five anime-inspired fighter towers with different cost, damage, range, and attack speed.
- Mobile tap controls: tap an empty pad to open fighter selection, tap a fighter to upgrade or view stats.
- Start waves of alien raiders and boss enemies.
- Earn coins from defeated enemies.
- Upgrade built fighters by clicking them, then spending coins.
- Survive 8 waves to defend the valley.

## Tower Values

| Fighter | Build Cost | First Upgrade | Power | Range | Attack Speed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Blue Brawler | 60 coins | 42 coins | 24 | 168 | 1.39/s |
| Gold Striker | 95 coins | 67 coins | 58 | 128 | 0.95/s |
| Mystic Beam | 85 coins | 59 coins | 36 | 225 | 0.82/s |
| Speed Spark | 55 coins | 39 coins | 13 | 138 | 2.63/s |
| Guard Wave | 80 coins | 56 coins | 18 | 155 | 1.05/s |

Upgrades increase power, range, and attack speed. Current coins, build cost, upgrade cost, power, range, and attack speed are shown in-game when selecting a fighter.

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

## GitHub Pages

The repo includes a GitHub Actions workflow that builds `dist` and deploys GitHub Pages on every push to `master`.

Live page:

```text
https://v2sdryan.github.io/ki-rush/
```

## Assets

Generated with the built-in image generation skill:

- `public/assets/map.png`
- `public/assets/hero.png`
- `public/assets/tower-heavy.png`
- `public/assets/tower-mystic.png`
- `public/assets/tower-speed.png`
- `public/assets/tower-guardian.png`
- `public/assets/enemy.png`
- `public/assets/enemy-fast.png`
- `public/assets/enemy-tank.png`
- `public/assets/boss.png`

The character prompts intentionally describe original anime-inspired fighters and enemies, not direct Dragon Ball characters, logos, or symbols.
