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
