import moment from "moment";

export const aboutConfig = {
    personalInfo: "Just a guy who is intent on getting to space, and wants to put in the work to make it happen",
    professionalInfo: {
        title: "Professional Experience",
        proExperience: [
            {
                startDate: moment("January 2017", "MMMM YYYY"),
                endDate: "Present",
                role: "CO-FOUNDER & FRONTEND-SOFTWARE DEV",
                org: "Second Closet",
                description: "Developed and launched front-end point-of-sale web app (ReactJS + Redux + OAuth), with an average of 20 active sessions at any time, and stress tested to 100+ concurrent sessions during busy season. Integrated with AWS S3 for client file management. Created and launched in-house application for managing appointments, inventory, and our warehouse facilities. Optimized both applications for mobile & web. Drove development strategy with executives, resulting in clear timelines and milestones. Utilized Agile Scrum, JIRA, and GitHub to maximize team productivity. Developed strategies for automated integration and unit testing. Responsible for reliable software releases and documentation."

            },
            {
                startDate: moment("March 2014", "MMMM YYYY"),
                endDate: moment("December 2016", "MMMM YYYY"),
                role: "PROJECT LEAD & SOFTWARE DEV",
                org: "Voyager",
                description: "Lead a team of 22 software developers, researchers, and advisors in development of a space mission-planning software suit. Developed project plans outlining industry requirements, milestones, and deliverables for the software. Built features for patched conic approximation & CRTBP – including a real-time interactive UI (C# on Unity3D Engine), and features for UX flow. Piloted software with MIT AeroAstro department in 2016 & 2017, among other international schools."

            },
            {
                startDate: moment("July 2014", "MMMM YYYY"),
                endDate: moment("October 2014", "MMMM YYYY"),
                role: "CO-FOUNDER",
                org: "SENSASSURE",
                description: "Designed and fabricated several iterations of Sensassure’s new product, including custom sensors and PCBs (Eagle PCB). Iteratively improved the product through analog and pilot testing – optimizing the design for manufacturing. Managed relations with 60+ manufacturers and suppliers to cost out the product for pilot and mass production volumes. Secured and trained staff for the manufacturing of 350 sensors in preparation of pilot rollout."
            },
            {
                startDate: moment("May 2013", "MMMM YYYY"),
                endDate: moment("December 2013", "MMMM YYYY"),
                role: "Summer Intern, Corporate Real Estate",
                org: "Royal Bank of Canada",
                description: "Designed and coded new functionality into the Microsoft SharePoint platform (JavaScript, HTML). Constructed and documented a detailed Vendor Management System, a Resource Management Tool, and a web-initiated email system that dynamically prepared emails with relevant content."
            },
            {
                startDate: moment("May 2012", "MMMM YYYY"),
                endDate: moment("August 2012", "MMMM YYYY"),
                role: "Research Intern",
                org: "FH Joanneum University of Applied Sciences",
                description: "Developed a Structured English analyzer using SharePoint based workflows. Created a prototypical use case, in which a Service Level Agreement was generated, English language user input analyzed, and modifications to the approval process were made automatically."
            },
            {
                startDate: moment("April 2011", "MMMM YYYY"),
                endDate: moment("November 2011", "MMMM YYYY"),
                role: "Administrative Assistant, Critical Environments",
                org: "Royal Bank of Canada",
                description: "Developed, deployed and managed a Microsoft SharePoint site to categorize and store documentation for over 50 projects worldwide. Conferred with project management, technical specialists, and end-users in order to integrate the design of the SharePoint site within the framework of the company."
            }
        ]
    },
    educationInfo: [
        {
            degree: "B.A.Sc ELECTRICAL ENGINEERING",
            school: "UNIVERSITY OF TORONTO",
            startDate: moment("September 2009", "MMMM YYYY"),
            endDate: moment("April 2014", "MMMM YYYY"),
            keyAreas: "RF Antenna Analysis: Transmission Power, VSWR, Gain Measurement. Microwave Circuit Design & Analysis. Vector Network Analyzer. Leveraged Linux (Redhat & Ubuntu) platforms in software assignments.",
            gpa: 2.66,
            finalYearGpa: 3.04,
            awards: [
                {
                    name: "Vern Gomes Memorial Award",
                    description: "Determined by Electrical and Computer Engineering student-staff committee for most valuable contributions to the class of his/her graduating year."
                }
            ]
        }
    ],
    contactInfo: {
        email: {
            text: "zacharyfejes@gmail.com",
            link: "mailto:zacharyfejes@gmail.com"
        },
        phone: {
            text: "+1 647-907-6753",
            link: "tel:16479076753"
        }
    }
};