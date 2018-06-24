import { SAVE_NAME, CLEAR_NAME, SET_LANGUAGE, CLICK_START } from "./actionTypes";

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

function actionClickStart() {
    return({
        type: CLICK_START,
        payload: true
    });
}

export { actionSaveName, actionClearName, actionSetLanguage, actionClickStart };