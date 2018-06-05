import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import "./home.css";
import { actionSaveName, actionClearName } from "../actions";

class Home extends React.Component {
    constructor() {
        super();

        this.state = {
            stage: 0
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

    renderStageOne() {
        const { stage } = this.state;
        const { name } = this.props;

        if(stage === 1) {
            return(
                <div className="stage1">
                    <div className="line" />
                    <div className="line" />
                    <input type="text" onChange={this.onNameEntry.bind(this)} />
                    <button className={name ? "ready" : ""}/>
                </div>
            );
        }
        else {
            return(<span />);
        }
    }

    render() {
        const { stage } = this.state;

        return(
            <div className="container-fluid home">
                <div className="row welcomeMessage" >
                    <div className="circle"/>
                    <div className={`circle ${stage > 0 ? "implode" : ""}`} onClick={() => {this.setStage(1);}} />
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