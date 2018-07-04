import React from "react";
import moment from "moment";
import { aboutConfig } from "../config";
import "./about.css";

class About extends React.Component {

    renderPersonalInfo() {
        const { personalInfo } = aboutConfig;
        return(
            <div className="personalInfo">
                <p>{personalInfo}</p>
            </div>
        );
    }

    renderProfessionalInfo() {
        const { title, proExperience } = aboutConfig.professionalInfo;

        const experience = proExperience.map((job, index) => {
            const timelineText = typeof job.endDate === "string" ?
                `${moment(job.startDate).format("MMMM, YYYY")} - ${job.endDate}` :
                `${moment(job.startDate).format("MMMM, YYYY")} - ${moment(job.endDate).format("MMMM, YYYY")}`;
            return(
            <div key={index}>
                <h5 className="text-uppercase">{`${job.role} - ${job.org}`}</h5>
                <p><small>{timelineText}</small></p>
                <p>{job.description}</p>
            </div>
            );
        });

        return(
            <div className="professionalInfo text-center">
                <h2>{title}</h2>
                {experience}
            </div>
        )
    }

    renderEducationInfo() {
        const { educationInfo } = aboutConfig;
        return(
            <div className="educationInfo">
                <p>{educationInfo}</p>
            </div>
        );
    }

    renderContactInfo() {
        const { contactInfo } = aboutConfig;
        return(
            <div className="contactInfo">
                <p>{contactInfo}</p>
            </div>
        );
    }

    render() {
        return(
            <div className="container-fluid about">
                <div className="row">
                    <div className="col-xs-12 text-center">
                    
                        {this.renderProfessionalInfo()}

                    </div>
                </div>
            </div>
        );
    }
}

export default About;