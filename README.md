# Kreedex

**Phone-based grassroots sports talent screening.** *Kreedex = Kreeda (sport) + Index.*

Prototype for the **Seva First Innovation Challenge 2026**, problem statement **PS000014**: *Develop an accessible solution for identifying sports talent at the grassroots level* (Sports, Youth & Cultural Activities Department, Government of Gujarat).

**Live demo:** https://kreedex.vercel.app/

> **This is a prototype.** Scores use placeholder reference values, not official norms, and the app has no login or shared server. See [Limitations](#limitations).

## The problem

Talent scouting depends on trials, camps and trained scouts, which reach few children. Children in rural, tribal and government-school settings are rarely tested, and results from different trials are hard to compare. Hardware-based testing (timing gates, sensors) is costly to carry to villages.

## What Kreedex does

1. **Register** a child with mandatory parent/guardian consent and minimal data.
2. **Run a test.** A teacher props up a phone; on-screen guidance and a short stand-still calibration set the scale from the child's registered height.
3. **Measure on the device.** Pose estimation (MediaPipe) runs in the browser. Video is never recorded, saved or uploaded.
4. **Score.** Each result is compared with reference values for the child's age and gender and converted to a 1-99 score. The **Kreedex Score** is the average of the available tests.
5. **Profile.** Results, history and a progress chart per child, with print / save as PDF.
6. **Scout dashboard.** Filters (district, gender, age group, minimum score, pipeline status), a shortlist pipeline (Shortlisted, Invited to trial, Trial done, Enrolled), a district coverage view and CSV export. In this prototype it is demonstrated with clearly labelled sample data.

Other features: English, Gujarati and Hindi interface (the scout dashboard is English only), installable PWA that works offline after a one-time download, and a privacy page with a delete-all option.

## Tests in this prototype

| Test | How it is measured |
|---|---|
| Vertical jump | Rise of the hip landmark during a jump, converted to cm using the child's height. Up to 3 attempts; the best is saved. |
| Single-leg balance | Time until the raised foot touches down or the standing foot moves (max 60 s), plus a hip-sway indicator. Up to 3 attempts. |

Attempts are rejected, with a reason shown, when the child or phone moves during calibration, the body leaves the frame, or no jump is detected. Standing broad jump is planned for the next version.

## How scoring works

`src/benchmarks.js` holds reference means and spreads by age and gender; `src/scoring.js` converts a result to a normal-curve percentile (1-99) and maps it to Standout / Strong / On track / Developing / Building.

**The reference values are placeholders for the prototype and are not official norms.** The Fit India / Khelo India fitness protocols for ages 5-18 publish official benchmarks for a different set of tests (plate tapping, flamingo balance, curl-ups, push-ups, sit-and-reach, 600 m, 50 m dash and BMI). Vertical jump and timed single-leg balance are not in those tables, so validated norms are needed before the scores are used for real decisions. The score is a screening indicator, not a diagnosis or a prediction of future talent.

## Tech stack

- React + Vite
- MediaPipe Tasks Vision, Pose Landmarker (lite), running in the browser via WebAssembly
- Dexie (IndexedDB) for on-device storage
- Service worker + web app manifest (installable, offline)
- Plain CSS and SVG charts
- Hosted on Vercel

## Run locally

```bash
npm install
npm run dev
```

The camera needs HTTPS or `localhost`. To test the service worker and offline mode, use a production build:

```bash
npm run build
npm run preview
```

## Project structure

```
public/            icons, manifest, service worker, pose model and wasm files
scripts/           make-offline-list.mjs (lists files to cache for offline use)
src/
  App.jsx, main.jsx, index.css
  db.js, districts.js, demoData.js
  benchmarks.js, scoring.js
  jump.js, balance.js, pose.js
  lang.js, LangProvider.jsx, LangSwitch.jsx, strings.js
  offline.js, registerSW.js, OfflineBox.jsx, Welcome.jsx
  screens/         Register, Children, Profile, RunTest, PoseCamera,
                   JumpTest, BalanceTest, Dashboard, Privacy
```

## Privacy

Everything is stored in the browser on the device (IndexedDB). There is no account and no server for user data. Video is analysed on the phone and not saved or uploaded. Parent/guardian consent is required to register a child. Data can be deleted per child or all at once. See the Privacy page in the app.

## Limitations

- **Placeholder reference values**, not official norms. Sway ratings are also placeholder cut-offs.
- **Not yet validated** against manual measurements (see the table below).
- **No login and no shared backend.** The dashboard shows only data stored on that device, and the sample data is synthetic. A real deployment needs accounts, roles, sync and secure storage.
- **Two tests only.** Phone-video measurement depends on a steady phone and the whole body in frame.
- **Legal review needed** under applicable data-protection law before real use with children.
- Translations are in `src/strings.js` and may need further review.

## Validation status

| Test | Method | Trials | Result |
|---|---|---|---|
| Vertical jump | App vs. tape-measured jump | [n] | [add after testing] |
| Single-leg balance | App vs. stopwatch | [n] | [add after testing] |

## Roadmap

1. Validate against manual measurements and coach assessments; replace placeholder norms.
2. Add standing broad jump and tests with published Khelo India norms (for example push-ups).
3. Backend with login, roles and sync; shared scout dashboard.
4. Teacher training and a district pilot.

## Credits

Built by Harsheel Kumar Sahoo, Sardar Vallabhbhai National Institute of Technology, Surat, for the Seva First Innovation Challenge 2026. Pose estimation by Google MediaPipe. Reference material: Fit India Mission, *Fitness Protocols and Guidelines for Age 5-18 Years*.