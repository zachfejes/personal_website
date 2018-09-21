import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import "./home.css";

class Home extends React.Component {
    renderContent() {
        return (
            <div/>
        );
    }

    render() {
        return (
            <div className="container-fluid home">
                {this.renderContent()}
            </div>
        );
    }
}

const mapStateToProps = ({ session }) => {
    return ({
        name: session.name,
    });
};

export default connect(mapStateToProps, {})(Home);

Home.propTypes = {
    name: PropTypes.string
};