# Typography and proportion: research notes

What the evidence says about the interface font (not the Doto numbers) and about using one ratio for sizes,
and what changed in the app because of it. Sources are listed at the end; findings marked *(abstract)* were
checked from abstracts or summaries rather than the full paper.

## Interface font

**What predicts legibility on screens**
- Open letter shapes beat closed ones when reading at a glance. In MIT AgeLab/Monotype studies a humanist face
  was read at shorter glance times than a square grotesque, and the gap was larger for older readers
  (Dobres et al., 2016). An eight-typeface comparison found that more open shapes and contours performed better
  (Sawyer et al., 2020). *(abstract)*
- Light text on a dark background is less legible than dark on light, and worst in a dark room
  (Dobres, Chahine & Reimer, 2017). Deadline's dark theme therefore needs a highly legible face and sizes that do
  not go small. *(abstract)*
- Distinct shapes for easily confused letters (I, l, 1; rn and m) aid recognition (Beier & Larson, 2010, 2013).
- No single font is fastest for everyone: across 352 readers, each person's fastest font was ~35% faster than
  their slowest, and stated preference did not predict speed (Wallace et al., 2022).
- Older adults prefer larger text; a review found no fixed minimum size that suits everyone (Hou et al., 2022).

**Why legibility matters for a deadline app specifically**
- Instructions in a hard-to-read font made a task seem harder and people less willing to do it
  (Song & Schwarz, 2008). A hard-to-read font also increased choice deferral (Novemsky et al., 2007). Task names,
  reserved times and reminders should read effortlessly.

**What makes type feel premium**
- Well-set typography raised mood and creative-task performance in small studies, while speed and comprehension
  were unchanged (Larson & Picard, 2005; Larson et al., 2007). Treat it as a modest, real effect.
- Typeface impressions follow a few design dimensions; natural and harmonious designs read as pleasing and
  reassuring (Henderson, Giese & Cote, 2004). *(abstract)*

**Expired patents**
- The relevant expired patents cover rendering, not typeface shapes. TrueType bytecode hinting patents expired
  worldwide in May 2010, and ClearType colour-filtering patents in August 2019 (FreeType). Android and iOS already
  render text with these techniques, so the app needs nothing extra.
- No expired patent gives a better typeface for this app. Open-licence (SIL OFL) fonts are the free option.

**Comparison of four open fonts at Deadline's sizes in dark mode**

| Font | x-height (em) | x-height / cap height | Tabular numbers | Notes |
|---|---|---|---|---|
| **Schibsted Grotesk** (current) | 0.527 | 0.75 | yes | Open a/e/s/c, tailed l, distinct I/l/1. Built for digital interfaces. |
| Atkinson Hyperlegible Next | 0.496 | 0.74 | yes | Built for low vision, but its slashed zeros make "07:00" look technical. |
| Golos Text | 0.530 | 0.76 | yes | Wider, but not clearer. |
| Source Sans 3 | 0.486 | 0.74 | no | Humanist (Myriad lineage), but smaller x-height and no tabular numbers. |

**Decision:** keep Schibsted Grotesk. It already has the features the evidence points to: open shapes, a large
x-height and distinct confusable letters. Changing the font would cost the app's character for no measurable gain.

**Changes made to how the font is used**
- Tabular numbers on meta, small and label text, so "12 days" and times line up and don't shift as they change.
- Slight extra letter-spacing on 13pt text, as optical sizing does for small sizes; large headings keep tighter
  spacing.
- No text below 12pt, and 13pt only for secondary hints, given the dark theme and older users.

## Ratios and proportion

- Consistency itself has evidence. Physically inconsistent pages caused more comprehension errors, and
  satisfaction tracked overall consistency (Ozok & Salvendy, 2000). Formal aesthetics models score proportion,
  regularity and economy (few distinct sizes and spacings) (Ngo, Teo & Byrne, 2003). *(abstract)*
- The golden ratio has weak and inconsistent support (Green, 1995 review). Deadline does not rely on it.

**What the app now uses**
- **Type:** one ratio, x1.125 per step (a "major second") from the 17pt body:
  12 · 13 · 15 · 17 · 19 · 21 · 24 · 34 · 43 (`T` in `src/theme.ts`).
  The old sizes were already close, so 16, 18, 23 and 42 were snapped onto the scale.
