import { combineReducers } from "redux";
import reducerSession from "./reducerSession";

export default combineReducers({
    session: reducerSession
});