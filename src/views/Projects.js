import React from "react";
import "./projects.css";

const icoFace = (i) => (
    <div className={`ico__face ico__face--${i}`}>
        <div /><div /><div />
        {i}
    </div>
);

const sphereSlice = (i) => (
    <div className={`circle circle--${i}`} />
);

class Projects extends React.Component {
    render() {
        var slices = [];

        for(var i = 0; i < 21; i++) {
            slices.push(sphereSlice(i));
        }

        return(
            <div className="container-fluid projects">
            <div className="row">
                <div className="col-xs-12 text-center">
                    <h1>Projects</h1>

                    <div className="scene">

                        <div className="sphere">
                            {slices}
                        </div>

                    </div>
                    {/*
                        <div className="cluster">
                        <div className="pyramid">
                            <div className="pyramid__face pyramid__face--front">
                                <div /><div /><div />
                                front
                            </div>
                            <div className="pyramid__face pyramid__face--left">
                                <div /><div /><div />
                                left
                            </div>
                            <div className="pyramid__face pyramid__face--right">
                                <div /><div /><div />
                                right
                            </div>
                            <div className="pyramid__face pyramid__face--top">
                                <div /><div /><div />
                                top
                            </div>
                        </div>
                        <div className="pyramid">
                            <div className="pyramid__face pyramid__face--front">
                                <div /><div /><div />
                                front
                            </div>
                            <div className="pyramid__face pyramid__face--left">
                                <div /><div /><div />
                                left
                            </div>
                            <div className="pyramid__face pyramid__face--right">
                                <div /><div /><div />
                                right
                            </div>
                            <div className="pyramid__face pyramid__face--top">
                                <div /><div /><div />
                                top
                            </div>
                        </div>
                        <div className="pyramid">
                            <div className="pyramid__face pyramid__face--front">
                                <div /><div /><div />
                                front
                            </div>
                            <div className="pyramid__face pyramid__face--left">
                                <div /><div /><div />
                                left
                            </div>
                            <div className="pyramid__face pyramid__face--right">
                                <div /><div /><div />
                                right
                            </div>
                            <div className="pyramid__face pyramid__face--top">
                                <div /><div /><div />
                                top
                            </div>
                        </div>
                        <div className="pyramid">
                            <div className="pyramid__face pyramid__face--front">
                                <div /><div /><div />
                                front
                            </div>
                            <div className="pyramid__face pyramid__face--left">
                                <div /><div /><div />
                                left
                            </div>
                            <div className="pyramid__face pyramid__face--right">
                                <div /><div /><div />
                                right
                            </div>
                            <div className="pyramid__face pyramid__face--top">
                                <div /><div /><div />
                                top
                            </div>
                            </div>
                            <div className="pyramid">
                            <div className="pyramid__face pyramid__face--front">
                                <div /><div /><div />
                                front
                            </div>
                            <div className="pyramid__face pyramid__face--left">
                                <div /><div /><div />
                                left
                            </div>
                            <div className="pyramid__face pyramid__face--right">
                                <div /><div /><div />
                                right
                            </div>
                            <div className="pyramid__face pyramid__face--top">
                                <div /><div /><div />
                                top
                            </div>
                            </div>
                        </div>
                    </div>
        */}
                    {/*
                    <div className="scene">
                        <div className="cube">
                            <div className="cube__face cube__face--front">front</div>
                            <div className="cube__face cube__face--back">back</div>
                            <div className="cube__face cube__face--right">right</div>
                            <div className="cube__face cube__face--left">left</div>
                            <div className="cube__face cube__face--top">top</div>
                            <div className="cube__face cube__face--bottom">bottom</div>
                        </div>
                    </div>
        */}

                    {/*}
                    <div className="icosphere">
                        <div className="triangle">
                            <div />
                            <div />
                            <div />
                        </div>
                        <div className="triangle">
                            <div />
                            <div />
                            <div />
                        </div>
                    </div>
                    */}
                </div>
            </div>
        </div>
        );
    }
}

export default Projects;