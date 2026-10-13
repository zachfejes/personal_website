# Design references

Working files from the hero/visual-direction exploration. These are standalone HTML tools, not part
of the Angular app.

| File                                            | What it is                                                                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `snapshots/hero-tuner-2026-10-13-final.html`    | The Hero Tuner when the final baseline was chosen (artifact version 13, `1791852664-0d64`), with preset "E3 Experiments".                    |
| `hero-baseline.json`                            | The final hero settings (based on preset "E3 Experiments"). Source of truth for milestone 2. The earlier E2-based version is in git history. |
| `snapshots/hero-tuner-2026-10-13-baseline.html` | The Hero Tuner exactly as it was when the baseline was chosen (published artifact version 11, `1791849135-62f8`).                            |
| `snapshots/design-directions-round-2.html`      | Round 2 of the design-direction mock-ups (Hearth / Survey / Site Model).                                                                     |

To restore the baseline: open the snapshot tuner in a browser, pick "E2 Baseline · fluid", and paste
the values from `hero-baseline.json`, or republish the snapshot file as the artifact.

Live artifacts: Hero Tuner https://claude.ai/artifact/Uwob5mb8QE5Zk3hBKcvYw7 and Design Directions
https://claude.ai/artifact/L25cmzWXKWierxzVVEYi8d (each keeps its own version history).
