import React from "react";
import "./notFound.css";
import "./dotMatrix.css";

class NotFound extends React.Component {
    render() {
        return(
            <div className="container-fluid notFound">
                <div className="row">
                    <div className="col-xs-12 text-center">
                        <h1>404 Page Not Found</h1>

                        <div className="dotMatrixScene">
                            <div className="dotPlane">
                                <div className="planeRing" />
                                <div className="planeRing" />
                                <div className="planeRing" />
                            </div>

                            <div className="dotMatrix">
                                <div className="dotRing">
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                </div>
                                <div className="dotRing">
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                </div>
                                <div className="dotRing">
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                </div>
                                <div className="dotRing">
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                </div>
                                <div className="dotRing">
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                    <div className="dot"/>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }
}

export default NotFound;