- **Line heights:** on the 4pt grid (16, 20, 24, 28, 32, 40, 48), with 18 for 13pt hints.
- **Spacing:** 8pt grid with 4pt half-steps (4, 8, 12, 16, 24, 32, 48, 64).
- **Radii:** 10, 14, 20, 28 (about x1.4 per step).
- **Icons:** each icon matches its label's line height, with an 8pt gap.

## Second pass (Consensus, PubMed full text)

**Verified from the full text of Dobres et al. (2016), via PubMed Central** ([DOI](https://doi.org/10.1080/00140139.2015.1137637)):
- Glance thresholds were **8.8% shorter** for the humanist face than the square grotesque.
- Dark text on light was **38.6% faster** than light on dark.
- Shrinking cap height from 4 to 3 mm raised thresholds **26.4%** for the humanist face but **62.1%** for the
  square grotesque. Open shapes hold up much better at small sizes.
- Thresholds rose from ~70 ms at age 20 to ~126 ms at 65.

**Dark versus light mode, newer studies**
- Light-on-dark raised cognitive load for older adults in bright surroundings and for younger adults in dim ones.
  Older adults reported more positive emotion with dark-on-light (Sethi et al., 2022, *Ergonomics*).
- Cognitive test scores were higher in light mode, and older adults did worse in dark (Gazit et al., 2025,
  *Ergonomics*, n = 173).
- At night, dark mode reduced visual fatigue, and fatigue fell as contrast rose (Xie et al., 2021, *IEEE Access*).
- A 2025 review of 25 studies concludes light mode is better for readability in bright conditions and dark mode for
  comfort in low light. It recommends letting people switch (Atsani et al., 2025).

**Letter spacing**
- Default spacing is optimal. Wider spacing gave no speed gain for typical adults (Chung, 2002; van den Boer et al.,
  2015) and slowed fast readers (Korinth et al., 2020). Tighter-than-default spacing slowed reading (van den Boer et
  al., 2015; Łuniewska et al., 2021).
- Across 12 fonts, crowding predicted reading speed and comfort. Display fonts crowd more and suit titles and
  numbers only (Pombo et al., 2025). This matches using Doto only for big numbers.

**Aesthetics, consistency, premium feel**
- Visual clarity (order, alignment, low complexity) explains why attractive interfaces also feel usable
  (Schrepp et al., 2021, two large studies).
- A more aesthetic version of the same smartphone app raised perceived usability and the number of correct answers
  (Perrig et al., 2023, n = 281). A 7-week coffee-machine study found no such effect (Sauer et al., 2022), so
  aesthetics support usability but don't replace it.
- Looking like the category people expect raises trust (Miniukovich et al., 2023, n = 1530).
- Large white space raised perceived luxury in a 1,193-person packaging experiment (Iseki et al., 2025). This
  supports the generous spacing already in the app.
- Handwritten-style fonts make products feel human, but the effect reverses for functional products
  (Schroll et al., 2018). Deadline stays with a clean sans.

**Changes from the second pass**
- **Settings → Appearance:** Auto (follows the phone, which can switch at sunset), Light or Dark.
- **Quotes:** the negative letter-spacing on Wisdom quotes was removed, since they're read as running text.
  Tight spacing stays only on short headings.

## Sources
- Dobres, Chahine, Reimer, Gould, Mehler & Coughlin (2016). Utilising psychophysical techniques to investigate the effects of age, typeface design, size and display polarity on glance legibility. *Ergonomics*. https://pmc.ncbi.nlm.nih.gov/articles/PMC5213401
- Dobres, Chahine & Reimer (2017). Effects of ambient illumination, contrast polarity, and letter size on text legibility under glance-like reading. *Applied Ergonomics*. https://rosap.ntl.bts.gov/view/dot/43887/dot_43887_DS1.pdf
- Reimer et al. (2014). Assessing the impact of typeface design in a text-rich automotive user interface. *Ergonomics*. https://rosap.ntl.bts.gov/view/dot/38296/dot_38296_DS1.pdf
- Sawyer, Dobres, Chahine & Reimer (2020). The Great Typography Bake-Off: comparing legibility at-a-glance. *Ergonomics* 63(4). https://www.researchgate.net/publication/339459273_The_Great_Typography_Bake-Off_Comparing_Legibility_at-a-glance
- Wallace et al. (2022). Towards individuated reading experiences: different fonts increase reading speed for different individuals. *ACM TOCHI* 29(4). https://jeffhuang.com/papers/Readability_TOCHI22.pdf
- Hou, Anicetus & He (2022). How to design font size for older adults: a systematic literature review with a mobile device. *Frontiers in Psychology*. https://www.frontiersin.org/articles/10.3389/fpsyg.2022.931646/full
- Song & Schwarz (2008). If it's hard to read, it's hard to do. *Psychological Science* 19(10). https://pubmed.ncbi.nlm.nih.gov/19000208/
- Novemsky, Dhar, Schwarz & Simonson (2007). Preference fluency in choice. *Journal of Marketing Research* 44(3). https://scholars.duke.edu/publication/760792
- Larson & Picard (2005). The aesthetics of reading. https://www.media.mit.edu/publications/the-aesthetics-of-reading-2 ; Larson, Hazlett, Chaparro & Picard (2007). Measuring the aesthetics of reading. https://link.springer.com/doi/10.1007/978-1-84628-664-3_4
- Henderson, Giese & Cote (2004). Impression management using typeface design. *Journal of Marketing* 68(4).
- Beier & Larson (2010, 2013), letter distinctiveness studies, as cited in https://core.ac.uk/download/269288183.pdf
- Ozok & Salvendy (2000). Measuring consistency of web page design and its effects on performance and satisfaction. *Ergonomics* 43(4). https://www.econbiz.de/Record/measuring-consistency-of-web-page-design-and-its-effects-on-performance-and-satisfaction/10006289598
- Ngo, Teo & Byrne (2003). Modelling interface aesthetics. *Information Sciences* 152. https://www.academia.edu/11749849/Modelling_interface_aesthetics
- Green (1995). All that glitters: a review of psychological research on the aesthetics of the golden section. *Perception* 24. https://www.yorku.ca/christo/papers/goldrev3.htm
- FreeType, patents page (hinting and ClearType expiry). https://freetype.org/patents.html
- Sethi et al. (2022). Dark mode vogue: do light-on-dark displays have measurable benefits to users? *Ergonomics*. https://consensus.app/papers/details/efcc4c9c522a5e00846850e69977db34/
- Gazit et al. (2025). The dark side of the interface. *Ergonomics*. https://consensus.app/papers/details/d4b62d9f462854f18d56ffbe1567c2c7/
- Xie et al. (2021). Effects of display color mode and luminance contrast on visual fatigue. *IEEE Access*. https://consensus.app/papers/details/451b568db6b158c59a5e6e40c52151f0/
- Atsani et al. (2025). User preferences for dark and light mode: a systematic literature study. https://consensus.app/papers/details/fe652e22f63e515283d32a75a6e0c7ac/
- Chung (2002). The effect of letter spacing on reading speed in central and peripheral vision. *IOVS*. https://consensus.app/papers/details/fe53f2c085445fffb548f256ac1663ec/
- van den Boer et al. (2015). Default spacing is the optimal spacing for word reading. *QJEP*. https://consensus.app/papers/details/7da8d17a8e605b018099f804a9a61fbb/
- Korinth et al. (2020). Wider letter-spacing facilitates word processing but impairs reading rates of fast readers. *Frontiers in Psychology*. https://consensus.app/papers/details/f55849cd62cd57e08a2c5fb8ca744da5/
- Łuniewska et al. (2021). The effect of inter-letter spacing on reading performance. *Learning and Instruction*. https://consensus.app/papers/details/c26ba3aa5c055d21a769ea84d7653d07/
- Pombo et al. (2025). Crowding predicts reading speed and comfort across fonts and participants. *Journal of Vision*. https://consensus.app/papers/details/95a7f3d1020a5a8b917edcf24bfa78c3/
- Schrepp et al. (2021). What causes the dependency between perceived aesthetics and perceived usability? https://consensus.app/papers/details/c8f44eedf7d65deb9aa1253d3fa04357/
- Perrig et al. (2023). Smartphone app aesthetics influence users' experience and performance. *Frontiers in Psychology*. https://consensus.app/papers/details/8583e894bde65744becfc14a8fc3b815/
- Sauer et al. (2022). Visual aesthetics and user experience: a multiple-session experiment. *IJHCS*. https://consensus.app/papers/details/28cfd6e718925a14b04d518b109843de/
- Miniukovich et al. (2023). The effect of prototypicality on webpage aesthetics, usability, and trustworthiness. *IJHCS*. https://consensus.app/papers/details/7e0162757fb0521f944f9c6e199415f5/
- Iseki et al. (2025). Perception of luxury and product quality in package design. *Journal of Sensory Studies*. https://consensus.app/papers/details/b1bffcd860905712945e0bd20fcd9d1d/
- Schroll et al. (2018). Humanizing products with handwritten typefaces. *Journal of Consumer Research*. https://consensus.app/papers/details/70dc8d3054e45a59ae64794d78bb7bc1/

## Year calendar (focus + context)

- **One large month plus the whole year as an overview.** On small screens, a fisheye calendar that keeps an
  overview next to the detailed period made complex calendar tasks significantly faster than a standard
  calendar. Users still preferred a plain day view for simple daily checks
  ([DateLens, Bederson et al. 2003](https://consensus.app/papers/details/65364d464fef53feadd4f74f4500bacd/)).
  On small screens, people valued keeping their place over a simpler zoom
  ([Gerken et al. 2006](https://consensus.app/papers/details/f4d21f5e5d585740842e025918b54c99/)). Deadline's
  version: the month at full width with ~50dp day cells, and the 12 months below, which stay in view. Tapping a
  small month moves the focus; swiping moves month by month.
- **Day cells big enough for thumbs.** One-handed thumb taps needed targets of about 9.2 mm to avoid extra
  errors ([Parhi, Karlson & Bederson 2006](https://www.microsoft.com/en-us/research/?p=155150)). The old
  3-column year view had ~13dp boxes, too small to tap. The overview months are now only for changing month.
- **Calendar layout makes cycles visible.** Placing data on a calendar exposes weekly patterns and outliers at
  a glance (van Wijk & van Selow, InfoVis 1999).
- **Colour plus a second cue.** Category judgements get harder as the number of colours grows
  ([Tseng et al. 2023](https://consensus.app/papers/details/67b5320051fe5f488a87afd7ff241cba/)). Pairing colour
  with another cue improved accuracy, most for 5–8 categories
  ([Tseng et al. 2026](https://consensus.app/papers/details/0514a7f14fef50a78ae7ab982482e095/)). Here a task
  running is tinted, a deadline or important date is full colour with bold digits, a reserved session has a
  dot, and lived days are muted.
- **Patents.** Calendar-navigation patents from the early 2000s, such as a day-to-month jump that lists the
  year's months (US 6686939) and month calendar views (US 7257778), are listed as expired. The month and
  year-overview pattern is long-established. patents.google.com is blocked in this session, so I could not
  confirm their claims or status.

## Motion and speed

**What the evidence says**
- **Speed matters more than looks.** In a 300-person study of Android note apps, response time influenced
  satisfaction more than visual design (β 0.57 vs 0.37;
  [Li 2026](https://consensus.app/papers/details/524857905ec4542b912c691612735e6d/)). For taps, feedback within
  about 0.2 s and finishing within about 1 s satisfied users, and smooth motion raised perceived speed
  ([Kim 2014](https://consensus.app/papers/details/159d796a524456758dc2661ebaf72c99/)).
- **Animated transitions help people follow a change.** They improved graphical perception in controlled
  experiments ([Heer & Robertson 2007](https://consensus.app/papers/details/66117f8f4bb7589390c1dd94b9bb1cae/)),
  and staged, short transitions read best.
- **Motion must be optional.** All motion here is skipped when the phone's Reduce motion setting is on.

**Where Deadline uses motion now**
| Place | Motion | Why |
|---|---|---|
| Life number | Digits roll into place, staggered right to left, 650 ms ease-out | Shows the value changing when switching weeks, months and years |
| Year month change | New month slides in from the side you moved towards (220 ms) | Keeps your place between months |
| Day page, ‹ › | Content slides in from that side (200 ms) | Same continuity between days |
| Day boxes | Shrink slightly while pressed (instant) | Feedback under 0.2 s |
| Task row | Details fade and slide in when opened (200 ms) | Shows where the details came from |
| Life week details | Fade in on tap (160 ms) | Ties the details to the tapped week |
| Tabs | Cross-fade between Life, Year and Wisdom | Softer than a hard cut |
| Status dots | Slow pulse (red fastest) | Already present: urgency without words |

**Possible later:** a short "afterglow" on weeks a task has just changed, so you see what moved; a check-mark
pop when you answer "Yes" to a check-in.

**Speed fixes (measured on the build server, roughly 5–10× slower on a mid-range Android phone)**
- **Finding this week:** worked out directly instead of walking through every week of a life. 0.49 ms → 0.002
  ms, with identical results on 36,310 test dates.
- **Large widget:** 196 ms → 0.6 ms per draw. It used to search for "this week" once for each of its 520 boxes.
- **Life grid:** two date calculations per row instead of two per box (2.2 → 0.2 ms). It now redraws only when
  tasks, dates, colours, size or the day change. Tapping a week draws one highlight box instead of rebuilding
  the whole grid.
- **Reminders and widgets:** these were redone after every change, including scrolling and opening the review.
  Now they run only when something they show changes, and reminders are skipped when the plan is identical.
- **Saving:** batched after changes settle (300 ms), and flushed when the app goes to the background.

## Making the time a required, gentle step (new-task form)

- **Date and time, not just a date.** Prompting people to write the date *and time* they would act raised
  follow-through by 4.2 points (33.1% → 37.3%); a date alone did nothing significant
  ([Milkman et al. 2011, PNAS](https://consensus.app/papers/details/57f6c7ef6c2e59da9da607efeb9b4051/)). Plans
  tied to a time-and-place cue work across 642 tests
  ([Sheeran et al. 2024](https://consensus.app/papers/details/5f9f7367e3d95edca818b636686bbd2d/)).
- **A pre-filled, honest suggestion.** Defaults shift choices strongly (d = 0.68 across 58 studies;
  [Jachimowicz et al. 2019](https://consensus.app/papers/details/3acd0367c8105d88858871badac1257d/)). Being open
  that it's a default doesn't weaken it
  ([Lemken 2021](https://consensus.app/papers/details/dbec012ee20b5e88a87454c852f6540f/)). The form pre-fills
  the nearest free half-hour and says so.
- **No error popups mid-form.** Errors work better shown after input than while typing
  ([Bargas-Avila et al. 2007](https://core.ac.uk/download/85219257.pdf)). The save button says what's missing
  ("Pick at least one day") and stays disabled until then.
- **Planning alone is not enough for repeated actions.** Choosing gym days and times alone had no effect
  ([Carrera et al. 2018](https://consensus.app/papers/details/071cc699476054eaad2af1e9ac59204b/)). The reminders,
  check-ins and timeline supply the follow-through.

**The form now:** What → Deadline → **When will you work on it?** (Repeat on days or Once on a date, a start time
pre-filled with a free slot, a length of 15 min to 1½ h, a 06:00–23:00 bar showing the session against times
already taken, and an overlap warning with a one-tap free alternative) → Where → Colour → optional backup plan
and cue. There is no way to save without a time.

**Timeline (day view):** square blocks at their time, as tall as they last, side by side when they overlap; a
fixed strip for deadlines and important dates; a now line; tap a block to open the task, or an empty hour to plan
a session there. IBM's expired day-calendar patents (US 5,023,851; US 5,129,057) show time-slot day views are
long-established.

## Inter, and where the dot digits go (November 2026)
- **Inter** is now the text font, at the person's request. It suits the findings above: open apertures, a tall
  x-height, and distinct I/l/1 shapes. It also has tabular figures, which keep columns of times aligned.
- **Tuning:**
  - Body text is 17/26, a line height of about 1.5, because Inter sets taller than the previous face.
  - Headings get slightly negative tracking (h1 −0.8, h2 −0.3), as Inter's display guidance suggests.
  - Body text keeps the default tracking, since default spacing reads fastest (see Letter spacing).
- **Dot digits (Doto) only for a number standing on its own:** the countdown, calendar day numbers, timeline
  hours, and the start/end times. A number inside a phrase ("3 weeks left", "9 November 2026") uses Inter, so
  one line never mixes two typefaces.

## Whitespace and a premium feel
Pinterest could not be reached from the build environment (the host is blocked, and it needs a login). This pass
therefore rests on the peer-reviewed findings below rather than on mood boards.

**What the evidence says**
- **More empty space reads as higher quality and more luxurious.**
  - In packaging with 1,193 people, a large white space raised perceived luxury (Iseki et al., 2025).
  - Shoppers judge items as more valuable, and the store as more prestigious, when more space surrounds each
    one (Sevilla & Kahn, 2016).
  - Too little space makes a layout feel confined (Liu et al., 2024).
- **Space between related things should be smaller than the space around the group.** Holding total white space
  constant, a tighter group with more space around it (low interspace/circumspace) was judged more coherent and
  performed better (Yu et al., 2023).
- **Order matters as much as emptiness.** Alignment and a clear layout order cut visual search effort (Zhang et
  al., 2024: "order is more"). Few distinct sizes and spacings, at moderate density, rate best (Ngo et al.,
  2003; Gu et al., 2025).
- **Black-and-white reads as more luxurious than colour** (Wang et al., 2022). This supports the monochrome UI,
  with colour kept for meaning (status) only.
- **Looks are not only looks.** A meta-analysis of 31 studies found a small to medium gain in measured
  performance with more attractive interfaces (g = 0.29; Schlamann et al., 2026). *(abstract)*

**What changed**
- **Page gutter:** a fixed 24 on every screen (previously 4.5%, about 18 on a typical phone).
- **Group rhythm:** 8–12 inside a group, and 48 between groups, which is at least 3× the inside space. This
  applies to the task screen, the new-task form, Settings and section headers (label 12 above its content).
- **Lines:** hairlines under every settings row are gone; space separates the rows. Task rows keep theirs,
  because they are swipeable.
- **Containers:** cards on the task screen are frosted glass with 24 padding, not filled panels.
- **Buttons:** the two buttons on a day page are the same size (56).
- **Session time:** it now has its own screen. There are only two large numbers on it (start and end), with a
  number pad below, and nothing else competes for attention.

**Sources**
- Iseki, S. et al. (2025). Perception of luxury and product quality in package design: white space, typeface and visual texture. *Journal of Sensory Studies*. https://consensus.app/papers/details/b1bffcd860905712945e0bd20fcd9d1d/
- Sevilla, J. & Kahn, B. (2016). The space-to-product ratio effect. *Journal of Marketing Research*. https://consensus.app/papers/details/a861b122599d57d4ac486cb018b717a2/
- Liu, P. et al. (2024). Where less is more? White space and product image dynamism. *SAGE Open*. https://consensus.app/papers/details/68ce0c450bef5624a9dfb8bae84a1969/
- Yu, Z.-H. et al. (2023). How to allocate white space in ad design? *Journal of Advertising*. https://consensus.app/papers/details/ea0127c2167f557c990d3dfd603aff66/
- Zhang, N. et al. (2024). The effects of layout order on interface complexity. *Sensors*. https://consensus.app/papers/details/e07a951c1aaa59c9b1ae79ae1216ac7a/
- Ngo, D. et al. (2003). Modelling interface aesthetics. *Information Sciences*. https://consensus.app/papers/details/ef3490bec0b657eb89d9c3ee85cbcb6f/
- Gu, B. et al. (2025). Evaluation of digital twin interface layout based on aesthetics and AHP. *M2VIP*. https://consensus.app/papers/details/7ab50d38b1a551bfad4dbd8b760afb32/
- Wang, Y. et al. (2022). What is the glamor of black-and-white? *Journal of Consumer Behaviour*. https://consensus.app/papers/details/7323a2910a215873aa1fb91cd05ece9d/
- Schlamann, M. et al. (2026). Attractive things do work better: a meta-analysis. *IJHCI*. https://consensus.app/papers/details/5f6c4dac5ae45e9d9d4e86b82dbf92fb/
