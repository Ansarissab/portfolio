# Tasks

Working log for the portfolio rebuild. Ordered so fixes land before features.
Status: `[ ]` todo, `[~]` in progress, `[x]` done, `[!]` blocked on Muhammad.

---

## P0 - Correctness

- [x] **REGRESSION: 2 axe violations from my reviews rail.** Fixed. `role`
      and `aria-label` moved to the wrapping `div.scroller`; `tabindex="0"`
      stayed on the `<ul>`, which is the actual scroll container, so keyboard
      scrolling survives. Verified against the real accessibility tree, not the
      DOM: region is named, `<ul>` is back to implicit `list`, all 6 `<li>`
      resolve as `listitem`. axe reports 0 violations at 390 and 1440, dark and
      light.
- [x] **Prove nothing else was lost.** Done, by selector identity rather than
      line diff (a moved rule looks deleted to a line diff). Every baseline
      selector, at-rule, `@media`, `@supports`, `@keyframes`, `@font-face` and
      custom-property definition inventoried against `afbe57b`. Only genuinely
      absent rules: `.tgl .i-moon` and its two light-theme siblings, deliberate,
      the two-icon toggle became one morphing SVG and nothing references
      `i-moon`/`i-sun` anywhere. Every `var(--x)` with no definition is
      JS-written and carries a fallback. Nothing lost.
- [x] **Deck aria-live counter is stuck.** Fixed. `initDeck` hardcoded
      `"Card 1 of " + order.length`, so the live region announced the same
      ordinal forever while the cards rotated. Now tracks a real position index
      that wraps in both directions. Verified by simulating the exact logic:
      1 to 5, wraps to 1, and back down correctly.

## P1 - Consistency and weight

- [x] **Decide the payload.** Done: lazy-load chosen. Only gsap, ScrollTrigger,
      SplitText and ScrollSmoother now load eagerly (the hero needs them).
      The other six load on first scroll, first pointer, or idle, whichever
      comes first. `initMotion` split into eager plus a new `initLate`.
      Verified: the six are absent from the initial requests and arrive after
      DOMContentLoaded.
- [x] **Normalise plugin registration.** Resolved by the split. Registration
      now happens in exactly one place, the lazy loader, driven by the `LATE`
      array. A dead duplicate registration block in `initMotion` was removed.
- [ ] **Measure the real saving.** The lazy split is in but the new critical
      path has not been measured. Was 414KB. Confirm the number.
- [ ] **Deck arrows before lazy load.** `initDeck` now returns an `armDraggable`
      closure so arrows and layout work immediately and dragging arms later.
      Verify the pre-lazy window on a real connection, not headless: idle fires
      almost instantly in headless, so that window was never actually observed.

## P2 - Per-plugin review (all 8 are wired and firing)

| Plugin | KB | Load | Where it runs | Open question |
| --- | --- | --- | --- | --- |
| SplitText | 7 | eager | Hero headline, lines rise from a mask | Extend to section h2s, or keep as the single hero moment? |
| ScrollSmoother | 13 | eager | Smooth scroll, desktop only (>900px) | Should mobile get it? |
| DrawSVG | 4 | lazy | Kamal diagram edges, timeline spine | Any other SVG worth drawing? MZ mark on load? |
| ScrambleText | 11 | lazy | Eyebrow labels, metric re-run | Verified landing on true values, keep verified |
| MorphSVG | 16 | lazy | Theme toggle, sun to moon | 16KB for one icon. Worth it? Falls back to a plain swap until loaded. |
| TextPlugin | 10 | lazy | Typewriter, rotating endorsement chip | Confirm reduced-motion path |
| Draggable | 34 | lazy | Site deck drag | Needs a real-device touch check |
| Inertia | 7 | lazy | Deck throw physics | Ships with Draggable |

- [x] **Client reviews: horizontal scroll.** Done. The stacked deck is gone,
      replaced by a native `overflow-x` + `scroll-snap` rail: 6 `<li>` in a
      focusable `role="region"`, snap points, styled scrollbar, arrow keys and
      swipe for free. Not scroll hijacking, a real scroll region. Gary G.'s
      revenue quote stays above it as the anchor. Needs browser verification.
