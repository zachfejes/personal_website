# Landing

## Notes
- I like that everything here is forced to all-caps
- should remove period at end of subtitle
- project should be Aug 2018 - may 2019
- double check that the number of ships & squadrons is correct
- I don't love how the 01, 02, 03, and 04 circles are placed over the hero image on mobile
- I'd like to figure out some additional subtle animations to include in the hero, as well as down the page. The orbiting glowing dot is nice, but I feel like there could be more and still have it be tasteful. need to think about this. maybe some of the orbit lines getting added and removed with some flickering? 
- The orbit lines and animated element get cut off at the top on mobile - preventing them from intersecting the subtitle text. I'd prefer if they gradually faded out near the next instead, so it was a more subtle transition.
- I do not like the text that is currently in each of the four hero note boxes - they state specific findings/measurements about the station without any context for the reader.
- only note 04 provides it's own context, and is meaningful as a quick 'insight into what this project is about'. I'd like all of these four notes to provide that kind of quick insight into the intent/purpose of the project. 
- suggested content for 01:
01 · The Game The tactical tabletop game Star Wars: Armada features beautiful ship models from fighters to capital ships. 
- suggested content for 02:
02 · The Goal I want to model custom ships to augment the game, and have them feel like the correct size on the table. 
- suggested content for 03:
03 ·  The Station My first custom model is of the XQ2 Station, from the old X-Wing Video Games
- the above content isn't perfect, but it creates a quick narrative of why the project exists.


# 01 - BACKGROUND  

## Notes
Suggested rewrite of the first section: 

I love the cinematic nature of Star Wars: Armada,a tactical tabletop game of fleet-scale battles. The mechanics and gameplay give a great sense of scale, motion, and momentum. I got into the game during the Pandemic and quickly found an active gaming community in Toronto. 

The game has a dynamic system for placing terrain, but uses card cutouts to represent these elements. This seemed like a disservice to the otherwise wonderful ship models and I felt it would be great to use a real station model in the game. The core game (before the Corellian Conflict expansion) featured only unarmed repair stations, so my imagination immediately filled with the low-poly XQ platforms from the TIE Fighter and X-Wing games of the 90s.

[First image of XQ2 Station from tie fighter game]

I started my design work by replicating the silhouette of the XQ2 Station. The three angular landing pads and central hub. After this read correctly from a distance, I added a few more bulky features (hangars, underside) and gave it a first low-detail print to see how it looked beside the game's model ships.

The problem

After my first design iteration, I realized two important things:

- The station needed much more detail.
- The scale felt wrong.

The first issue is easy enough to resolve - I took artistic liberty and added Stars Wars type greebles and details in the model. The second issue needed more thought.

Ship and squadron models in Armada are built to a relative scale. You can quickly confirm this by trying to fit a CR90 model into the hanger of a Victory-class Star Destroyer: it works in A New Hope, not so much in Armada.

[Picture of Episode IV CR90 pulled into Star Destroyers hanger]
[Picture of CR90 model and Victory SD models clearly not fitting into one another] 

It makes sense that Fantasy Flight chose a relative scale - a linear scale would make it impractical to have both an X-Wing and a Star Destroyer on the same table. However, because model and canon sizes don't have a linear relationship, it takes some thought to find the right size for my XQ2 Platform and have it feel correct during play. Fortunately, a little math can solve this problem, and help scale any future models I design (and I have many ideas).

[image of side and front elevation of station wireframe]

# 02 - METHOD 

## Notes
Suggested rewrite of the second section: 

- Change section header to '02 - DATA'

To identify the relationship (if any) between canonical and model dimensions, we start by plotting the available data: the canonical length of each ship and squadron in the game against the measured length of it's model.

Two things in the graph stand out: 
1. There does seem to be a relationship.
2. As expected, it isn't linear: big ships are scaled down much more than small ones.

To better visualize the data I've made display of the Executor optional, and have provided both logarithmic (the default) and linear views.

----
Call-out note block, like in the hero:
I originally did this assessment prior to the introduction of the Galactic Republic and the Trade Federation factions to the game. Adding the data from those new ships, as well as the newer Empire and Rebel ships, has altered the analysis slightly.
----

