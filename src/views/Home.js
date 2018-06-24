import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import "./home.css";
import { actionSaveName, actionClearName, actionClickStart } from "../actions";

class Home extends React.Component {
    constructor() {
        super();

        this.state = {
            nameValue: ""
        };
    }

    enterSite() {
        const { actionClickStart } = this.props;
        actionClickStart();
    }

    onNameEntry(e) {
        e && e.preventDefault();
        this.setState({ nameValue: e.target.value });
    }

    onNameSubmit(e) {
        e && e.preventDefault();
        const { nameValue } = this.state;
        const { actionSaveName } = this.props;
        actionSaveName(nameValue);
    }

    renderEnterSite() {
        const { clickedStart, name } = this.props;
        var circleClass = "";

        if (clickedStart && !name) {
            circleClass = "implode";
        }
        else if (clickedStart && name) {
            circleClass = "nameEntered";
        }

        return (
            <div className="row enterSite" >
                <div className="circle" />
                <div className={`circle ${circleClass}`} onClick={this.enterSite.bind(this)} />
                <div className={`patientRipple ${circleClass}`} />
            </div>
        );
    }

    renderNameEntry() {
        const { nameValue } = this.state;
        const { name, clickedStart } = this.props;

        if (clickedStart) {
            return (
                <div className="nameEntry">
                    <div className="line" />
                    <div className="line" />
                    <input type="text" className={name ? "complete" : ""} onChange={this.onNameEntry.bind(this)} />
                    <button
                        className={`${nameValue ? "ready" : ""} ${name ? "nameEntered" : ""}`}
                        disabled={nameValue ? false : "disabled"}
                        onClick={this.onNameSubmit.bind(this)}
                    />
                    {
                    // <div className={`circle ${name ? "" : "hide"}`}>
                    //     <div />
                    //     <div />
                    //     <div />
                    //     <div />
                    //     <div />
                    //     <div />
                    //     <div />
                    //     <div />
                    // </div>
                    }
                </div>
            );
        }
        else {
            return (<span />);
        }
    }

    renderContent() {
        const { clickedStart, name } = this.props;

        return (
            <div className={`row content ${clickedStart && name ? "show" : ""}`}>
                <div className="col-xs-12 text-center">
                    <div />
                </div>
            </div>
        );
    }

    render() {
        return (
            <div className="container-fluid home">
                {this.renderEnterSite()}
                {this.renderNameEntry()}
                {this.renderContent()}
            </div>
        );
    }
}

const mapStateToProps = ({ session }) => {

    return ({
        name: session.name,
        clickedStart: session.clickedStart
    });
};

export default connect(mapStateToProps, {
    actionSaveName,
    actionClearName,
    actionClickStart
})(Home);

Home.propTypes = {
    name: PropTypes.string,
    clickedStart: PropTypes.bool.isRequired,
    actionSaveName: PropTypes.func.isRequired,
    actionClearName: PropTypes.func.isRequired,
    actionClickStart: PropTypes.func.isRequired
};