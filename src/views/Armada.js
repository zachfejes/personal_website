import React from "react";
//import PropTypes from "prop-types";


import { ArmadaScaleAnalysis } from "./Armada/index";

import "./armada.css";

class Armada extends React.Component {
    render() {
        return(
            <div className="armada">
                <ArmadaScaleAnalysis />
            </div>
        );
    }
}

export default Armada;

Armada.propTypes = {

};