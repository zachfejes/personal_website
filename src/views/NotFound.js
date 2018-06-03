import React from "react";
import "./notFound.css";

class NotFound extends React.Component {
    render() {
        return(
            <div className="container-fluid notFound">
                <div className="row">
                    <div className="col-xs-12 text-center">
                        <h1>404 Page Not Found</h1>
                    </div>
                </div>
            </div>
        );
    }
}

export default NotFound;