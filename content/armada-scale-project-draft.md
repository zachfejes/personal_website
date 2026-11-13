# Landing

## Notes
- I like that everything here is forced to all-caps
- should remove period at end of subtitle
- project date: Aug 2018, updated 2026
- number of ships & squadrons checked: 45 is correct
- I don't love how the 01, 02, 03, and 04 circles are placed over the hero image on mobile
- I'd like to figure out some additional subtle animations to include in the hero, as well as down the page. The orbiting glowing dot is nice, but I feel like there could be more and still have it be tasteful. need to think about this. maybe some of the orbit lines getting added and removed with some flickering?
- The orbit lines and animated element get cut off at the top on mobile - preventing them from intersecting the subtitle text. I'd prefer if they gradually faded out near the text instead, so it was a more subtle transition.
- The four hero notes now give a quick narrative of why the project exists, rather than measurements without context. Kept to about 70 characters each to fit the note boxes.
- Use "XQ2 Platform" everywhere (the name Wookieepedia uses), not "XQ2 Station".

## Copy

01 · The game: Star Wars: Armada fields beautiful models, from fighters to capital ships.

02 · The goal: Build custom ships that feel the right size on the table.

03 · The station: First up: the XQ2 Platform, from the '90s X-Wing games.

04 · The question: No single ratio fits Armada's ships. What rule do they follow?


# 01 - BACKGROUND

## Copy

Title: A real station for the table

I love Star Wars: Armada, a tabletop game of fleet battles with a real sense of scale, motion and momentum. I got into the game before the pandemic, and quickly found an active gaming community in Toronto.

The game has a dynamic system for placing terrain, but uses card cutouts to represent it. That seemed like a disservice to the otherwise wonderful ship models, and I felt it would be great to use a real station model in the game. The core game (before the Corellian Conflict expansion) featured only unarmed repair stations, so my imagination immediately filled with the low-poly XQ platforms from the TIE Fighter and X-Wing games of the 90s.

[First image of the XQ2 Platform from the TIE Fighter game]

I started my design work by replicating the silhouette of the XQ2 Platform: the three angular landing pads and the central hub. Once that read correctly from a distance, I added a few bulkier features (hangars, the underside) and gave it a first low-detail print to see how it looked beside the game's model ships.

The problem

After my first design iteration, I realized two important things:

- The station needed much more detail.
- The scale felt wrong.

The first issue was easy enough to resolve: I took artistic liberty and added Star Wars style greebles and details to the model. The second issue needed more thought.

Ship and squadron models in Armada are built to a relative scale. You can quickly confirm this by trying to fit a CR90 model into the hangar of a Victory-class Star Destroyer: it works in A New Hope, not so much in Armada.

