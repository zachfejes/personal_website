import React from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import PropTypes from "prop-types";
import Cookies from "universal-cookie";
import "./nameEntry.css";
import { actionSaveName, actionClearName } from "../actions";

class NameEntry extends React.Component {
    constructor() {
        super();

        this.state = {
            value: "",
            entered: false
        };
    }

    componentDidUpdate(prevProps) {
        const { name, history, intendedPath } = this.props;

        if(name && name !== prevProps.name) {
            history.push(intendedPath || "/");
        }
    }

    onNameEntry(e) {
        e && e.preventDefault();
        this.setState({ value: e.target.value });
    }

    onNameSubmit(e) {
        e && e.preventDefault();
        const { value } = this.state;
        const { actionSaveName } = this.props;
        const cookies = new Cookies();
        setTimeout(() => {
            cookies.set("sessionCookie", { name: value }, { path: "/" });
            actionSaveName(value);
        }, 1000);
    }

    onClick(e) {
        e && e.preventDefault();
        this.setState({ entered: true });
    }

    render() {
        const { value, entered } = this.state; 

        return (
            <div className="container-fluid nameEntry">
                <button 
                    className={`enter ${entered ? "" : "show"}`} 
                    onClick={this.onClick.bind(this)}
                    disabled={entered ? "disabled" : false}
                />
                <div className={`ripple ${entered ? "" : "show"}`} />
                <div className={`patientRipple ${entered ? "" : "show"}`} />
                {
                    entered ? 
                        <form onSubmit={this.onNameSubmit.bind(this)}>
                            <p>Enter Your Name</p>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={value} 
                                onChange={this.onNameEntry.bind(this)} 
                            />
                            <button 
                                type="submit" 
                                className={value ? "enabled" : ""} 
                                disabled={value ? false : "disabled"}
                            />
                            <div className="inputGuide" />
                        </form> : <span />
                }
            </div>
        );
    }
}

const mapStateToProps = ({ session }) => ({
    intendedPath: session.intendedPath,
    name: session.name
});

export default withRouter(connect(mapStateToProps, {
    actionSaveName,
    actionClearName
})(NameEntry));

NameEntry.propTypes = {
    actionSaveName: PropTypes.func.isRequired,
    actionClearName: PropTypes.func.isRequired,
    name: PropTypes.string,
    intendedPath: PropTypes.string,
    history: PropTypes.object.isRequired,
};