[First chart of existing data]


# 03 - FINDING A FIT

## Notes
Suggested rewrite of the third section: 

I started by identifying the most likely families of functions that could satisfy the observed data. By eye, two appeared likely candidates: the power function, and the logarithmic function.

Fitting both against the data (that is, finding the specific function in each family best describes the data) is the first step. Then we can compare them, and determine which gives the best fit. 

A logarithmic function has the general form

[logarithmic function] 

Treating ln(x) itself as an independent variable, we can use linear regression to finds the a and b that give the closest fit:

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


# FIELD NOTE - HOW THE FITTING WORKS

## Notes
- I would re-label this section as "METHOD NOTE - FITTING AND ERROR"

Suggested rewrite of the first field-note section: 

Every linear regression on this page comes from one method: ordinary least squares (OLS). Given points (x1,y1),…,(xn,yn), it finds the straight line y=mx+c that makes the sum of the squared vertical gaps between the points and the line as small as possible:

(alternate text when section is collapsed: Every linear regression here comes from ordinary least squares (OLS), after each curve is turned into a straight line.)

[minimal sum equation] 

Finding the minimum will involve varying each of the two variables m and c - which would be done by partial derivatives. Because this is the square of a linear equation, we know that it is convex and that the slope at it's minimum is zero. Setting the derivatives to zero gives the answer directly, with no searching or iteration, where xˉ and yˉ are the averages:

[Derivative with respect to m (the inner derivative is −xᵢ):
∂S/∂m = −2 Σ xᵢ (yᵢ − mxᵢ − c) = 0
Substitute c = ȳ − m x̄:
Σ xᵢ [(yᵢ − ȳ) − m(xᵢ − x̄)] = 0
Rearranging:
m = Σ xᵢ(yᵢ − ȳ) / Σ xᵢ(xᵢ − x̄)
Deviations from a mean always sum to zero, so Σ(yᵢ − ȳ) = 0 and Σ(xᵢ − x̄) = 0. That means you can subtract x̄ from xᵢ in both sums without changing either one:
m = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)²]

[Derivative with respect to c (chain rule; the inner derivative is −1):
∂S/∂c = −2 Σ (yᵢ − mxᵢ − c) = 0
This gives Σyᵢ − mΣxᵢ − nc = 0. Dividing by n:
c = ȳ − m x̄]

Neither candidate is a straight line, so each is first turned into one:

Logarithmic: fit a line to y against ln(x). Its slope is a and its intercept is b.

Power: fit a line to log10(y) against log10(x). Its slope is b, and its intercept is log10(a), so a=10^intercept. Because it works on logarithms, this fit minimizes proportional errors rather than absolute ones: a 10% miss counts the same for a starfighter as for a Star Destroyer.

To compare the fits, each is scored on how far its predictions y^i land from the real model lengths yi: by root-mean-square error, in millimetres,

[RMSE Function]

and by average percentage error, which weighs every ship equally whatever its size:

[error function]

All of this runs when the site loads in your browser, straight from the ship data, so if I update this page in future by adding a ship, it automatically updates every fit, number and chart on this page.


# 04 - Which fit is better?

## Notes
- rename the section "04 - MINIMIZING ERROR"
- suggest removing the two call-out boxes that describe the A and B values in the equation, as they really don't add much. 

Suggested rewrite of the third section: 

Title: The Power Function Fits

By eye, the power function follows the data much more closely. This is particularly apparent in the logarithmic view.

To confirm it, I used two method to assess the error of each fit: root-mean square, and the average error as a percentage of each model's real length. Percentages keep the biggest ships from dominating: 20 mm off matters a lot for a 60 mm corvette, and much less for a 600 mm Super Star Destroyer.

[logarithmic fit, and power fit]

The logarithmic fit does worst on the smallest craft: below about 15 m it predicts a model of negative length, which it does for 10 of the 45 ships here!

The power function's error is about 12× smaller, so it's the one to use for Armada's scale:

[power function]


# 05 - Why a power law?

## Notes
- I would re-label this section as "05 - CONFIRMATION"

Suggested rewrite of the fifth section:

Title: Testing my assumptions

