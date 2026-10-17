# Kreedex

**Phone-based grassroots sports talent screening.** *Kreedex = Kreeda (sport) + Index.*

Prototype for the **Seva First Innovation Challenge 2026**, problem statement **PS000014**: *Develop an accessible solution for identifying sports talent at the grassroots level* (Sports, Youth & Cultural Activities Department, Government of Gujarat).

**Live demo:** https://kreedex.vercel.app/

> **This is a prototype.** The Kreedex Score uses placeholder reference values, the login is a demonstration (not secure), and there is no shared server. Camera counting accuracy is still being validated. See [Limitations](#limitations).

## Quick tour for judges

1. Open the live link on a phone or laptop. Choose **School teacher**, pick *Demo Teacher*, enter PIN **1111**.
2. **Register a child** (use a team member or adult, not a real child). Tick the consent box. School and district are locked to the teacher's account.
3. **Run a test:** vertical jump, single-leg balance, push-ups (camera), or Flamingo balance for ages 5 to 8. Allow the camera when asked. Save a result.
4. Open **Registered children → View profile** to see the Kreedex Score, the official Khelo India levels, history and a progress chart.
5. Tap **Sign out**, then choose **Sports official**, PIN **2222**. Open the **Scout dashboard** and press **Load sample data**. Try the filters, the shortlist pipeline and the district coverage view.
6. Try the language switch (English, Gujarati, Hindi), **Sound and accessibility**, and **Prepare for offline use** on the home screen.

The demo PINs are shown on the sign-in screen on purpose, so judges can try both roles.

## The problem

Talent screening depends on trained staff, stopwatches, tape measures and trial events, which reach few children. Children in rural, tribal and government-school settings are rarely tested, and results from different people are hard to compare.

## What Kreedex does

1. **Sign in** as a school teacher or a sports official (demo PIN login).
2. **Register** a child with mandatory parent/guardian consent and minimal data.
3. **Run guided camera tests.** A phone on a stand watches the child, spoken and sound cues guide the attempt, and on-device pose estimation (MediaPipe) measures or counts the result. Video is never recorded, saved or uploaded.
4. **Score** the result: a Kreedex Score for two experimental tests, and official Khelo India levels where official tables exist.
5. **Profile:** history, progress chart, and print or save as PDF.
6. **Scout dashboard** for officials: filters, a shortlist pipeline, district coverage and CSV export, with names reduced to initials.

Also included: English, Gujarati and Hindi interface, spoken instructions and sound cues, larger-text and high-contrast modes, an installable app that works offline, and a privacy page with a delete-everything option.

## Tests

**Camera tests**

| Test | How it is measured |
|---|---|
| Vertical jump | Rise of the hip landmark during a jump, converted to cm using the child's registered height. Up to 3 attempts; the best is saved. |
| Single-leg balance | Time until the raised foot touches down or the standing foot moves (max 60 s), plus a hip-sway indicator. Up to 3 attempts. |
| Push-ups | Phone on the floor at the side, in landscape. Elbow-angle cycles are counted, with checks for depth and a straight back. Standard push-ups use the boys' table; modified push-ups (knees down) use the girls' table. |
| Flamingo balance (ages 5 to 8) | Counts falls (foot let go, raised foot touches the floor, or standing foot moves) during 60 seconds of balancing. This is a floor version of the beam test described in the Fit India document. |

Attempts are rejected, with a reason shown and spoken, when the child or phone moves during calibration, the body leaves the frame, or the form is poor.

**Hand-entered Khelo India tests** (the teacher types a result measured by hand): partial curl-ups, push-ups, sit-and-reach, 600 m run/walk, 50 m dash and Flamingo balance. These give official levels and also serve as the reference when checking the camera tests.

## How scoring works

Kreedex shows two separate things and does not blend them.

**1. Kreedex Score (experimental).** For vertical jump and single-leg balance, `src/benchmarks.js` holds reference means and spreads by age and gender, and `src/scoring.js` converts a result to a 1-99 percentile-style score with a label (Standout, Strong, On track, Developing, Building). **These reference values are placeholders and are not official norms.** Vertical jump and timed single-leg balance are not in the published Khelo India tables, so validated norms are needed before the score is used for real decisions.

**2. Official Khelo India levels.** For push-ups, Flamingo balance, curl-ups, sit-and-reach, 600 m and 50 m dash, `src/khelo.js` holds the Level 1 to 7 tables (2 to 10 points) transcribed from the Fit India Mission document *Fitness Protocols and Guidelines for Age 5-18 Years* (2020-21 baseline). Notes on the printed tables:

- Some bands are empty (for example "13 to 13"), so a few levels cannot be earned.
- Some Flamingo bands are only one or two falls wide, so a small counting error can change a level.
- The printed 600 m table for ages 14 and above has inconsistent values, so no level is shown for those ages. Ages 12 and 13 differ sharply from neighbouring ages and carry a caution.
- The document says these tables are a baseline that would be regenerated from national data, so newer official tables should be checked.

The score is a screening indicator, not a diagnosis or a prediction of future talent.

## Roles and privacy

| | School teacher | Sports official |
|---|---|---|
| Register a child, run tests, enter results | Yes | No |
| Children visible | Own school only, full names | Dashboard only, names shown as initials |
| Guardian names | Yes | No |
| Delete results | Yes | No (read-only) |
| CSV export | n/a | Yes, no names |
| Area | Own school and district (locked) | All of Gujarat or one district |

- **Stored:** only what is entered: child's name, age, gender, height, school, district, the guardian's name, the time consent was given, and results.
- **Where:** only in the browser on the device (IndexedDB). There is no server for user data. The web host supplies the app files only.
- **Camera and video:** the camera is used only during a test. Video is analysed on the phone and is not recorded, saved or uploaded.
- **Consent:** required before a child can be registered. Data can be deleted per child or all at once from the Privacy page.
- **Login:** a demonstration of roles. PINs are salted hashes stored on the device, with a short lockout and an idle sign-out, but anyone with access to the device and its browser tools could still read the data. **It is not secure.**
- Before real use with children, the app would need server-verified accounts, secure storage and a legal review under the applicable data-protection law (for example India's DPDP Act, 2023).

## Languages and accessibility

- Interface in English, Gujarati and Hindi. The scout dashboard is English only. Core translations were checked by a native speaker; strings added later (voice, Khelo India tests, login) should be treated as drafts.
- Spoken instructions use the phone's own text-to-speech, so Gujarati and Hindi voices depend on the phone. Where no voice exists, sound cues and on-screen text are used instead. A settings screen shows what the phone supports.
- Sound cues, larger text and buttons, high contrast, keyboard focus outlines, and screen-reader announcements for test cues.

## Offline use

Kreedex is an installable web app (PWA). After a one-time download of the app files and the pose model (a few tens of MB, shown in the app), tests, registration, profiles and language switching work without internet. Data stays on the device. **There is no sync yet:** each device keeps its own data.

## Tech stack

- React + Vite
- MediaPipe Tasks Vision, Pose Landmarker (lite), running in the browser via WebAssembly
- Dexie (IndexedDB) for on-device storage
- Service worker and web app manifest (installable, offline)
- Browser speech synthesis and Web Audio for voice and beeps
- Plain CSS and SVG charts
- Hosted on Vercel

Tested on: [phone model, browser] and [laptop browser].

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
  benchmarks.js, scoring.js, khelo.js
  jump.js, balance.js, pushup.js, flamingo.js, pose.js
  auth.js, AuthProvider.jsx, AccountBar.jsx
  lang.js, LangProvider.jsx, LangSwitch.jsx, strings.js
  speech.js, settings.js, SettingsProvider.jsx
  offline.js, registerSW.js, OfflineBox.jsx, Welcome.jsx
  screens/         Login, Register, Children, Profile, RunTest, PoseCamera,
                   JumpTest, BalanceTest, PushupTest, FlamingoTest,
                   ManualTests, Dashboard, Settings, Privacy
```

## Limitations

- **Placeholder reference values** for the Kreedex Score (vertical jump, single-leg balance), and placeholder sway cut-offs. These are not official norms.
- **Not yet validated.** The jump, balance, push-up and Flamingo thresholds were set and tuned on a small number of trials. Accuracy against hand measurement is still being checked (see the table below).
- **Phone-camera measurement** depends on a steady phone, good light, a plain background and the whole body in frame. Counts can miss or add a repetition. The app tells the teacher to count by eye too when a result matters.
- **Flamingo balance is a floor version.** The official description uses a beam or an even, non-slippery surface, and the printed tables do not say which was used for the norms.
- **Demo login only,** and **no shared backend.** Data stays on each device. The scout dashboard shows real data only when it is on the same device, and the sample data is synthetic. A real deployment needs server-verified accounts, roles, sync and secure storage.
- **No export/import between devices** yet.
- **Khelo India tables were transcribed by hand** and spot-checked against the source. They should be re-verified, and newer official tables checked, before real use.
- **Test coverage:** the plate-tapping test (the other ages 5-8 test), broad jump, and camera counting of curl-ups, sit-and-reach and running are not built.
- **Spoken Gujarati and Hindi** depend on the phone's installed voices.
- **Legal review** under applicable data-protection law is needed before real use with children.

## Validation status

Camera result compared with a hand measurement of the same attempt. Use adult volunteers and keep the setup the same.

| Test | Compared with | Trials | Average difference | Exact matches |
|---|---|---|---|---|
| Push-ups | Count by eye | [n] | [add after testing] | [n of n] |
| Flamingo falls | Count by eye | [n] | [add after testing] | [n of n] |
| Single-leg balance time | Stopwatch | [n] | [add after testing] | n/a |
| Vertical jump | Tape-measured jump | planned | planned | n/a |

## Roadmap

1. Complete validation against hand measurement; replace placeholder norms with validated ones.
2. Export and import between devices; then a backend with server-verified accounts, roles and sync, after a legal review.
3. More tests: plate tapping, standing broad jump, and camera support for further Khelo India tests.
4. Teacher training and a district pilot.
5. Parent report card in three languages with development tips.

## References

- Fit India Mission, *Fitness Protocols and Guidelines for Age 5-18 Years* (Ministry of Youth Affairs and Sports, with the Ministry of Health and Family Welfare).
- Google MediaPipe Pose Landmarker.
- Seva First Innovation Challenge 2026, problem statement PS000014.

## Credits

Built by Harsheel Kumar Sahoo, Sardar Vallabhbhai National Institute of Technology, Surat, for the Seva First Innovation Challenge 2026.
