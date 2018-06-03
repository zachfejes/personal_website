import React from "react";
import { Provider } from "react-redux";
import { Router } from "react-router-dom";
import { hydrate, render } from "react-dom";
import Routing from "./Routing";
import createBrowserHistory from "history/createBrowserHistory";
import registerServiceWorker from "./registerServiceWorker";
import { createStore, applyMiddleware } from "redux";
import ReduxPromise from "redux-promise";
import ReduxThunk from "redux-thunk";
import reducers from "./reducers";
import "./css/index.css";
import "./css/bootstrap.min.css";

const createStoreWithMiddleware = applyMiddleware(ReduxThunk, ReduxPromise)(createStore);
const reduxStore = createStoreWithMiddleware(reducers);

const history = createBrowserHistory();

const rootElement = document.getElementById("root");
const App = (
    <Provider store={reduxStore}>
        <Router history={history}>
            <Routing />
        </Router>
    </Provider>
);

if(rootElement.hasChildNodes()) {
    hydrate(App, rootElement);
}
else {
    render(App, rootElement);
}

window.snapSaveState = () => {
    document.querySelector("#root").setAttribute("data-server-rendered", "true");
};

registerServiceWorker();
