import moment from "moment";

export const aboutConfig = {
    personalInfo: "Just a guy who wants to go to space, and is willing to put in the work to get there.",
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
        ]
    },
    educationInfo: "I went to school for a long while. It was crazy hard, I went on probation once, and I worked through it. It was fun.",
    contactInfo: "Beep boop."
};