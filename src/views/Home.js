import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import "./home.css";
import { actionSaveName, actionClearName } from "../actions";

class Home extends React.Component {
    constructor() {
        super();

        this.state = {
            stage: 0,
            nameEntered: false
        };
    }

    setStage(stage) {
        this.setState({ stage });
    }

    onNameEntry(e) {
        e && e.preventDefault();
        const { actionSaveName, actionClearName } = this.props;

        if(e.target.value) {
            actionSaveName(e.target.value);
        }
        else {
            actionClearName();
        }
    }

    onNameSubmit(e) {
        e && e.preventDefault();
        this.setState({ nameEntered: true });
    }

    renderStageOne() {
        const { stage, nameEntered } = this.state;
        const { name } = this.props;

        if(stage === 1) {
            return(
                <div className="stage1">
                    <div className="line" />
                    <div className="line" />
                    <input type="text" className={nameEntered ? "complete" : ""} onChange={this.onNameEntry.bind(this)} />
                    <button className={`${name ? "ready" : ""} ${nameEntered ? "nameEntered" : ""}`} onClick={this.onNameSubmit.bind(this)} />
                    <div className="circle" />
                </div>
            );
        }
        else {
            return(<span />);
        }
    }

    render() {
        const { stage, nameEntered } = this.state;
        var circleClass = "";

        if(stage === 1 && !nameEntered) {
            circleClass = "implode";
        }
        else if (stage === 1 && nameEntered) {
            circleClass = "nameEntered";
        }

        return(
            <div className="container-fluid home">
                <div className="row welcomeMessage" >
                    <div className="circle"/>
                    <div className={`circle ${circleClass}`} onClick={() => {this.setStage(1);}} />
                </div>

                {this.renderStageOne()}
            </div>
        );
    }
}

const mapStateToProps = ({ session }) => ({
    name: session.name
});

export default connect(mapStateToProps, {
    actionSaveName,
    actionClearName
})(Home);

Home.propTypes = {
    name: PropTypes.string,
    actionSaveName: PropTypes.func.isRequired,
    actionClearName: PropTypes.func.isRequired
};