[Picture of the Episode IV CR90 pulled into the Star Destroyer's hangar - needs a credit]
[Picture of the CR90 and Victory models clearly not fitting into one another]

It makes sense that Fantasy Flight chose a relative scale: a linear scale would make it impractical to have both an X-wing and a Star Destroyer on the same table. However, because model and canon sizes don't have a linear relationship, it takes some thought to find the right size for my XQ2 Platform and have it feel correct during play. Fortunately, a little math can solve this problem, and help scale any future models I design (and I have many ideas).

[Side and front elevation of the station wireframe]


# 02 - DATA

## Copy

Title: Plot the ships

To identify the relationship (if any) between canon and model dimensions, we start by plotting the available data: the canon length of each ship and squadron in the game against the measured length of its model.

Two things in the graph stand out:
1. There does seem to be a relationship.
2. As expected, it isn't linear: big ships are scaled down much more than small ones.

The Executor is hidden by default, because at 19 km it squeezes everything else into a corner. Show it with the toggle. Log view is the default, and linear is one click away.

[Call-out note block, like in the hero:
I originally did this assessment in 2018, before the Galactic Republic and Separatist factions joined the game. Adding the data from those new ships, as well as the newer Empire and Rebel ships, has altered the analysis slightly.]

[First chart of existing data]


# 03 - FINDING A FIT

## Copy

Title: Two candidate curves

I started by identifying the most likely families of functions that could satisfy the observed data. By eye, two appeared likely candidates: the power function and the logarithmic function.

Fitting both against the data (that is, finding the specific function in each family that best describes the data) is the first step. Then we can compare them, and determine which gives the best fit.

A logarithmic function has the general form

[logarithmic function]

Treating ln(x) itself as an independent variable, we can use linear regression[3] to find the a and b that give the closest fit:

[closest fit for logarithmic]

A power function has the form

[power function]

Finding a and b requires an extra step this time, but the data graph gives us a hint. Taking the log10 of both sides gives us:

[log expansion of power function]

That looks messy, but it's linear in log10(x), so linear regression is back on the table. It finds

[a and b solutions]

so the power function is

[closest fit for power function]

Now we plot both against the data. Switch either fit on or off to compare.

[chart including the two fits]


# METHOD NOTE - FITTING AND ERROR

## Copy

(alternate text when section is collapsed: Every linear regression here comes from ordinary least squares (OLS), after each curve is turned into a straight line.)

Every linear regression on this page comes from one method: ordinary least squares (OLS). Given points (x1,y1),…,(xn,yn), it finds the straight line y=mx+c that makes the sum of the squared vertical gaps between the points and the line as small as possible:

[minimal sum equation]

Finding the minimum means varying both m and c, so we take a partial derivative with respect to each. S is a sum of squares of expressions that are linear in m and c, so it's a convex bowl with one lowest point, where both partial derivatives are zero. Setting them to zero gives the answer directly, with no searching or iteration, where x̄ and ȳ are the averages:

[Derivative with respect to c (chain rule; the inner derivative is −1):
∂S/∂c = −2 Σ (yᵢ − mxᵢ − c) = 0
This gives Σyᵢ − mΣxᵢ − nc = 0. Dividing by n:
c = ȳ − m x̄]

[Derivative with respect to m (the inner derivative is −xᵢ):
∂S/∂m = −2 Σ xᵢ (yᵢ − mxᵢ − c) = 0
Substitute c = ȳ − m x̄:
Σ xᵢ [(yᵢ − ȳ) − m(xᵢ − x̄)] = 0
Rearranging:
m = Σ xᵢ(yᵢ − ȳ) / Σ xᵢ(xᵢ − x̄)
Deviations from a mean always sum to zero, so Σ(yᵢ − ȳ) = 0 and Σ(xᵢ − x̄) = 0. That means you can subtract x̄ from xᵢ in both sums without changing either one:
m = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)²]

Neither candidate is a straight line, so each is first turned into one:

Logarithmic: fit a line to y against ln(x). Its slope is a and its intercept is b.

Power: fit a line to log10(y) against log10(x). Its slope is b, and its intercept is log10(a), so a=10^intercept. Because it works on logarithms, this fit minimizes proportional errors rather than absolute ones: a 10% miss counts the same for a starfighter as for a Star Destroyer.

To compare the fits, each is scored on how far its predictions ŷᵢ land from the real model lengths yᵢ: by root-mean-square error, in millimetres,

[RMSE Function]

and by average percentage error, which weighs every ship equally whatever its size:

[error function]

All of this runs when the site is built, straight from the ship data, so if I add a ship in future, every fit, number and chart on this page updates automatically.


# 04 - COMPARING FITS

## Notes
- Remove the two call-out boxes that describe the A and B values in the equation; the B callout's point is kept as a sentence after the equation.

## Copy

Title: The power function fits

By eye, the power function follows the data much more closely. This is particularly apparent in the logarithmic view.

To confirm it, I used two methods to assess the error of each fit: root-mean-square error, and the average error as a percentage of each model's real length. Percentages keep the biggest ships from dominating: 20 mm off matters a lot for a 60 mm corvette, and much less for a 600 mm Super Star Destroyer.

[logarithmic fit, and power fit]

The logarithmic fit does worst on the smallest craft: below about 15 m it predicts a model of negative length, which it does for 10 of the 45 ships here!

The power function's average error is about 12× smaller (and its RMSE less than half), so it's the one to use for Armada's scale:

[power function]

Its exponent is under 1, which is the whole story in one number: double a ship's length and its model grows only 1.46×.


