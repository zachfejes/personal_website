import { SAVE_NAME, CLEAR_NAME, SET_LANGUAGE } from "../actions";

const sessionDefault = {
    name: "",
    language: ""
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
        default:
            return state;
    }
}