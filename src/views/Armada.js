import React from "react";
//import PropTypes from "prop-types";
import { Scatter } from "react-chartjs-2";

import { SHIP_SCALE_DATA, SHIP_SCALE_UNITS } from "../config";
import "./armada.css";

class Armada extends React.Component {
    render() {

        const options = {
            legend: {
                display: false
            },
            tooltips: {
                callbacks: {
                    label: (tooltipItem) => {
                        return SHIP_SCALE_DATA.labels[tooltipItem.index] || "";
                    }
                }
            },
            scales: {
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Canonical Length [m]"
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            return value;
                        }
                    }
                }],
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Model Length [mm]"
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            return value;
                        }
                    }
                }]
            }
        };

        return(
            <div className="armada">
                <div className="text-center">
                    <h1>Armada Scale</h1>
                    <br/>
                    <p>Analyzing the Non-Linear Scale for Use in Modeling</p>
                </div>

                <div className="graph">
                    <Scatter data={SHIP_SCALE_DATA} options={options} />
                </div>
            </div>
        );
    }
}

export default Armada;

Armada.propTypes = {

};