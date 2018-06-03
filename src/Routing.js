import React from "react";
import { Switch, Route } from "react-router-dom";
import { Home, About, Projects, NotFound } from "./views";

class Routing extends React.Component {
    render() {
        return(
            <div id="beep_boop">
                <Switch>
                    <Route exact path="/" render={() => <Home />} />
                    <Route exact path="/about" render={() => <About />} />
                    <Route exact path="/projects" render={() => <Projects />} />
                    <Route path="/*" render={() => <NotFound />} />
                </Switch>
            </div>

        );
    }
}



export default Routing;