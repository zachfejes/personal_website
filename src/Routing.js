import React from "react";
import { Switch, Route, withRouter } from "react-router-dom";
import { Home, About, Projects, Armada, NotFound, NameEntry } from "./views";
import { Header, PrivateRoute } from "./components";

class Routing extends React.Component {
    render() {
        return(
            <div id="beep_boop">
                <Header />

                <Switch>
                    <PrivateRoute exact path="/" render={() => <Home />} />
                    <PrivateRoute exact path="/about" render={() => <About />} />
                    <PrivateRoute exact path="/projects" render={() => <Projects />} />
                    <Route exact path="/armada" render={() => <Armada />} />
                    <Route exact path="/identify" render={() => <NameEntry />} />
                    <Route path="/*" render={() => <NotFound />} />
                </Switch>
            </div>

        );
    }
}

export default withRouter(Routing);