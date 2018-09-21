import React from "react";
import { connect } from "react-redux";
import { withRouter, Link } from "react-router-dom";
import PropTypes from "prop-types";
import { navLinks } from "../config";
import "./header.css";

class Header extends React.Component {

    renderHomeButton() {
        const { homeButton } = navLinks;
        
        return(
            <td>
                <Link to={homeButton.path}>{homeButton.displayName.toUpperCase()}</Link>
            </td>
        );
    }

    renderNavLinks() {
        const { header } = navLinks;

        return (
            header.map((link, index) =>
                <td key={index}>
                    <Link to={link.path}>{link.displayName.toUpperCase()}</Link>
                </td>
            )
        );
    }

    render() {
        const { name } = this.props;

        return (
            <div className={`header ${!name ? "hidden" : ""}`}>
                <table>
                    <tbody>
                        <tr>
                            {this.renderHomeButton()}
                            <td />
                            {this.renderNavLinks()}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

const mapStateToProps = ({ session }) => ({
    name: session.name
});

export default withRouter(connect(mapStateToProps)(Header));

Header.propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    name: PropTypes.string
};