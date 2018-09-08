import React from "react";
import { Switch, Route, withRouter } from "react-router-dom";
import { Home, About, Projects, Armada, NotFound } from "./views";
import { Header } from "./components";

class Routing extends React.Component {
    render() {
        return(
            <div id="beep_boop">
                <Header />

                <Switch>
                    <Route exact path="/" render={() => <Home />} />
                    <Route exact path="/about" render={() => <About />} />
                    <Route exact path="/projects" render={() => <Projects />} />
                    <Route exact path="/armada" render={() => <Armada />} />
                    <Route path="/*" render={() => <NotFound />} />
                </Switch>
            </div>

        );
    }
}

export default withRouter(Routing);