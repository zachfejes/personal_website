import { SAVE_NAME, CLEAR_NAME, SET_LANGUAGE } from "./actionTypes";

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

export { actionSaveName, actionClearName, actionSetLanguage };