# 05 - CONFIRMATION

## Copy

Title: Testing my assumptions

(alternate text when section is collapsed: 8 curve shapes, scored on how well each predicts a ship it wasn't fitted to. The power law still wins.)

I initially estimated that the power and logarithmic forms would best fit the data, because in a linear plot the data seems to follow that shape. However, other shapes could fit too, so to be more certain that I've found the best fit, I tried 8 of them. Each one is fitted to the same ships and scored two ways: its average error on those ships, and its average left-out error predicting each ship from a fit made without it (leave-one-out cross-validation). The latter is the more important test, as we see in assessing the polynomials below. The last column counts ships given a negative model length. A single negative prediction invalidates the form, as these represent real physical objects.

[Candidate forms, best at predicting a left-out ship first]

What the alternatives show:

- A logarithm has to cross zero somewhere, which is where the negative lengths in my initial analysis came from - a good reminder for me in future. Shifting it to pass through zero, a ln(1 + x/c), addresses it, but still misses by 22.8% on average.
- A sine wave starts out roughly straight (sin(kx) ≈ kx near zero) and only flattens near its peak. To flatten across the whole range, its peak has to sit at or beyond the largest ship, and then it can't bend enough for the small ones, so it misses by 89.6% on average.
- Polynomials fit the ships they're given well, given high enough order, but then predict left-out ships badly (1,248.5% for the cubic). That's overfitting.
- Letting the power law's exponent change with size, a x^(b + c ln x), gives c = −0.004: next to no drift. It has the lowest error on the ships it was fitted to, but does slightly worse on left-out ships (10.3% against the plain power law's 10.0%): a small sign of overfitting.
- Fitting small and large ships separately, split at 63.8 m, gives exponents of 0.438 and 0.513, a slightly lower exponent among the small craft. It predicts left-out ships with 10.5% error, so going piecewise isn't worth it.

If the power law were missing some shape, its errors would lean one way at some sizes. The chart below divides each ship's real model length by the power fit's prediction; the dashed line at 1 is a perfect prediction. Ships of 5.8–34 m, 38–580 m and 700–19,000 m average 98%, 102% and 100% of their predicted size respectively. On average the misses balance out at every size, though ships of similar size often miss the same way, which hints at design choices by size class.

I expected the size of the miss to shrink as ships got bigger. That's only true as a percentage: the shaded band is the typical miss for a ship of each size, about ±13% for the smallest craft, narrowing to ±6% by 2,400 m. In millimetres the miss grows, from about 2 mm for fighters to about 9 mm for capital ships. A millimetre is a big share of a 10 mm fighter, and measuring a model that small is less precise too.

[Each ship's model length divided by the power fit's prediction]

This shows that the power law wasn't just a good first guess - none of the alternatives predict a new ship better! The remaining error likely comes from design choices for each model and inaccuracy in measurement.


# 06 - FINDINGS

## Copy

Title: Size any ship

With this function, we can find a reasonable model size for any Star Wars ship from its canon length. The XQ2 Platform is 884 m long[4], which puts its model at 142 mm, give or take about 10 mm: the typical miss for a ship its size.

Try it with a ship of your own:

[scale calculator]

I've added a few ships I'd like to design to the chart, along with yours, each with the typical miss for its size. Let me know if you think of others.

[Final chart]


# 07 - BUILDING THE XQ2

## Copy

Title: Back to the station

With the scale worked out, I could finally get back to my XQ2 Platform, and make sure it makes sense on the table.

At 142 mm, the XQ2 sits between the Victory Star Destroyer (137 mm) and the Interdictor Star Destroyer (160 mm): about where an 884 m station belongs among Armada's ships, and big enough to carry the detail the first version was missing.

[Image of the model in Blender]

Back in Blender, I reworked the hangar arms, central tower and panelling for a 142 mm model, adding detail that would read at that scale and that a resin printer could reliably print, and test-printed parts beside my existing ships before the final print.

[Picture of station on the table]

I'm really happy with how the station turned out. It's seen many, many battles, and the game feels more complete with it. I have ideas for many more models that I can now scale, so I'm excited to put this work to further use.
