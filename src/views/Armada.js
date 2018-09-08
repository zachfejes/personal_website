import React from "react";
//import PropTypes from "prop-types";
import { Scatter } from "react-chartjs-2";

import { SHIP_SCALE_DATA, SHIP_SCALE_OPTIONS } from "../config";
import "./armada.css";

class Armada extends React.Component {
    render() {
        return(
            <div className="armada">
                <section className="titles">
                    <h1>Armada Scaling</h1>
                    <br/>
                    <p>Analyzing the Non-Linear Scale for Use in Modeling</p>
                </section>

                <section className="graph">
                    <Scatter data={SHIP_SCALE_DATA} options={SHIP_SCALE_OPTIONS} />
                </section>

                <div className="contentBlock">
                    <p>
                        This is a lot of stuff to consider! I wonder how I can use this information 
                        to better inform my decision-making process when it comes to scaling my 
                        models to be fitting for the game.
                    </p>
                </div>
            </div>
        );
    }
}

export default Armada;

Armada.propTypes = {

};