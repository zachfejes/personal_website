import { SAVE_NAME, CLEAR_NAME, SET_LANGUAGE, SET_INTENDED_PATH } from "./actionTypes";

function actionSaveName(name) {
    return({
        type: SAVE_NAME,
        payload: name
    });
}

function actionClearName() {
    return({
        type: CLEAR_NAME,
        payload: true
    });
}

function actionSetLanguage(language) {
    return({
        type: SET_LANGUAGE,
        payload: language
    });
}

function actionSetIntendedPath(path) {
    return({ type: SET_INTENDED_PATH, payload: path });
}

export { 
    actionSaveName, 
    actionClearName, 
    actionSetLanguage,
    actionSetIntendedPath
};