# Landing

## Current copy 

ARMADA SCALING
WORKING OUT THE NON-LINEAR MODEL SCALE IN STAR WARS: ARMADA. 

Project: Sep 2018
Method: Regression - Error Analysis
Data: 45 Ships & Squadrons

Four hero notes: 
01 · Canon length 884 m, end to end: close to the Victory Star Destroyer (900 m).

02 · Model length≈ 142 mm on the table, from the fit worked out below.

03 · Scale About 1 : 6,200. A TIE Fighter is closer to 1 : 900.

04 · The question No single ratio fits Armada's ships. What rule do they follow?


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

## Current Copy

Title: A real station for the table

I love the cinematic nature of Armada, and felt it would be great to use a real station model in the game. The core game (before the Corellian Conflict expansion) featured only unarmed repair stations, so my imagination immediately filled with the XQ platforms from the TIE Fighter and X-Wing games of the 90s.

The problem

After my first design iteration, I realized two important things:

The station needed much more detail.
The scale felt wrong.
I'll cover the station's design and fabrication in a separate write-up; here I'd like to focus on the second point. Ship and squadron models in Armada are built to a relative scale: a CR90 model isn't at the same scale to its canon counterpart as a Victory-class Star Destroyer is. For proof, try fitting the CR90 into the Victory's docking bay. I'll wait.

I understand why Fantasy Flight chose a relative scale, but because model and canon sizes don't have a linear relationship, it takes some thought to find the right size for my XQ2 Platform and have it feel correct during play. Fortunately, a little math can solve this problem, and help scale any future models I design.

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

# 02 - METHOD 

## Current Copy

Title: Plot the ships

We should be able to find a function that describes Armada's non-linear scale. To start, let's plot the data2: the canon length of each ship and squadron in the game against the measured length of its model.

Two things stand out:

There does seem to be a relationship.
As expected, it isn't linear: big ships are scaled down much more than small ones.

[First chart of existing data]

## Notes
Suggested rewrite of the second section: 