I initially estimated that the power and logarithmic forms would best fit the data, because in a linear plot the data seems to follow that shape. However, other shapes could fit too, so to be more certain that I've found the best fit, I tried 8 of them. Each one is fitted to the same ships and scored two ways: its average error on those ships, and its average left-out error predicting each ship from a fit made without it (leave-one-out cross-validation). The latter is the more important test, as we see in assessing the polynomials below. The last column counts ships given a negative model length. A single negative prediction invalidates the form, as these represent real physical objects.

(alternate text when section is collapsed: 8 curve shapes, scored on how well each predicts a ship it wasn't fitted to. The power law still wins.)

[Candidate forms, best at predicting a left-out ship first]

What the alternatives show:

- A logarithm has to cross zero somewhere, which is where the negative lengths in my initial analysis came from - a good reminder for me in future. Shifting it to pass through zero, aln(1+x/c) addresses it, but still misses by 22.8% on average.
- A sine wave starts out roughly straight (sin(kx)≈kx near zero) and only flattens near its peak. To flatten across the whole range, its peak has to sit at or beyond the largest ship, and then it can't bend enough for the small ones, so it misses by 89.6% on average.
- Polynomials fit the ships they're given well, given high enough order, but then predict left-out ships badly (1,248.5% for the cubic). That's overfitting.
- Letting the power law's exponent change with size, ax b+clnx, gives c=−0.004: which is next to no drift, and still results in 10.3% error predicting left-out ships against the plain power law's 10.0%. It does have the best RMSE overall, but is slightly overfitting.
- Fitting small and large ships separately, split at 63.8 m, gives exponents of 0.438 and 0.513, a slightly lower exponent among the small craft. It predicts left-out ships with 10.5% error, so going piecewise isn't worth it.

I was also curious to know how the RMSE changed over the cannon length of each ship; I predicted that the error was narrowing as the size increased. As it turned out, I was only right for the percentage error.

If the power law were missing some shape, its errors would lean one way at some sizes. The chart below divides each ship's real model length by the power fit's prediction; the dashed line at 1 is a perfect prediction. Ships of 5.8–34 m, 38–580 m and 700–19,000 m average 98%, 102% and 100% of their predicted size respectively - meaning that the error is well distributed on both sides of the power function.

They don't all miss by the same amount though. The shaded band is the typical miss for a ship of each size: about ±13% for the smallest craft, narrowing to ±6% by 2,400 m. This shows that I was was only right in the narrowing of percentage error vs. cannon size - not in linear (mm) error, which actually widens as the ships get bigger. A millimetre or two is a big share of a fighter's model, but it is a smaller percentage of a larger ship. It's also worth noting that measurement error by percentage is also higher for the smallest ships, which may contribute.

[Each ship's model length divided by the power fit's prediction]

This shows that the power law wasn't just a good first guess - none of the alternatives predict a new ship better! The remaining error may also represent design choices for each model, and inaccuracy in measurement - as the error is evenly distributed above and below the estimate line.


# 06 - Findings

## Notes

Title: Size any ship

With this function, we can find a reasonable model size for any Star Wars ship from its canon length. The XQ2 Platform is 884 m long4, which puts its model at 142 mm, give or take about 10 mm: the typical miss for a ship its size.

Try it with a ship of your own:

[scale calculator] 

I've added a few ships I'd like to design to the chart, along with yours, each with the typical miss for its size. Let me know if you think of others.

[Final chart]


# 07 - Building the XQ2

## Notes

Title: Back to the station

With a size worked out, I could get back to the station this all started with. At 142 mm, the XQ2 sits between the Victory Star Destroyer (137 mm) and the Interdictor Star Destroyer (160 mm): about where an 884 m station belongs among Armada's ships, and big enough to carry the detail the first version was missing.

Rescaling it changed more than the size. Details that worked at the first scale read differently at the new one, so I reworked the hangar arms, the central tower and the panelling for a 142 mm model, and test-printed parts next to my existing ships to check the proportions by eye before committing to the final print.

The design and fabrication deserve their own write-up, so I'll stop there. The short version: the station on the table now looks like it belongs in the same fleet, and the same curve will size whatever I build next.