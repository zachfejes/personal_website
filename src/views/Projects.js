import React from "react";
import "./projects.css";

class Projects extends React.Component {
    render() {
        return(
            <div className="container-fluid projects">
            <div className="row">
                <div className="col-xs-12 text-center">
                    <h1>Projects</h1>

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
                </div>
            </div>
        </div>
        );
    }
}

export default Projects;