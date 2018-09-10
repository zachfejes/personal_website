/**
 * libraries
 */
import React from "react";
//import PropTypes from "prop-types";
import { Scatter } from "react-chartjs-2";
import MathJax from "react-mathjax";

/**
 * config
 */
import { SHIP_SCALE_DATA, SHIP_SCALE_OPTIONS, APPROX_SCALE_OPTIONS } from "../../config";
import { SHIP_SCALE_DATA_POW_LOG_OVERLAY, SHIP_SCALE_DATA_WITH_NEW_ASSETS } from "../../config";

/**
 * css
 */
import "./armadaScaleAnalysis.css";


class ArmadaScaleAnalysis extends React.Component {
    render() {
        return(
            <div className="armadaScaleAnalysis">
                <section className="titles">
                    <h1>Armada Scaling</h1>
                    <br/>
                    <p>Analyzing the Non-Linear Scale for Use in Modeling</p>
                </section>

                <section className="contentBlock">
                    <h3>Background</h3>
                    <p>
                        Several weeks ago, I started work on a simple side project.

                        I love the cinematics/visuals of Armada, and felt that it would
                        be great to use a real station model in the game. As the core game 
                        (prior to the Corellian Conflict) featured only unarmed repair 
                        stations, my imagination immediately filled with the image of the 
                        XQ platforms synonymous with the TIE Fighter and X-Wing 90s game
                        series<sup><a>1</a></sup>.
                    </p>

                </section>

                <section className="contentBlock">
                    <h3>The Problem</h3>
                    <p>
                    
                        After going through my first design iteration, I realized two 
                        important things:
                    </p>
                    <br/>
                    <br/>
                    <ul>
                        <li>The station required much more detail</li>
                        <li> The scale felt wrong</li>
                    </ul>
                    <br/>
                    <p>
                        I'll get into more detail on the station design/fabrication in a
                        separate write-up, but for now I'd like to focus on the second
                        point above. The size of the Ship and Squadron models in Armada is
                         based on a <i> relative </i> scale. That is to say, that a CR90 model 
                        is not at the same scale to its canonicle counterpart as a Victory 
                        Class Star Destroyer is. For proof of this, try fitting the CR90 into 
                        the VSD's docking bay. I'll wait.
                    </p>
                    <br/>
                    <p>
                        I understand why Fantasy Flight chose to use a relative scale in
                        Armada, but as there is not a linear relationship between model and
                        canon sizes, it takes a bit of thought to find the right size for
                        my XQ-2 Platform and have it <i>feel</i> correct during play.
                        Fortunately, a little bit of math can help us solve this particular
                        problem - and help consistently scale any future models I design!
                    
                    </p>
                </section>


                <section className="contentBlock">
                    <h3>Method</h3>
                    <p>
                        We should be able to come up with a functional representation
                        of the non-linear scale in Armada. To start, let's plot our available 
                        data<sup><a>2</a></sup>.
                    </p>
                </section>

                <section className="graph">
                    <Scatter data={SHIP_SCALE_DATA} options={SHIP_SCALE_OPTIONS} />
                </section>

                <section className="contentBlock">
                    <MathJax.Provider>
                        <p>
                            This graph shows most of the ships currently in Armada<sup><a>2</a></sup>,
                            and compares their canon length to the measured length of their models.
                            From this graph we can note a few observations.
                        </p>
                        <br/>
                        <br/>
                        <ol>
                            <li>We can see that there may be a relationship</li>
                            <li>We can see that the relationship may be non-linear, as expected</li>
                        </ol>
                        <br/>
                        <p>
                            To define a <i>best fit</i> relationship, we should choose a base case to
                            work with. By observation, I initially guessed that the relationship was 
                            either a power, or logorithmic function. By trying both, we can see which
                            better fits the data.
                        </p>
                        <br/>
                        <p>
                            A logarithmic representation will have the general form:

                            <MathJax.Node formula={"y = a \\ln(x) + b"} />

                            I used linear regression<sup><a>3</a></sup> to find the a and b values that 
                            gave the <i>closest fit</i>, and wound up with the function:

                            <MathJax.Node formula={"y = 3.84 \\ln(x) - 78.25"} />

                            A power function has the form:

                            <MathJax.Node formula={"y = ax^{b}"} />
                            
                            Finding the a and b values directly this time will be tough, but if we modify
                            this function slightly, we can get close. We take the log of both sides, and
                            the modified function looks like this:

                            <MathJax.Node formula={"\\log_{10}(y) = \\log_{10}(a) + b \\log_{10}(x)"} />

                            This looks messy at first, but it's actually linear with respect to 
                            <MathJax.Node inline formula={"\\log_{10}"} />! Our linear-regression strategy 
                            is back on the table. Using it we find that:

                            <MathJax.Node formula={"b = 0.553"} />
                            <MathJax.Node formula={"\\log_{10}(a) = 0.534"} />
                            <MathJax.Node formula={"a = 10^{\\log_{10}(a)} = 10^{0.534}"} />
                            <MathJax.Node formula={"a = 3.42"} />

                            So our power function has a final form of:

                            <MathJax.Node formula={"y = 3.42x^{0.553}"} />

                            Now lets plot both functions against the data, and see how they stack 
                            up.
                        </p>
                    </MathJax.Provider>
                </section>

                <section className="graph">
                    <Scatter 
                        data={SHIP_SCALE_DATA_POW_LOG_OVERLAY} 
                        options={APPROX_SCALE_OPTIONS} 
                        />
                </section>

                <section className="contentBlock">
                    <MathJax.Provider>
                        <p>
                            Visual inspection shows us that the power approximation aligns very well
                            with the data. To cement that conclusion, I found the root-mean-square 
                            error of both functions for the data.
                            
                            <MathJax.Node formula={"\\mathrm{RMSE}_{log} \\approx 24.8"} />
                            <MathJax.Node formula={"\\mathrm{RMSE}_{power} \\approx 6.64"} />

                            The power representation has nearly 4x less error than the logarithmic
                            function! As such, we'll use the power function to represent the scale.

                            <MathJax.Node formula={"y = 3.42x^{0.553}"} />
                        </p>
                    </MathJax.Provider>
                </section>


                <section className="contentBlock">
                    <h3>Findings</h3>
                    <p>
                        With this function in hand, we can now confidently determine a reasonable 
                        size for ANY Star Wars ship given its size in canon. 

                        For my XQ2 station, the canon length is 884m<sup></sup>. By plugging it into
                        the formula, we find that the appropriate model length for the station is
                        146mm.

                        I've added a few ships I'd be interested in designing to the graph below - 
                        let me know if you think of any others and I'll add them too!
                    </p>
                </section>

                <section className="graph">
                    <Scatter data={SHIP_SCALE_DATA_WITH_NEW_ASSETS} options={SHIP_SCALE_OPTIONS} />
                </section>

                <section className="contentBlock">
                    <hr />
                    <ul>
                        <li><a href="http://starwars.wikia.com/wiki/XQ_Platform_series"><sup>1</sup>XQ Station Details</a></li>
                        <li><a href="https://community.fantasyflightgames.com/topic/250961-armada-sliding-scale-graph/"><sup>2</sup> Data sourced from	Rune Taq on FF Forum</a></li>
                        <li><a href="https://machinelearningmastery.com/implement-simple-linear-regression-scratch-python/"><sup>3</sup>Thanks to Jason Brownlee for this refresher on linear regression</a></li>
                    </ul>
                </section>
            </div>
        );
    }
}

export default ArmadaScaleAnalysis;

ArmadaScaleAnalysis.propTypes = {

}; 