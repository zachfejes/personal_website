const UNACCEPTABLE_DATA_ERROR = new Error("The data parameter must be an array");
const DATA_CONTAINS_NAN_ERROR = new Error("The data array provided contains non-number values. All values in this array must be numbers");

function dataValidation(data) {
    if(!data || !Array.isArray(data)) {
        throw UNACCEPTABLE_DATA_ERROR;
    }
    else if(data.some(x => isNaN(x))) {
        throw DATA_CONTAINS_NAN_ERROR;
    }
}

export function mean(data) {
    dataValidation(data);
    return data.reduce((sum, x) => sum + x, 0)/data.length;  
}

export function variance(data, mean) {
    dataValidation(data);
    return data.reduce((sum, x) => sum + Math.pow((x - mean), 2), 0);
}

export function covariance(dataX, meanX, dataY, meanY) {
    dataValidation(dataX);
    dataValidation(dataY);
    return dataX.reduce((sum, x, i) => sum + (x - meanX)*(dataY[i] - meanY), 0);
}

export function linearCoefficients(dataset) {
    let x = dataset.map(x => x[0]);
    let y = dataset.map(x => x[1]);
    let meanX = mean(x);
    let meanY = mean(y);
    let m = covariance(x, meanX, y, meanY) / variance(x, meanX);
    let b = meanY - m*meanX;
    return [b, m];
}

export function linearRegression(train, estimateValues) {
    let [b, m] = linearCoefficients(train);
    return estimateValues.map(x => m*x + b);
}

export function rmseMetric(actual, predicted) {
    let totalError = actual.reduce((sum, y, i) => 
        sum + Math.pow((predicted[i] - actual[i]), 2), 0);
    let meanError = totalError/actual.length;
    return Math.sqrt(meanError);
}

export function evaluateAlgorithm(dataset, algorithm) {
    let x = dataset.map(x => x[0]);
    let y = dataset.map(y => y[1]);

    let predicted = algorithm(dataset, x);
    let rmse = rmseMetric(y, predicted);
    return rmse;
}