- [ ] **Mobile animation layer.** Center-stage activation, velocity skew and
      touch pulse are built but only validated by forcing classes. Headless
      Chrome cannot emulate a real touch pointer, so this needs a device.

## P3 - Blocked on Muhammad

- [!] **Upwork stats.** The reviews arrived, the numbers did not. Need: Job
      Success Score, total earnings, total hours, Top Rated badge yes/no.
      Cloudflare hard-blocks every automated path, so these have to be pasted.
- [!] **"Text is hard to read".** Not reproducible. Every selector sampled
      passes WCAG AA comfortably (min 13px, 5.7:1 worst case, both themes).
      Need a screenshot or an element name.
- [!] **Know-Heritage age.** README says 7+, the brief said 13+. Shipped 7+.

## Gate before any commit

- [ ] axe-core: 0 violations at 390 and 1440, dark and light (4 combinations)
- [ ] Count-ups land exactly: 60%, 35%, 4.8x, 2,084, 100%. Also after re-run.
- [ ] No horizontal overflow: 320 / 360 / 390 / 414 / 768 / 1024 / 1440
- [ ] No console errors
- [ ] Zero em-dashes, zero inline styles, comments under 5%
- [ ] Never commit without asking. Never push.

---

## Done

- [x] Research: verified all 18 links live, mined the resume and GitHub for real
      metrics, studied 3 reference sites, captured 12 real screenshots
- [x] Design system: tokens, self-hosted fonts, dark + light, contrast computed
      rather than eyeballed (light accent moved to `#0a7770`, `#0b7d76`
      measured 4.44:1 on surface-2)
- [x] 7 case studies, all figures attributed, reported vs verified marked
- [x] Booted Gymplex and the Stripe demo locally, screenshotted both
- [x] Testimonials from real Upwork reviews, verbatim including typos
- [x] SEO/AI layer: JSON-LD, llms.txt, sitemap, robots, OG card
- [x] All 33 em-dashes removed with contextual repairs, not find-replace
- [x] Comments cut from 8% to ~4%
- [x] Images: 660KB to 168KB, only what the page references
- [x] 8 commits, focused, no attribution trailers

---

## Incidents

Kept because the same mistake is easy to repeat.

**Deleted ~150 lines of CSS.** A cleanup script used
`t[t.find(a):t.find(b)]` with no bounds check. Between those two markers sat
`.prog`, `.quotes`, `.quote*`, `.peek`, `.chip` and the entire shared-primitives
block (`.actions`, `.lnk`, `.meta-links`, `.code`, `.note`, `.prose-narrow`).
This single mistake caused three separately reported symptoms: the missing
progress bar, the blank space in reviews, and the unreadable text. Restored.
Lesson: never slice a file between two `find` results without asserting what is
inside the range.

**Deleted 14 screenshots.** `for u in $USED` with a space-separated string. zsh
does not word-split unquoted variables the way bash does, so the loop ran once
over the whole string, nothing matched, every file was moved to a trash dir as
"unused", and the next line removed it. The guard written to protect the files
is what fed them to the delete. Regenerable, so no permanent loss.
Lesson: use real arrays in zsh, and never pair a filter with a delete in one
script.

**Broke the sticky header.** A later `.hdr, main, .ftr { position: relative }`
rule silently overrode `.hdr { position: sticky }` at equal specificity.
Lesson: grouping selectors for one property can clobber another.

**Broke the reviews layout.** `.quotes { columns: 2 }` plus a GSAP `y` transform
on its children. A transformed element inside a multi-column container becomes a
containing block and shatters column flow. I had written a comment warning about
exactly this, then did it anyway.

**Broke reviews accessibility with the scroll rail.** Put `role="region"` on a
`<ul>`. That overrides the implicit `list` role, which orphans every `<li>`
inside it. Two axe violations on a page that was at zero. The role belongs on
the wrapping div, not on the list.
Lesson: an ARIA role replaces an element's native semantics, it does not add to
them.

**Trusted bad tooling twice.** Headless Chrome clamps its minimum window width
to 500px, so "mobile" screenshots rendered at 500 and cropped to 390, inventing
a clipping bug that did not exist. Separately, `--virtual-time-budget` froze
count-ups mid-tween, making correct numbers look wrong. Both times a real
browser disproved it.
Lesson: for mobile and for anything time-based, use a real browser.
