import { 
    SAVE_NAME, 
    CLEAR_NAME, 
    SET_LANGUAGE,
    SET_INTENDED_PATH 
} from "../actions";

const sessionDefault = {
    name: "",
    language: "",
    intendedPath: ""
};

export default function reducerSession(state = sessionDefault, {type, payload}) {
    if(!payload) {
        return state;
    }

    switch(type) {
        case SAVE_NAME:
            return ({
                ...state,
                name: payload
            });
        case CLEAR_NAME:
            return ({
                ...state,
                name: ""
            });
        case SET_LANGUAGE:
            return ({
                ...state,
                language: payload
            });
        case SET_INTENDED_PATH:
            return ({
                ...state,
                intendedPath: payload
            });
        default:
            return state;
    }
}