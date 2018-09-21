import React from "react";
import { Route, Redirect, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import Cookies from "universal-cookie";
import { actionSetIntendedPath, actionSaveName } from "../actions";

/**
 * @description Route HOC which verifies that either the `session.name` redux state is defined, or
 * the session cookie with that state exists before rendering the provided `render`; if not the
 * intended path is saved and the user is redirected to `/identify`
 * @param {string} name The `session.name` redux state
 * @param {object} location Path information provided by `withRouter`
 * @param {function} actionSetIntendedPath Sets the redux `session.intendedPath` state
 * @param {function} actionSaveName Sets the redux `session.name` state
 * @returns {JSX.Element}
 */
const PrivateRoute = ({ 
    render: Component, name, location, actionSetIntendedPath, actionSaveName, ...rest }) => {

    actionSetIntendedPath(location.pathname);
    const cookies = new Cookies();
    const sessionCookie = cookies.get("sessionCookie");

    if(sessionCookie && sessionCookie.name) {
        actionSaveName(sessionCookie.name);
        return <Route {...rest} render={(props) => <Component {...props} />} />;
    }

    return (
        <Route {...rest} render={(props) =>
            name ? 
                <Component {...props} /> : <Redirect to="/identify" />
        } />
    );
};

const mapStateToProps = ({ session }) => ({ 
    name: session.name
});

export default withRouter(connect(mapStateToProps, {
    actionSetIntendedPath,
    actionSaveName
})(PrivateRoute));

PrivateRoute.propTypes = {
    render: PropTypes.func.isRequired,
    name: PropTypes.string,
    actionSetIntendedPath: PropTypes.func.isRequired,
    actionSaveName: PropTypes.func.isRequired,
    location: PropTypes.object.isRequired,
};